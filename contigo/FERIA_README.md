# ContiGO — Guía para la feria 🎪

## ¿Qué hay aquí?

| Archivo            | Para qué sirve |
|--------------------|----------------|
| `app_feria.py`     | El servidor con auth real, base de datos y endpoints en vivo |
| `auth_feria.js`    | Reemplaza `auth.js` para conectar al backend real |
| `experto_live.html`| Panel del experto con solicitudes en tiempo real (polling 3 seg) |

---

## PASO 1 — Instalar dependencias (una sola vez)

```bash
pip install Flask
```
Flask ya incluye werkzeug (para el hashing de contraseñas). No necesitas nada más.

---

## PASO 2 — Activar la versión de feria

En `templates/landing.html`, cambia:
```html
<script src="{{ url_for('static', filename='js/auth.js') }}"></script>
```
por:
```html
<script src="{{ url_for('static', filename='js/auth_feria.js') }}"></script>
```

En `templates/usuario.html`, en la función `openPublishForm()` de `interactions.js`,
cambia la última línea de `submitPublish()` para llamar `submitPublishReal()`.
Búscala así y cambia el onclick del botón "Publicar trámite":
```html
<!-- Antes -->
<button ... onclick="submitPublish()">Publicar trámite</button>

<!-- Después -->
<button ... onclick="submitPublishReal()">Publicar trámite</button>
```

---

## PASO 3 — Correr el servidor

```bash
python app_feria.py
```

Verás:
```
✅ ContiGO FERIA corriendo en http://localhost:5000
   Panel del experto: http://localhost:5000/experto/live
```

---

## PASO 4 — Exponer con ngrok (para que los celulares de los visitantes lleguen)

1. Descarga ngrok en https://ngrok.com/download (es gratis, solo tienes que registrarte)
2. En otra terminal (deja `app_feria.py` corriendo):

```bash
ngrok http 5000
```

3. Ngrok te da una URL como `https://abc123.ngrok-free.app`
4. **Esa URL es la que compartes con los visitantes** (imprime un QR con ella)

> ⚠️ La URL de ngrok cambia cada vez que lo reinicias. Si vas a usar ngrok
> durante varios días, considera pagar el plan básico ($8/mes) para tener
> una URL estática. Para un solo día es perfecto el free tier.

---

## PASO 5 — Configurar el stand

```
┌─────────────────────┐    ┌─────────────────────────────┐
│   LAPTOP DEL        │    │   CELULAR/TABLET DEL        │
│   EXPERTO           │    │   VISITANTE                 │
│                     │    │                             │
│  localhost:5000/    │    │  https://abc123.ngrok.app   │
│  experto/live       │    │  (escanea el QR del stand)  │
│                     │    │                             │
│  [Panel en vivo]    │    │  → Se registra              │
│  Solicitudes cada   │    │  → Publica un trámite       │
│  3 segundos ↻       │    │  → Le llega al experto      │
└─────────────────────┘    └─────────────────────────────┘
```

---

## Cuentas preconfiguradas

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `user`  | `user`    | Persona natural |
| `admin` | `admin`   | Experto |

Puedes crear más cuentas desde el botón "Crear cuenta" en la landing,
o directamente en la base de datos.

---

## ¿Y si quiero guardar todo en la nube (sin depender de la laptop)?

### Opción A — Railway.app (~$5/mes, más fácil)
1. Sube el código a GitHub
2. Entra a railway.app → "New Project" → "Deploy from GitHub"
3. Agrega la variable de entorno: `PORT=5000`
4. Railway despliega automáticamente

### Opción B — Fly.io (free tier)
```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Desde la carpeta del proyecto:
fly launch
fly deploy
```

Para ambas opciones: reemplaza SQLite por **PostgreSQL** (Railway lo ofrece gratis
como add-on). Solo cambia la librería de `sqlite3` a `psycopg2` y la URL de conexión.

---

## El día de la feria — checklist

- [ ] Laptop cargada (trae el cargador)
- [ ] Probar `python app_feria.py` antes de salir de casa
- [ ] Ngrok instalado y testeado
- [ ] QR impreso con la URL de ngrok (genera uno en qr.io o similares)
- [ ] Pantalla del experto en `localhost:5000/experto/live` en pantalla completa
- [ ] Un segundo dispositivo para simular que eres un visitante y probar el flujo
- [ ] Haber creado 1-2 solicitudes de prueba con datos falsos para que el panel
      no aparezca vacío al inicio

---

## Dónde se guardan los datos

El archivo `feria.db` (SQLite) se crea automáticamente cuando corres el servidor.
**Guárdalo después de la feria** — tiene todos los registros de visitantes y solicitudes.
