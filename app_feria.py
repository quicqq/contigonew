"""
app_feria.py — ContiGO versión FERIA
=====================================
Extiende el app.py original con:
  1. Registro y login reales (contraseñas hasheadas con werkzeug)
  2. Tabla `solicitudes` que persiste en SQLite
  3. Endpoint /api/solicitudes/live para polling del panel del experto
  4. Endpoint /api/solicitud/<id>/estado para que el experto actualice el estado
  5. Ruta /experto_live — panel de feria con actualización cada 3 segundos

Cómo usar:
  python app_feria.py

Cómo exponer con ngrok (para la feria):
  1. Instala ngrok: https://ngrok.com/download
  2. En otra terminal: ngrok http 5000
  3. Copia la URL pública (ej: https://abc123.ngrok-free.app)
  4. Imprime un QR con esa URL para los visitantes del stand
"""

import sqlite3, os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect

from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "contigo-feria-2025-secret"   # Cambia esto en producción
DB = os.path.join(os.path.dirname(__file__), "feria.db")


# ----------------------------------------------------------------
# BASE DE DATOS
# ----------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre        TEXT NOT NULL,
            correo        TEXT,
            username      TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'usuario',
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS solicitudes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id  INTEGER,
            nombre      TEXT NOT NULL,
            correo      TEXT,
            tipo        TEXT NOT NULL,
            descripcion TEXT NOT NULL,
            estado      TEXT NOT NULL DEFAULT 'nueva',
            nota_experto TEXT,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT, event_name TEXT, event_label TEXT,
            page TEXT, ts TEXT
        );
    """)

    # Crear cuentas de prueba si no existen
    demo_users = [
        ("Usuario de Prueba", "user@contigo.test", "user",
         generate_password_hash("user"), "usuario"),
        ("Admin Experto",     "admin@contigo.test", "admin",
         generate_password_hash("admin"), "experto"),
    ]
    for nombre, correo, username, pw_hash, role in demo_users:
        conn.execute("""
            INSERT OR IGNORE INTO usuarios (nombre, correo, username, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (nombre, correo, username, pw_hash, role, datetime.utcnow().isoformat()))

    conn.commit()
    conn.close()


# ----------------------------------------------------------------
# RUTAS DE PÁGINAS (igual que antes + experto_live)
# ----------------------------------------------------------------
@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/usuario")
def usuario():
    return render_template("usuario.html")


@app.route("/experto")
def experto():
    return render_template("experto.html")


@app.route("/experto/live")
def experto_live():
    """Panel de feria: muestra solicitudes en vivo, polling cada 3 seg."""
    return render_template("experto_live.html")


@app.route("/dashboard")
def dashboard():
    conn = get_db()
    pv = conn.execute(
        "SELECT COUNT(DISTINCT session_id) c FROM events WHERE event_name='pageview'"
    ).fetchone()["c"]
    rows = conn.execute("""
        SELECT event_name, COUNT(*) total, COUNT(DISTINCT session_id) sesiones
        FROM events WHERE event_name != 'pageview'
        GROUP BY event_name ORDER BY sesiones DESC
    """).fetchall()
    summary = [{"event_name": r["event_name"], "total": r["total"],
                "sesiones": r["sesiones"],
                "pct": round(r["sesiones"] / pv * 100, 1) if pv else 0}
               for r in rows]
    conn.close()
    return render_template("dashboard.html", total_pageviews=pv, events_summary=summary)


# ----------------------------------------------------------------
# API: AUTENTICACIÓN REAL
# ----------------------------------------------------------------
@app.route("/api/register", methods=["POST"])
def api_register():
    d = request.get_json(silent=True) or {}
    nombre   = d.get("nombre", "").strip()
    correo   = d.get("correo", "").strip()
    username = d.get("username", "").strip()
    password = d.get("password", "")
    role     = d.get("role", "usuario")

    if not nombre or not username or not password:
        return jsonify({"ok": False, "error": "Nombre, usuario y contraseña son requeridos"}), 400

    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM usuarios WHERE username = ?", (username,)
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"ok": False, "error": "Ese nombre de usuario ya está tomado"}), 409

    conn.execute(
        "INSERT INTO usuarios (nombre, correo, username, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
        (nombre, correo, username, generate_password_hash(password), role,
         datetime.utcnow().isoformat())
    )
    conn.commit()
    user = conn.execute(
        "SELECT id, nombre, correo, role FROM usuarios WHERE username = ?", (username,)
    ).fetchone()
    conn.close()

    return jsonify({"ok": True, "user": dict(user)})


@app.route("/api/login", methods=["POST"])
def api_login():
    d = request.get_json(silent=True) or {}
    username = d.get("username", "").strip()
    password = d.get("password", "")

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM usuarios WHERE username = ?", (username,)
    ).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "error": "Usuario o contraseña incorrectos"}), 401

    return jsonify({
        "ok": True,
        "user": {
            "id":       user["id"],
            "nombre":   user["nombre"],
            "correo":   user["correo"],
            "username": user["username"],
            "role":     user["role"],
        }
    })


# ----------------------------------------------------------------
# API: SOLICITUDES (publicar trámite desde el visitante)
# ----------------------------------------------------------------
@app.route("/api/solicitud", methods=["POST"])
def api_nueva_solicitud():
    d = request.get_json(silent=True) or {}
    nombre      = d.get("nombre", "Visitante").strip()
    correo      = d.get("correo", "").strip()
    tipo        = d.get("tipo", "No especificado")
    descripcion = d.get("descripcion", "").strip()

    if not descripcion:
        return jsonify({"ok": False, "error": "La descripción es requerida"}), 400

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO solicitudes (nombre, correo, tipo, descripcion, estado, created_at) VALUES (?,?,?,?,?,?)",
        (nombre, correo, tipo, descripcion, "nueva", datetime.utcnow().isoformat())
    )
    solicitud_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"ok": True, "id": solicitud_id})


@app.route("/api/solicitudes/live", methods=["GET"])
def api_solicitudes_live():
    """
    Devuelve todas las solicitudes ordenadas por más reciente.
    El panel del experto llama esto cada 3 segundos.
    """
    conn = get_db()
    rows = conn.execute("""
        SELECT id, nombre, correo, tipo, descripcion, estado, nota_experto, created_at
        FROM solicitudes
        ORDER BY created_at DESC
        LIMIT 50
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/solicitud/<int:sid>/estado", methods=["POST"])
def api_update_estado(sid):
    """El experto actualiza el estado de una solicitud (atendiendo / completada)."""
    d = request.get_json(silent=True) or {}
    estado       = d.get("estado", "atendiendo")
    nota_experto = d.get("nota", "")

    conn = get_db()
    conn.execute(
        "UPDATE solicitudes SET estado = ?, nota_experto = ? WHERE id = ?",
        (estado, nota_experto, sid)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ----------------------------------------------------------------
# API: TRACKING (igual que antes)
# ----------------------------------------------------------------
@app.route("/api/track", methods=["POST"])
def track():
    d = request.get_json(silent=True) or {}
    conn = get_db()
    conn.execute(
        "INSERT INTO events (session_id, event_name, event_label, page, ts) VALUES (?,?,?,?,?)",
        (d.get("session_id", "?"), d.get("event_name", "?"), d.get("event_label", ""),
         d.get("page", "/"), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ----------------------------------------------------------------
# ARRANQUE
# ----------------------------------------------------------------
if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    print(f"\n✅ ContiGO FERIA corriendo en http://localhost:{port}")
    print(f"   Panel del experto: http://localhost:{port}/experto/live")
    print(f"   Para exponer con ngrok: ngrok http {port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)   # debug=False en feria!
else:
    init_db()
