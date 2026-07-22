"""
ContiGO - Plataforma de tramites
=================================
Servidor unico. Dos vistas: /usuario y /experto

EXPERTO DE GUARDIA: todas las solicitudes llegan a este usuario.
Cambialo abajo si quieres usar otra cuenta.

Correr:  python app.py
Exponer: ngrok http 5000
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

# ============================================================
# CONFIGURACION DE LA FERIA
# Todas las solicitudes se asignan a este usuario experto.
# ============================================================
EXPERTO_GUARDIA = "admin"

ALLOWED_EXT = {"pdf", "png", "jpg", "jpeg", "doc", "docx", "webp", "heic"}
MAX_FILE_MB = 10


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
            profesion TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS solicitudes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER, nombre TEXT NOT NULL, correo TEXT,
            profesional_solicitado TEXT,
            tipo TEXT NOT NULL, descripcion TEXT NOT NULL,
            urgencia TEXT DEFAULT 'normal',
            estado TEXT NOT NULL DEFAULT 'nueva',
            experto_username TEXT, created_at TEXT NOT NULL,
            precio REAL, pago_estado TEXT DEFAULT 'sin_cobro'
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
            nombre TEXT NOT NULL,
            entregado INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT, event_name TEXT, event_label TEXT, page TEXT, ts TEXT
        );
    """)
    # Migraciones seguras para bases ya existentes (Railway)
    for col, ddl in [
        ("precio", "ALTER TABLE solicitudes ADD COLUMN precio REAL"),
        ("pago_estado", "ALTER TABLE solicitudes ADD COLUMN pago_estado TEXT DEFAULT 'sin_cobro'"),
    ]:
        try:
            conn.execute(ddl)
        except sqlite3.OperationalError:
            pass  # la columna ya existe
    for nombre, correo, username, pw, role, prof in [
        ("Usuario de Prueba", "user@contigo.ec", "user", "user", "usuario", None),
        ("Carlos Ramirez", "admin@contigo.ec", "admin", "admin", "experto", "Abogado / Gestor"),
    ]:
        conn.execute("""INSERT OR IGNORE INTO usuarios
            (nombre,correo,username,password_hash,role,profesion,created_at)
            VALUES (?,?,?,?,?,?,?)""",
            (nombre, correo, username, generate_password_hash(pw), role, prof, now()))
    conn.commit(); conn.close()


# ============================================================
# PAGINAS - solo 3 vistas: landing, usuario, experto
# ============================================================
@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/usuario")
def vista_usuario():
    return render_template("usuario.html")


@app.route("/experto")
def vista_experto():
    return render_template("experto.html")


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
    u = conn.execute("SELECT id,nombre,correo,username,role,profesion FROM usuarios WHERE username=?",
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
        "username": u["username"], "role": u["role"], "profesion": u["profesion"]}})


# ============================================================
# SOLICITUDES
# ============================================================
@app.route("/api/solicitud", methods=["POST"])
def api_nueva_solicitud():
    d = request.get_json(silent=True) or {}
    desc = d.get("descripcion", "").strip()
    if not desc:
        return jsonify({"ok": False, "error": "Describe que necesitas"}), 400

    conn = get_db()
    cur = conn.execute("""INSERT INTO solicitudes
        (usuario_id,nombre,correo,profesional_solicitado,tipo,descripcion,urgencia,estado,experto_username,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (d.get("usuario_id"), d.get("nombre", "Visitante"), d.get("correo", ""),
         d.get("profesional", "Cualquier experto disponible"),
         d.get("tipo", "Consulta general"), desc, d.get("urgencia", "normal"),
         "nueva", EXPERTO_GUARDIA, now()))
    sid = cur.lastrowid

    prof = d.get("profesional", "")
    saludo = (f"Hola {d.get('nombre','').split(' ')[0]}! Soy tu asesor asignado. "
              f"Ya vi tu solicitud sobre {d.get('tipo','tu tramite')}. "
              f"Dame un momento y te digo exactamente que documentos necesito.")
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""", (sid, "experto", "Asesor ContiGO", saludo, "texto", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True, "id": sid})


@app.route("/api/solicitudes")
def api_solicitudes():
    """Panel del experto: todas las solicitudes asignadas."""
    conn = get_db()
    rows = conn.execute("""
        SELECT s.*,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id AND m.autor='usuario' AND m.leido=0) no_leidos,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id) total_msgs,
          (SELECT COUNT(*) FROM mensajes m WHERE m.solicitud_id=s.id AND m.tipo='archivo') archivos
        FROM solicitudes s WHERE s.experto_username=?
        ORDER BY s.created_at DESC LIMIT 100""", (EXPERTO_GUARDIA,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


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
        conn.execute("INSERT INTO documentos (solicitud_id,nombre,created_at) VALUES (?,?,?)",
                     (sid, doc, now()))
    conn.execute("UPDATE solicitudes SET estado='atendiendo' WHERE id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/documentos")
def api_docs_lista(sid):
    """Lista de documentos pedidos y su estado de entrega."""
    conn = get_db()
    rows = conn.execute("SELECT id,nombre,entregado FROM documentos WHERE solicitud_id=? ORDER BY id",
                        (sid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/documento/<int:did>/entregado", methods=["POST"])
def api_doc_marcar(did):
    conn = get_db()
    conn.execute("UPDATE documentos SET entregado=1 WHERE id=?", (did,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


# ============================================================
# PAGO (simulado)
# ============================================================
@app.route("/api/solicitud/<int:sid>/cobrar", methods=["POST"])
def api_cobrar(sid):
    """El experto fija el precio y solicita el pago al usuario."""
    d = request.get_json(silent=True) or {}
    try:
        precio = float(d.get("precio", 0))
    except (TypeError, ValueError):
        precio = 0
    if precio <= 0:
        return jsonify({"ok": False, "error": "Indica un monto valido"}), 400

    concepto = d.get("concepto", "Servicio de tramite").strip()
    conn = get_db()
    conn.execute("UPDATE solicitudes SET precio=?, pago_estado='pendiente' WHERE id=?", (precio, sid))
    texto = (f"Solicitud de pago: ${precio:.2f}\n"
             f"Concepto: {concepto}\n"
             f"El pago queda protegido y solo se libera cuando confirmes que el tramite esta completo.")
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "experto", d.get("autor_nombre", "Asesor"), texto, "solicitud_pago", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/pagar", methods=["POST"])
def api_pagar(sid):
    """El usuario 'paga' (simulado). El dinero queda en garantia."""
    d = request.get_json(silent=True) or {}
    conn = get_db()
    sol = conn.execute("SELECT precio FROM solicitudes WHERE id=?", (sid,)).fetchone()
    precio = sol["precio"] if sol and sol["precio"] else 0
    conn.execute("UPDATE solicitudes SET pago_estado='en_garantia' WHERE id=?", (sid,))
    metodo = d.get("metodo", "Tarjeta")
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "usuario", d.get("autor_nombre", "Usuario"),
         f"Pago realizado: ${precio:.2f} via {metodo}. El dinero esta en garantia.", "pago_hecho", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/liberar-pago", methods=["POST"])
def api_liberar(sid):
    """El usuario confirma trámite completo y libera el pago al experto."""
    conn = get_db()
    sol = conn.execute("SELECT precio FROM solicitudes WHERE id=?", (sid,)).fetchone()
    precio = sol["precio"] if sol and sol["precio"] else 0
    conn.execute("UPDATE solicitudes SET pago_estado='liberado', estado='completada' WHERE id=?", (sid,))
    conn.execute("""INSERT INTO mensajes (solicitud_id,autor,autor_nombre,texto,tipo,created_at)
        VALUES (?,?,?,?,?,?)""",
        (sid, "usuario", "Usuario",
         f"Pago liberado: ${precio:.2f} transferido al profesional. Tramite confirmado como completo.",
         "pago_liberado", now()))
    conn.commit(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/solicitud/<int:sid>/subir", methods=["POST"])
def api_subir(sid):
    if "archivo" not in request.files:
        return jsonify({"ok": False, "error": "No se recibio ningun archivo"}), 400
    f = request.files["archivo"]
    if not f.filename:
        return jsonify({"ok": False, "error": "Archivo sin nombre"}), 400
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_EXT:
        return jsonify({"ok": False, "error": f"Formato .{ext} no permitido"}), 400

    safe = secure_filename(f.filename)
    stored = f"s{sid}_{int(datetime.now().timestamp())}_{safe}"
    f.save(os.path.join(UPLOAD_DIR, stored))

    conn = get_db()
    conn.execute("""INSERT INTO mensajes
        (solicitud_id,autor,autor_nombre,texto,tipo,archivo_nombre,archivo_path,created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (sid, "usuario", request.form.get("autor_nombre", "Usuario"),
         f"Documento enviado: {safe}", "archivo", safe, stored, now()))
    # Marca como entregado el primer documento pendiente de esa solicitud
    pend = conn.execute("SELECT id FROM documentos WHERE solicitud_id=? AND entregado=0 ORDER BY id LIMIT 1",
                        (sid,)).fetchone()
    if pend:
        conn.execute("UPDATE documentos SET entregado=1 WHERE id=?", (pend["id"],))
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
    print(f"  Tu panel:    http://localhost:{port}/experto")
    print(f"  Metricas:    http://localhost:{port}/metricas")
    print("")
    print("  Cuenta experto (TUYA):  admin / admin")
    print("  Cuenta usuario demo:    user  / user")
    print("")
    print(f"  Para exponer a internet:  ngrok http {port}")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=False)
else:
    init_db()
