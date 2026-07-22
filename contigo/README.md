# ContiGO — Guía para la feria

---

## 1. Qué tienes

Un solo servidor con **tres pantallas**:

| URL | Quién la usa | Qué hace |
|-----|--------------|----------|
| `/` | Todos | Portada: crear cuenta o iniciar sesión |
| `/usuario` | Visitantes de la feria | Ven profesionales, solicitan servicios, chatean, envían documentos |
| `/experto` | **Tú** | Recibes solicitudes en vivo, respondes, pides documentos |
| `/metricas` | Tú (opcional) | Cuántos se registraron, cuántas solicitudes, etc. |

**Importante:** el experto tiene **una sola vista**. Las solicitudes en tiempo real están dentro de `/experto`, en la pestaña "Solicitudes". No hay pantalla extra.

**Cuentas ya creadas:**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin` | Experto — **esta es la tuya** |
| `user` | `user` | Usuario demo (por si alguien no quiere registrarse) |

Toda solicitud que envíe cualquier visitante, sin importar a qué profesional le dé clic, **llega a la cuenta `admin`**. Eso está configurado en `app.py`, línea 33:

```python
EXPERTO_GUARDIA = "admin"
```

---

## 2. Instalación (una sola vez)

```bash
pip install Flask
```

Eso es todo. Flask ya trae lo demás.

---

## 3. Correrlo

```bash
cd contigo
python app.py
```

Verás:

```
============================================================
  ContiGO - Plataforma de tramites
============================================================
  Visitantes:  http://localhost:5000
  Tu panel:    http://localhost:5000/experto
  Metricas:    http://localhost:5000/metricas
```

---

## 4. Exponerlo a internet (ngrok)

Esto es lo que permite que los celulares de los visitantes lleguen a tu servidor.

**Instalación (una vez):**
1. Ve a https://ngrok.com/signup y crea una cuenta gratis
2. Descarga ngrok para tu sistema operativo
3. Copia tu authtoken del dashboard de ngrok y corre:
   ```bash
   ngrok config add-authtoken TU_TOKEN_AQUI
   ```

**Cada vez que lo uses:**

```bash
# Terminal 1 (deja esta corriendo)
python app.py

# Terminal 2 (deja esta corriendo también)
ngrok http 5000
```

Ngrok te muestra algo así:

```
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:5000
```

**Esa URL `https://a1b2-c3d4.ngrok-free.app` es tu enlace público.** Compártela con los visitantes.

> La URL cambia cada vez que reinicias ngrok. Genera el QR **el mismo día**, no antes.

---

## 5. Tu pregunta: ¿PC en casa y yo en la universidad?

**Sí, funciona.** Es exactamente para lo que sirve ngrok.

```
TU CASA                              LA UNIVERSIDAD
┌─────────────────────┐              ┌──────────────────────────┐
│ PC encendida        │              │ Tu laptop:               │
│                     │              │  → abre la URL de ngrok  │
│ python app.py       │◄────────────►│    + /experto            │
│ ngrok http 5000     │   internet   │                          │
│                     │              │ Celular del visitante:   │
│ contigo.db (datos)  │              │  → escanea el QR         │
│ uploads/ (archivos) │              │                          │
└─────────────────────┘              └──────────────────────────┘
```

Tú abres `https://tu-url.ngrok-free.app/experto` desde cualquier computadora, en cualquier red, y ves las solicitudes llegar en tiempo real. Los datos se guardan en la PC de tu casa.

**Prepara la PC de casa así:**

1. **Desactiva la suspensión automática**
   - Windows: Configuración → Sistema → Energía → "Nunca" en suspender
   - Mac: Configuración → Batería → Adaptador → desmarca "Poner en reposo"
2. **Conéctala por cable Ethernet** si puedes (más estable que WiFi)
3. **Déjala enchufada** a la corriente
4. **Prueba desde tu celular con datos móviles** (no WiFi de casa) antes de irte — así confirmas que funciona desde otra red

### ⚠️ El riesgo y el Plan B

Si se va la luz o el internet en tu casa, se cae todo y no puedes hacer nada desde la universidad.

**Plan B (recomendado):** lleva el proyecto en una USB o en tu laptop. Si algo falla, corres `python app.py` + `ngrok http 5000` desde la laptop misma en la feria (usando el hotspot de tu celular si el WiFi del venue es malo). Generas un QR nuevo y sigues. Toma 2 minutos.

**Plan C (si quieres cero riesgo):** despliega en Railway.app antes de la feria. Sube el proyecto a GitHub, conectas el repo en railway.app, y tienes una URL permanente que no depende de ninguna computadora tuya. El detalle es que en Railway el archivo `contigo.db` se reinicia en cada redeploy — para la feria de un día no importa, pero no subas cambios ese día.

---

## 6. El día de la feria — paso a paso

**En casa, antes de salir:**

```bash
python app.py          # terminal 1
ngrok http 5000        # terminal 2
```

1. Copia la URL de ngrok
2. Genera un QR en https://qr.io o https://www.qr-code-generator.com con esa URL
3. Imprímelo grande para el stand
4. **Prueba desde tu celular con datos móviles** que la URL abre bien

**En la feria:**

1. Abre en tu laptop: `https://tu-url.ngrok-free.app/experto`
2. Inicia sesión con `admin` / `admin`
3. Deja esa pantalla visible (mejor si tienes monitor grande o proyector)
4. Los visitantes escanean el QR → crean su cuenta → solicitan un servicio
5. Te llega el aviso con sonido y la solicitud aparece sola en tu pantalla

**El demo que le muestras a cada visitante:**

1. "Escanea el QR y crea tu cuenta" (30 segundos)
2. "Elige cualquier profesional y dale a **Solicitar servicio**"
3. Muestras tu pantalla: "mira, ya me llegó tu solicitud aquí"
4. Le respondes por el chat → él lo ve en su celular al instante
5. Le das a **📎 Pedir documentos**, seleccionas "Cédula" y "Certificado de votación"
6. Le aparece la lista en su chat → él sube una foto desde su celular
7. Tú la descargas desde tu panel

Ese recorrido completo toma unos 2 minutos y muestra todo el producto.

---

## 7. Personalizar el contenido

Todo el contenido visible está en **un solo archivo**: `static/js/data.js`

### Cambiar los profesionales

Abre `static/js/data.js` y busca `PROFESIONALES`. Cada uno se ve así:

```javascript
{
  id: "maria",
  nombre: "María Fernanda López",
  titulo: "Abogada · Derecho Civil y Notarial",
  foto: "https://images.unsplash.com/photo-...",   // ← la foto
  ciudad: "Guayaquil, Ecuador",
  rating: "4.9", resenas: 124, casos: 340, anios: 12,
  desde: 25,                    // precio mínimo en USD
  respuesta: "~45 min",
  bio: "Especialista en escrituras, poderes...",
  tags: ["Escrituras", "Poderes", "Herencias"],
  servicios: [
    { n: "Elaboración de poder general", p: 45, t: "2-3 días" },
  ],
},
```

**Para usar tus propias fotos:**
1. Crea la carpeta `static/img/`
2. Pon ahí tus fotos, por ejemplo `maria.jpg`
3. Cambia el campo foto a: `foto: "/static/img/maria.jpg"`

Si una foto falla en cargar, se muestran las iniciales automáticamente — no se rompe nada.

### 🎬 Embeber videos de YouTube

En el mismo archivo `static/js/data.js`, busca `VIDEOS`:

```javascript
{
  id: "ruc",
  titulo: "Cómo obtener tu RUC por primera vez",
  entidad: "SRI", dur: "4:35",
  yt: "",          // ← AQUÍ VA EL ID DEL VIDEO
  thumb: "https://images.unsplash.com/...",
  desc: "Requisitos, formulario y pasos...",
},
```

**Cómo sacar el ID de un video de YouTube:**

| Link de YouTube | El ID es |
|---|---|
| `https://www.youtube.com/watch?v=`**`dQw4w9WgXcQ`** | `dQw4w9WgXcQ` |
| `https://youtu.be/`**`dQw4w9WgXcQ`** | `dQw4w9WgXcQ` |
| `https://youtube.com/watch?v=`**`abc123XYZ`**`&t=30s` | `abc123XYZ` (lo de antes del `&`) |

Entonces pones:

```javascript
yt: "dQw4w9WgXcQ",
```

Y listo. **La miniatura se genera sola** desde YouTube, no tienes que buscar una imagen. Al hacer clic, el video se reproduce dentro de la app.

Si dejas `yt: ""`, se muestra un placeholder que dice "Video pendiente" — útil mientras grabas los tuyos.

### Cambiar los documentos que puedes pedir

En `data.js`, la lista `DOCS_FRECUENTES` son los botones de un clic en "Pedir documentos". Agrega o quita los que quieras.

---

## 8. Dónde quedan los datos

| Archivo | Qué contiene |
|---------|--------------|
| `contigo.db` | Usuarios, contraseñas (hasheadas), solicitudes, mensajes |
| `uploads/` | Los archivos que suben los visitantes |

**Guarda ambos después de la feria** — son la evidencia de tu prueba.

Para ver los usuarios registrados:

```bash
python3 -c "
import sqlite3
c = sqlite3.connect('contigo.db')
for r in c.execute('SELECT nombre, username, correo, created_at FROM usuarios'):
    print(r)
"
```

---

## 9. Checklist final

- [ ] `pip install Flask` hecho
- [ ] `python app.py` corre sin errores
- [ ] Ngrok instalado y con authtoken configurado
- [ ] Probado desde el celular con **datos móviles** (no WiFi de casa)
- [ ] PC de casa con suspensión desactivada y enchufada
- [ ] QR impreso con la URL de ngrok de **ese día**
- [ ] Proyecto copiado en USB o laptop como Plan B
- [ ] Cuenta `admin` probada: recibes solicitudes y puedes pedir documentos
- [ ] 1-2 solicitudes de prueba creadas para que el panel no se vea vacío al inicio
- [ ] Videos de YouTube agregados en `data.js` (o dejados en placeholder a propósito)

---

## 10. Problemas comunes

**"No me deja entrar con mi cuenta nueva"**
Revisa que estés corriendo `app.py` (el nuevo), no una versión vieja. El registro va contra la base de datos.

**"Los visitantes no pueden abrir el link"**
Verifica que ngrok siga corriendo en la terminal 2. Si se cerró, la URL murió — abre uno nuevo y regenera el QR.

**"No me llegan las solicitudes"**
Confirma que iniciaste sesión como `admin`. Las solicitudes se asignan a esa cuenta específicamente.

**"El archivo no se sube"**
Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, WEBP, HEIC. Máximo 10 MB.
