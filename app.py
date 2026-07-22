"""
ContiGO - Plataforma de tramites
=================================
Servidor unico. Dos vistas: /usuario y /experto

Novedades v3:
  - Billetera: el usuario deposita saldo y lo usa en cualquier tramite
  - Bandeja de tramites SIN ASIGNAR (tipo Uber): cualquier experto los toma
  - Sistema de FASES con escrow: cotizacion -> acuerdo -> anticipo ->
    en curso -> entrega -> liberacion, con proteccion anti-fraude

Correr:  python app.py
"""

import sqlite3, os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "contigo-2025-cambiar-en-produccion"

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "contigo.db")
UPLOAD_DIR = os.path.join(BASE, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Experto por defecto para solicitudes dirigidas a alguien que no existe aun.
# Las solicitudes SIN profesional especifico van a la bandeja comun (sin asignar).
EXPERTO_GUARDIA = "admin"

ALLOWED_EXT = {"pdf", "png", "jpg", "jpeg", "doc", "docx", "webp", "heic"}
MAX_FILE_MB = 10

# Fases del tramite (para el rastreador visible)
FASES = ["cotizacion", "acuerdo", "anticipo", "en_curso", "entregado", "completado"]


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def now():
    return datetime.now().isoformat()


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL, correo TEXT,
            username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'usuario',
            profesion TEXT, saldo REAL DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS solicitudes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER, nombre TEXT NOT NULL, correo TEXT,
            profesional_solicitado TEXT,
            tipo TEXT NOT NULL, descripcion TEXT NOT NULL,
            urgencia TEXT DEFAULT 'normal',
            estado TEXT NOT NULL DEFAULT 'nueva',
            experto_username TEXT, created_at TEXT NOT NULL,
            asignada INTEGER DEFAULT 1,
            fase TEXT DEFAULT 'cotizacion',
            precio REAL, anticipo REAL,
            pagado_anticipo REAL DEFAULT 0, pagado_saldo REAL DEFAULT 0,
            entrega_nota TEXT, entrega_archivo TEXT
        );
        CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitud_id INTEGER NOT NULL,
            autor TEXT NOT NULL, autor_nombre TEXT,
            texto TEXT, tipo TEXT DEFAULT 'texto',
            archivo_nombre TEXT, archivo_path TEXT,
            leido INTEGER DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitud_id INTEGER NOT NULL,
            nombre TEXT NOT NULL, entregado INTEGER DEFAULT 0, created_at TEXT NOT NULL,
            estado TEXT DEFAULT 'pendiente',   -- pendiente | enviado | aprobado | rechazado
            archivo_nombre TEXT, archivo_path TEXT, motivo TEXT
        );
        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            tipo TEXT NOT NULL,        -- deposito | retencion | pago | ingreso | reembolso
            monto REAL NOT NULL,
            concepto TEXT, solicitud_id INTEGER, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT, event_name TEXT, event_label TEXT, page TEXT, ts TEXT
        );
    """)
    # Migraciones seguras para bases ya existentes (Railway)
    migraciones = [
        "ALTER TABLE usuarios ADD COLUMN saldo REAL DEFAULT 0",
        "ALTER TABLE solicitudes ADD COLUMN asignada INTEGER DEFAULT 1",
        "ALTER TABLE solicitudes ADD COLUMN fase TEXT DEFAULT 'cotizacion'",
        "ALTER TABLE solicitudes ADD COLUMN precio REAL",
        "ALTER TABLE solicitudes ADD COLUMN anticipo REAL",
        "ALTER TABLE solicitudes ADD COLUMN pagado_anticipo REAL DEFAULT 0",
        "ALTER TABLE solicitudes ADD COLUMN pagado_saldo REAL DEFAULT 0",
        "ALTER TABLE solicitudes ADD COLUMN entrega_nota TEXT",
        "ALTER TABLE solicitudes ADD COLUMN entrega_archivo TEXT",
        "ALTER TABLE documentos ADD COLUMN estado TEXT DEFAULT 'pendiente'",
        "ALTER TABLE documentos ADD COLUMN archivo_nombre TEXT",
        "ALTER TABLE documentos ADD COLUMN archivo_path TEXT",
        "ALTER TABLE documentos ADD COLUMN motivo TEXT",
    ]
    for ddl in migraciones:
        try:
            conn.execute(ddl)
        except sqlite3.OperationalError:
            pass

    for nombre, correo, username, pw, role, prof in [
        ("Usuario de Prueba", "user@contigo.ec", "user", "user", "usuario", None),
        ("Carlos Ramirez", "admin@contigo.ec", "admin", "admin", "experto", "Abogado / Gestor"),
    ]:
        conn.execute("""INSERT OR IGNORE INTO usuarios
            (nombre,correo,username,password_hash,role,profesion,created_at)
            VALUES (?,?,?,?,?,?,?)""",
            (nombre, correo, username, generate_password_hash(pw), role, prof, now()))
    conn.commit(); conn.close()


def saldo_de(conn, username):
    r = conn.execute("SELECT saldo FROM usuarios WHERE username=?", (username,)).fetchone()
    return r["saldo"] if r and r["saldo"] else 0.0


def mov(conn, username, tipo, monto, concepto, sid=None):
    conn.execute("""INSERT INTO movimientos (username,tipo,monto,concepto,solicitud_id,created_at)
        VALUES (?,?,?,?,?,?)""", (username, tipo, monto, concepto, sid, now()))


# ============================================================
# PAGINAS
# ============================================================
@app.route("/")
def landing(): return render_template("landing.html")

@app.route("/usuario")
def vista_usuario(): return render_template("usuario.html")

@app.route("/experto")
def vista_experto(): return render_template("experto.html")

@app.route("/metricas")
def metricas():
    conn = get_db()
    pv = conn.execute("SELECT COUNT(DISTINCT session_id) c FROM events WHERE event_name='pageview'").fetchone()["c"]
    rows = conn.execute("""SELECT event_name, COUNT(*) total, COUNT(DISTINCT session_id) ses
        FROM events WHERE event_name!='pageview' GROUP BY event_name ORDER BY ses DESC""").fetchall()
    stats = conn.execute("""SELECT
        (SELECT COUNT(*) FROM usuarios WHERE role='usuario') u,
        (SELECT COUNT(*) FROM solicitudes) s,
        (SELECT COUNT(*) FROM mensajes) m,
        (SELECT COUNT(*) FROM mensajes WHERE tipo='archivo') a""").fetchone()
    conn.close()
    return render_template("metricas.html", pv=pv,
        eventos=[{"n": r["event_name"], "t": r["total"], "s": r["ses"],
                  "p": round(r["ses"]/pv*100,1) if pv else 0} for r in rows],
        stats=dict(stats))


# ============================================================
# AUTENTICACION
# ============================================================
@app.route("/api/register", methods=["POST"])
def api_register():
    d = request.get_json(silent=True) or {}
    nombre   = d.get("nombre", "").strip()
    username = d.get("username", "").strip().lower()
    password = d.get("password", "")
    correo   = d.get("correo", "").strip()
    role     = d.get("role", "usuario")
    profesion = d.get("profesion")

    if not nombre:   return jsonify({"ok": False, "error": "Escribe tu nombre completo"}), 400
    if not username: return jsonify({"ok": False, "error": "Elige un nombre de usuario"}), 400
    if len(password) < 3:
        return jsonify({"ok": False, "error": "La contrasena debe tener al menos 3 caracteres"}), 400

    conn = get_db()
    if conn.execute("SELECT id FROM usuarios WHERE username=?", (username,)).fetchone():
        conn.close()
        return jsonify({"ok": False, "error": f"El usuario '{username}' ya existe. Prueba con otro."}), 409

    conn.execute("""INSERT INTO usuarios (nombre,correo,username,password_hash,role,profesion,created_at)
        VALUES (?,?,?,?,?,?,?)""",
        (nombre, correo, username, generate_password_hash(password), role, profesion, now()))
    conn.commit()
    u = conn.execute("SELECT id,nombre,correo,username,role,profesion,saldo FROM usuarios WHERE username=?",
                     (username,)).fetchone()
    conn.close()
    return jsonify({"ok": True, "user": dict(u)})


@app.route("/api/login", methods=["POST"])
def api_login():
    d = request.get_json(silent=True) or {}
    username = d.get("username", "").strip().lower()
    password = d.get("password", "")
    conn = get_db()
    u = conn.execute("SELECT * FROM usuarios WHERE username=?", (username,)).fetchone()
    conn.close()
    if not u or not check_password_hash(u["password_hash"], password):
        return jsonify({"ok": False, "error": "Usuario o contrasena incorrectos"}), 401
    return jsonify({"ok": True, "user": {
        "id": u["id"], "nombre": u["nombre"], "correo": u["correo"],
        "username": u["username"], "role": u["role"], "profesion": u["profesion"],
        "saldo": u["saldo"] or 0}})


# ============================================================
# BILLETERA
# ============================================================
@app.route("/api/billetera")
def api_billetera():
    username = request.args.get("username", "")
    conn = get_db()
    saldo = saldo_de(conn, username)
    movs = conn.execute("""SELECT tipo,monto,concepto,solicitud_id,created_at
        FROM movimientos WHERE username=? ORDER BY id DESC LIMIT 50""", (username,)).fetchall()
    conn.close()
    return jsonify({"saldo": saldo, "movimientos": [dict(m) for m in movs]})


@app.route("/api/billetera/depositar", methods=["POST"])
def api_depositar():
    d = request.get_json(silent=True) or {}
    username = d.get("username", "")
    try:
        monto = float(d.get("monto", 0))
    except (TypeError, ValueError):
        monto = 0
    if monto <= 0:
        return jsonify({"ok": False, "error": "Indica un monto valido"}), 400
    conn = get_db()
    conn.execute("UPDATE usuarios SET saldo = COALESCE(saldo,0) + ? WHERE username=?", (monto, username))
    mov(conn, username, "deposito", monto, f"Deposito via {d.get('metodo','Tarjeta')}")
    conn.commit()
    saldo = saldo_de(conn, username)
    conn.close()
    return jsonify({"ok": True, "saldo": saldo})


# ============================================================
# SOLICITUDES
# ============================================================
@app.route("/api/solicitud", methods=["POST"])
def api_nueva_solicitud():
    d = request.get_json(silent=True) or {}
    desc = d.get("descripcion", "").strip()
    if not desc:
        return jsonify({"ok": False, "error": "Describe que necesitas"}), 400

    # Si NO se pide un profesional especifico -> va a la bandeja comun (sin asignar)
    prof = (d.get("profesional") or "").strip()
    dirigida = bool(prof) and prof.lower() != "cualquier experto disponible"
    asignada = 1 if dirigida else 0
    experto = d.get("experto_username") if dirigida else None

    conn = get_db()
    cur = conn.execute("""INSERT INTO solicitudes
        (usuario_id,nombre,correo,profesional_solicitado,tipo,descripcion,urgencia,
         estado,experto_username,created_at,asignada,fase)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get("usuario_id"), d.get("nombre", "Visitante"), d.get("correo", ""),
         prof if dirigida else "Trámite abierto", d.get("tipo", "Consulta general"),
         desc, d.get("urgencia", "normal"),
         "nueva", experto, now(), asignada, "cotizacion"))
    sid = cur.lastrowid

    if dirigida:
        saludo = (f"Hola {d.get('nombre','').split(' ')[0]}! Soy tu asesor asignado. "
                  f"Ya vi tu solicitud sobre {d.get('tipo','tu tramite')}. "
                  f"Conversemos los detalles y te preparo una cotizacion.")
        conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
            VALUES (?,?,?,?,?,?)""", (sid, "experto", "Asesor ContiGO", saludo, "texto", now()))

    conn.commit(); conn.close()
    return jsonify({"ok": True, "id": sid, "asignada": asignada})


@app.route("/api/solicitudes")
def api_solicitudes():
    """Panel del experto: solicitudes ASIGNADAS a el."""
    username = request.args.get("username", EXPERTO_GUARDIA)
    conn = get_db()
    rows = conn.execute("""
        SELECT s.*,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id AND m.autor='usuario' AND m.leido=0) no_leidos,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id) total_msgs,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id AND m.tipo='archivo') archivos
        FROM solicitudes s WHERE s.experto_username=? AND s.asignada=1
        ORDER BY s.created_at DESC LIMIT 100""", (username,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/solicitudes/sin-asignar")
def api_sin_asignar():
    """Bandeja comun: solicitudes abiertas que cualquier experto puede tomar."""
    conn = get_db()
    rows = conn.execute("""
        SELECT id,nombre,tipo,descripcion,urgencia,created_at
        FROM solicitudes WHERE asignada=0
        ORDER BY created_at DESC LIMIT 100""").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/solicitud/<int:sid>/tomar", methods=["POST"])
def api_tomar(sid):
    """Un experto reclama un tramite de la bandeja comun."""
    d = request.get_json(silent=True) or {}
    username = d.get("username", "")
    nombre = d.get("nombre", "Asesor")
    conn = get_db()
    s = conn.execute("SELECT asignada FROM solicitudes WHERE id=?", (sid,)).fetchone()
    if not s:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404
    if s["asignada"] == 1:
        conn.close(); return jsonify({"ok": False, "error": "Otro experto ya tomó este trámite"}), 409

    conn.execute("""UPDATE solicitudes SET asignada=1, experto_username=?,
        profesional_solicitado=? WHERE id=?""", (username, nombre, sid))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "experto", nombre,
         f"Hola! Soy {nombre} y voy a ayudarte con tu trámite. Conversemos los detalles.",
         "texto", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/mis-solicitudes")
def api_mis_solicitudes():
    correo = request.args.get("correo", "")
    nombre = request.args.get("nombre", "")
    conn = get_db()
    rows = conn.execute("""
        SELECT s.*,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id AND m.autor='experto' AND m.leido=0) no_leidos
        FROM solicitudes s WHERE (s.correo=? AND s.correo!='') OR s.nombre=?
        ORDER BY s.created_at DESC""", (correo, nombre)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/solicitud/<int:sid>/estado", methods=["POST"])
def api_estado(sid):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    conn.execute("UPDATE solicitudes SET estado=? WHERE id=?", (d.get("estado", "atendiendo"), sid))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


# ============================================================
# CHAT
# ============================================================
@app.route("/api/solicitud/<int:sid>/mensajes")
def api_mensajes(sid):
    marcar = request.args.get("marcar")
    conn = get_db()
    if marcar in ("usuario", "experto"):
        otro = "experto" if marcar == "usuario" else "usuario"
        conn.execute("UPDATE mensajes SET leido=1 WHERE solicitud_id=? AND autor=?", (sid, otro))
        conn.commit()
    msgs = conn.execute("SELECT * FROM mensajes WHERE solicitud_id=? ORDER BY id ASC", (sid,)).fetchall()
    sol = conn.execute("SELECT * FROM solicitudes WHERE id=?", (sid,)).fetchone()
    conn.close()
    return jsonify({"mensajes": [dict(m) for m in msgs], "solicitud": dict(sol) if sol else None})


@app.route("/api/solicitud/<int:sid>/mensaje", methods=["POST"])
def api_enviar_mensaje(sid):
    d = request.get_json(silent=True) or {}
    texto = d.get("texto", "").strip()
    if not texto: return jsonify({"ok": False, "error": "Mensaje vacio"}), 400
    autor = d.get("autor", "usuario")
    conn = get_db()
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""", (sid, autor, d.get("autor_nombre", ""), texto, "texto", now()))
    if autor == "experto":
        conn.execute("UPDATE solicitudes SET estado='atendiendo' WHERE id=? AND estado='nueva'", (sid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/pedir-documentos", methods=["POST"])
def api_pedir_docs(sid):
    d = request.get_json(silent=True) or {}
    docs = d.get("documentos", [])
    if not docs: return jsonify({"ok": False, "error": "Indica al menos un documento"}), 400
    texto = "Para continuar con tu tramite necesito estos documentos:\n" + "\n".join(f"- {x}" for x in docs)
    if d.get("nota"): texto += f"\n\n{d['nota']}"
    conn = get_db()
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""", (sid, "experto", d.get("autor_nombre", "Asesor"), texto, "peticion_archivo", now()))
    for doc in docs:
        conn.execute("INSERT INTO documentos (solicitud_id,nombre,estado,created_at) VALUES (?,?,?,?)",
                     (sid, doc, "pendiente", now()))
    conn.execute("UPDATE solicitudes SET estado='atendiendo' WHERE id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/documentos")
def api_docs_lista(sid):
    conn = get_db()
    rows = conn.execute("""SELECT id,nombre,estado,archivo_nombre,archivo_path,motivo
        FROM documentos WHERE solicitud_id=? ORDER BY id""", (sid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/documento/<int:did>/enviar", methods=["POST"])
def api_doc_enviar(did):
    """El usuario sube el archivo para UN documento especifico de la lista."""
    if "archivo" not in request.files or not request.files["archivo"].filename:
        return jsonify({"ok": False, "error": "No se recibio ningun archivo"}), 400
    f = request.files["archivo"]
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_EXT:
        return jsonify({"ok": False, "error": f"Formato .{ext} no permitido"}), 400

    conn = get_db()
    doc = conn.execute("SELECT solicitud_id,nombre FROM documentos WHERE id=?", (did,)).fetchone()
    if not doc:
        conn.close(); return jsonify({"ok": False, "error": "Documento no existe"}), 404
    sid = doc["solicitud_id"]

    safe = secure_filename(f.filename)
    stored = f"doc{did}_s{sid}_{int(datetime.now().timestamp())}_{safe}"
    f.save(os.path.join(UPLOAD_DIR, stored))

    conn.execute("""UPDATE documentos SET estado='enviado', archivo_nombre=?, archivo_path=?, motivo=NULL
        WHERE id=?""", (safe, stored, did))
    # Mensaje en el chat para que quede el registro visible
    conn.execute("""INSERT INTO mensajes
        (solicitud_id,autor,autor_nombre,texto,tipo,archivo_nombre,archivo_path,created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (sid, "usuario", request.form.get("autor_nombre", "Usuario"),
         f"Envié el documento: {doc['nombre']}", "archivo", safe, stored, now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/documento/<int:did>/aprobar", methods=["POST"])
def api_doc_aprobar(did):
    d = request.get_json(silent=True) or {}
    conn = get_db()
    doc = conn.execute("SELECT solicitud_id,nombre FROM documentos WHERE id=?", (did,)).fetchone()
    if not doc:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404
    conn.execute("UPDATE documentos SET estado='aprobado', motivo=NULL WHERE id=?", (did,))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (doc["solicitud_id"], "experto", d.get("autor_nombre", "Asesor"),
         f"Documento aprobado: {doc['nombre']} ✓", "doc_aprobado", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/documento/<int:did>/rechazar", methods=["POST"])
def api_doc_rechazar(did):
    """El experto rechaza un documento: vuelve a 'pendiente' con un motivo."""
    d = request.get_json(silent=True) or {}
    motivo = (d.get("motivo") or "").strip() or "El documento no es válido, envíalo de nuevo."
    conn = get_db()
    doc = conn.execute("SELECT solicitud_id,nombre FROM documentos WHERE id=?", (did,)).fetchone()
    if not doc:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404
    conn.execute("""UPDATE documentos SET estado='rechazado', motivo=?,
        archivo_nombre=NULL, archivo_path=NULL WHERE id=?""", (motivo, did))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (doc["solicitud_id"], "experto", d.get("autor_nombre", "Asesor"),
         f"Documento rechazado: {doc['nombre']}\nMotivo: {motivo}\nPor favor envíalo nuevamente.",
         "doc_rechazado", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})




# ============================================================
# FASES + ESCROW (anti-fraude)
# ============================================================
@app.route("/api/solicitud/<int:sid>/acordar", methods=["POST"])
def api_acordar(sid):
    """Fase 2: el experto fija precio total y anticipo (max 50%)."""
    d = request.get_json(silent=True) or {}
    try:
        precio = float(d.get("precio", 0))
        anticipo = float(d.get("anticipo", 0))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "Montos invalidos"}), 400
    if precio <= 0:
        return jsonify({"ok": False, "error": "Indica el precio total"}), 400
    if anticipo < 0 or anticipo > precio * 0.5 + 0.001:
        return jsonify({"ok": False, "error": "El anticipo no puede superar el 50% del total"}), 400

    conn = get_db()
    conn.execute("""UPDATE solicitudes SET fase='acuerdo', precio=?, anticipo=?, estado='atendiendo'
        WHERE id=?""", (precio, anticipo, sid))
    saldo = precio - anticipo
    texto = (f"Propuesta de acuerdo:\n"
             f"- Precio total: ${precio:.2f}\n"
             f"- Anticipo para iniciar: ${anticipo:.2f}\n"
             f"- Saldo al entregar: ${saldo:.2f}\n"
             f"El anticipo queda retenido por ContiGO (no lo recibo hasta entregar).")
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""", (sid, "experto", d.get("autor_nombre", "Asesor"), texto, "acuerdo", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/pagar-anticipo", methods=["POST"])
def api_pagar_anticipo(sid):
    """Fase 3: el usuario paga el anticipo DESDE SU BILLETERA. Queda retenido."""
    d = request.get_json(silent=True) or {}
    username = d.get("username", "")
    conn = get_db()
    s = conn.execute("SELECT anticipo,nombre FROM solicitudes WHERE id=?", (sid,)).fetchone()
    if not s:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404
    anticipo = s["anticipo"] or 0
    saldo = saldo_de(conn, username)
    if saldo < anticipo:
        conn.close()
        return jsonify({"ok": False, "error": "saldo_insuficiente", "falta": anticipo - saldo,
                        "saldo": saldo, "necesita": anticipo}), 402

    conn.execute("UPDATE usuarios SET saldo = saldo - ? WHERE username=?", (anticipo, username))
    mov(conn, username, "retencion", -anticipo, f"Anticipo retenido - solicitud #{sid}", sid)
    conn.execute("""UPDATE solicitudes SET fase='en_curso', pagado_anticipo=?, estado='atendiendo'
        WHERE id=?""", (anticipo, sid))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "usuario", s["nombre"],
         f"Anticipo de ${anticipo:.2f} pagado y retenido en garantia. Puedes iniciar el tramite.",
         "pago_hecho", now()))
    conn.commit()
    nuevo = saldo_de(conn, username)
    conn.close()
    return jsonify({"ok": True, "saldo": nuevo})


@app.route("/api/solicitud/<int:sid>/entregar", methods=["POST"])
def api_entregar(sid):
    """Fase 4->5: el experto sube comprobante de entrega (archivo + nota)."""
    nota = request.form.get("nota", "").strip()
    autor = request.form.get("autor_nombre", "Asesor")
    archivo_guardado = None

    if "archivo" in request.files and request.files["archivo"].filename:
        f = request.files["archivo"]
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext not in ALLOWED_EXT:
            return jsonify({"ok": False, "error": f"Formato .{ext} no permitido"}), 400
        safe = secure_filename(f.filename)
        stored = f"entrega_s{sid}_{int(datetime.now().timestamp())}_{safe}"
        f.save(os.path.join(UPLOAD_DIR, stored))
        archivo_guardado = stored

    if not nota and not archivo_guardado:
        return jsonify({"ok": False, "error": "Agrega una nota o un archivo de entrega"}), 400

    conn = get_db()
    s = conn.execute("SELECT fase FROM solicitudes WHERE id=?", (sid,)).fetchone()
    if not s:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404
    if s["fase"] == "completado":
        conn.close(); return jsonify({"ok": False, "error": "El trámite ya fue confirmado y pagado"}), 409
    es_correccion = (s["fase"] == "entregado")

    conn.execute("UPDATE solicitudes SET fase='entregado', entrega_nota=?, entrega_archivo=? WHERE id=?",
                 (nota, archivo_guardado, sid))
    if es_correccion:
        texto = "Entrega corregida. Revisa nuevamente y confirma para liberar el pago."
    else:
        texto = "Entrega del trámite. Revisa y confirma para liberar el pago."
    if nota: texto += f"\nNota: {nota}"
    conn.execute("""INSERT INTO mensajes
        (solicitud_id,autor,autor_nombre,texto,tipo,archivo_nombre,archivo_path,created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (sid, "experto", autor, texto, "entrega",
         (archivo_guardado.split("_", 3)[-1] if archivo_guardado else None),
         archivo_guardado, now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True, "correccion": es_correccion})


@app.route("/api/solicitud/<int:sid>/confirmar-entrega", methods=["POST"])
def api_confirmar_entrega(sid):
    """Fase 6: el usuario confirma. Se paga el saldo (billetera) y se libera
       TODO al experto (anticipo retenido + saldo). Anti-fraude: aqui el
       experto ya subio comprobante y el usuario ya lo revisó."""
    d = request.get_json(silent=True) or {}
    username = d.get("username", "")
    conn = get_db()
    s = conn.execute("SELECT * FROM solicitudes WHERE id=?", (sid,)).fetchone()
    if not s:
        conn.close(); return jsonify({"ok": False, "error": "No existe"}), 404

    precio = s["precio"] or 0
    anticipo = s["pagado_anticipo"] or 0
    saldo_restante = precio - anticipo

    saldo_usuario = saldo_de(conn, username)
    if saldo_usuario < saldo_restante:
        conn.close()
        return jsonify({"ok": False, "error": "saldo_insuficiente", "falta": saldo_restante - saldo_usuario,
                        "saldo": saldo_usuario, "necesita": saldo_restante}), 402

    # Cobra el saldo al usuario
    if saldo_restante > 0:
        conn.execute("UPDATE usuarios SET saldo = saldo - ? WHERE username=?", (saldo_restante, username))
        mov(conn, username, "pago", -saldo_restante, f"Saldo final - solicitud #{sid}", sid)

    # Libera TODO al experto
    experto = s["experto_username"]
    total = anticipo + saldo_restante
    if experto:
        conn.execute("UPDATE usuarios SET saldo = COALESCE(saldo,0) + ? WHERE username=?", (total, experto))
        mov(conn, experto, "ingreso", total, f"Pago liberado - solicitud #{sid}", sid)

    conn.execute("""UPDATE solicitudes SET fase='completado', estado='completada',
        pagado_saldo=? WHERE id=?""", (saldo_restante, sid))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "usuario", s["nombre"],
         f"Trámite confirmado. Pago de ${total:.2f} liberado al profesional. ¡Gracias!",
         "pago_liberado", now()))
    conn.commit()
    nuevo = saldo_de(conn, username)
    conn.close()
    return jsonify({"ok": True, "saldo": nuevo})


@app.route("/api/solicitud/<int:sid>/subir", methods=["POST"])
def api_subir(sid):
    """Adjuntar un archivo suelto al chat. Sirve tanto al usuario como al experto."""
    if "archivo" not in request.files:
        return jsonify({"ok": False, "error": "No se recibio ningun archivo"}), 400
    f = request.files["archivo"]
    if not f.filename:
        return jsonify({"ok": False, "error": "Archivo sin nombre"}), 400
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_EXT:
        return jsonify({"ok": False, "error": f"Formato .{ext} no permitido"}), 400

    autor = request.form.get("autor", "usuario")
    if autor not in ("usuario", "experto"):
        autor = "usuario"

    safe = secure_filename(f.filename)
    stored = f"s{sid}_{autor}_{int(datetime.now().timestamp())}_{safe}"
    f.save(os.path.join(UPLOAD_DIR, stored))

    conn = get_db()
    conn.execute("""INSERT INTO mensajes
        (solicitud_id,autor,autor_nombre,texto,tipo,archivo_nombre,archivo_path,created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (sid, autor, request.form.get("autor_nombre", "Usuario"),
         f"Archivo: {safe}", "archivo", safe, stored, now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True, "archivo": safe})


@app.route("/uploads/<path:fname>")
def uploads(fname):
    return send_from_directory(UPLOAD_DIR, fname)


@app.route("/api/track", methods=["POST"])
def track():
    d = request.get_json(silent=True) or {}
    conn = get_db()
    conn.execute("INSERT INTO events (session_id,event_name,event_label,page,ts) VALUES (?,?,?,?,?)",
        (d.get("session_id", "?"), d.get("event_name", "?"), d.get("event_label", ""),
         d.get("page", "/"), now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    print("\n" + "=" * 60)
    print("  ContiGO - Plataforma de tramites")
    print("=" * 60)
    print(f"  Visitantes:  http://localhost:{port}")
    print(f"  Panel:       http://localhost:{port}/experto")
    print(f"  Metricas:    http://localhost:{port}/metricas")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
else:
    init_db()
