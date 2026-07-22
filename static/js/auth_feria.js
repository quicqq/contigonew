/**
 * auth_feria.js
 * Reemplaza auth.js cuando usas app_feria.py.
 * En landing.html cambia:
 *   <script src=".../auth.js"></script>
 * por:
 *   <script src=".../auth_feria.js"></script>
 *
 * También actualiza interactions.js: la función openPublishForm()
 * debe llamar a submitPublishReal() en vez de submitPublish().
 */

function openModal(html) {
  document.getElementById("modalBox").innerHTML =
    '<button class="modal-close" onclick="closeModal()">✕</button>' + html;
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() { document.getElementById("modalOverlay").classList.remove("open"); }
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

// ============================================================
// PASO 1: Elegir modo y rol
// ============================================================
function openAuthChoice(mode) {
  if (window.contigoTrack) window.contigoTrack(mode === "login" ? "abre_login" : "abre_registro", "");
  const go = (role) => mode === "login" ? `openLogin('${role}')` : `openRegister('${role}')`;
  openModal(`
    <h2>${mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
    <div class="sub">¿Cómo quieres entrar?</div>
    <div class="role-choice-grid">
      <div class="role-choice-card" onclick="${go('usuario')}">
        <div class="role-icon" style="background:#eef0ff;color:#5b4fe3;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>
        </div>
        <h4>Persona natural</h4><p>Busco ayuda con un trámite</p>
      </div>
      <div class="role-choice-card" onclick="${go('experto')}">
        <div class="role-icon" style="background:#e8f7ee;color:#16a34a;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
        </div>
        <h4>Experto / asesor</h4><p>Quiero ofrecer mis servicios</p>
      </div>
    </div>`);
}

// ============================================================
// REGISTRO (llama al backend real)
// ============================================================
function openRegister(role) {
  const isE = role === "experto";
  const extra = isE ? `
    <label>Profesión</label>
    <select id="regProfesion"><option>Abogado/a</option><option>Contador/a Público</option><option>Economista</option><option>Auditor/a</option><option>Otro</option></select>
    <label>Título profesional (SENESCYT)</label>
    <div class="file-upload" onclick="showToast('En la feria puedes omitir este paso')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
      Subir PDF o imagen (opcional en demo)
    </div>` : "";

  openModal(`
    <h2>${isE ? "Crear perfil de experto" : "Crear cuenta de usuario"}</h2>
    <div class="sub">${isE ? "Completa tus datos para ofrecer servicios." : "Rápido y gratis — te conectamos con el experto."}</div>
    <label>Nombre completo</label>
    <input type="text" id="regNombre" placeholder="Ej: Carlos Ramírez">
    <label>Nombre de usuario</label>
    <input type="text" id="regUsuario" placeholder="Ej: carlos.ramirez">
    <label>Correo electrónico</label>
    <input type="email" id="regCorreo" placeholder="Ej: carlos@correo.com">
    <label>Contraseña</label>
    <input type="password" id="regPass" placeholder="••••••••">
    ${extra}
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:18px;${isE?'background:#16a34a;':''}"
            id="regBtn" onclick="submitRegisterReal('${role}')">
      ${isE ? "Crear perfil de experto" : "Crear cuenta"}
    </button>
    <div class="sub" style="margin-top:10px;text-align:center;">
      ¿Ya tienes cuenta? <a href="#" onclick="openAuthChoice('login');return false;">Inicia sesión</a>
    </div>`);
}

async function submitRegisterReal(role) {
  const nombre   = document.getElementById("regNombre").value.trim();
  const username = document.getElementById("regUsuario").value.trim();
  const correo   = document.getElementById("regCorreo").value.trim();
  const password = document.getElementById("regPass").value;
  const profesion = role === "experto" && document.getElementById("regProfesion")
    ? document.getElementById("regProfesion").value : undefined;

  if (!nombre || !username || !password) {
    showToast("Completa nombre, usuario y contraseña"); return;
  }

  const btn = document.getElementById("regBtn");
  btn.textContent = "Creando cuenta..."; btn.disabled = true;

  try {
    const res = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, correo, username, password, role })
    });
    const data = await res.json();

    if (!data.ok) {
      showToast(data.error || "Error al registrarse"); btn.textContent = "Crear cuenta"; btn.disabled = false; return;
    }

    const profile = { ...data.user, profesion };
    loginAs(profile, "registro_completado");
  } catch (e) {
    showToast("Error de conexión. ¿Está corriendo el servidor?");
    btn.textContent = "Crear cuenta"; btn.disabled = false;
  }
}

// ============================================================
// LOGIN (llama al backend real, con botón de acceso rápido)
// ============================================================
function openLogin(role) {
  const demo = role === "experto" ? { u: "admin", p: "admin" } : { u: "user", p: "user" };
  const isE = role === "experto";
  openModal(`
    <h2>Iniciar sesión ${isE ? "como experto" : "como usuario"}</h2>
    <div class="sub">Cuenta de prueba: <b>${demo.u} / ${demo.p}</b></div>
    <button class="btn-outline" style="width:100%;margin-bottom:16px;" onclick="quickLoginReal('${role}')">
      ⚡ Entrar con la cuenta de prueba
    </button>
    <label>Usuario</label>
    <input type="text" id="loginUser" placeholder="${demo.u}">
    <label>Contraseña</label>
    <input type="password" id="loginPass" placeholder="••••••">
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:14px;${isE?'background:#16a34a;':''}"
            id="loginBtn" onclick="submitLoginReal('${role}')">
      Iniciar sesión
    </button>
    <div class="sub" style="margin-top:10px;text-align:center;">
      ¿No tienes cuenta? <a href="#" onclick="openAuthChoice('register');return false;">Créala aquí</a>
    </div>`);
}

async function quickLoginReal(role) {
  const demo = role === "experto" ? { u: "admin", p: "admin" } : { u: "user", p: "user" };
  await doLogin(demo.u, demo.p, role);
}

async function submitLoginReal(role) {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  const btn = document.getElementById("loginBtn");
  btn.textContent = "Entrando..."; btn.disabled = true;
  await doLogin(u, p, role, btn);
}

async function doLogin(username, password, role, btn) {
  try {
    const res = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(data.error || "Usuario o contraseña incorrectos");
      if (btn) { btn.textContent = "Iniciar sesión"; btn.disabled = false; }
      return;
    }
    loginAs(data.user, "login_exitoso");
  } catch (e) {
    showToast("Error de conexión. ¿Está corriendo el servidor?");
    if (btn) { btn.textContent = "Iniciar sesión"; btn.disabled = false; }
  }
}

function loginAs(profile, ev) {
  sessionStorage.setItem("contigo_user", JSON.stringify(profile));
  if (window.contigoTrack) window.contigoTrack(ev, profile.role);
  window.location.href = profile.role === "experto" ? "/experto" : "/usuario";
}

// ============================================================
// PUBLICAR TRÁMITE REAL (úsalo desde interactions.js)
// Llama esto en vez de submitPublish() cuando quieras que
// las solicitudes lleguen al panel del experto en vivo.
// ============================================================
window.submitPublishReal = async function() {
  const user = JSON.parse(sessionStorage.getItem("contigo_user") || "{}");
  const tipo = document.getElementById("pubTipo")?.value || "No especificado";
  const desc = document.getElementById("pubDesc")?.value?.trim() || "";

  if (!desc) { showToast("Describe tu trámite antes de publicar"); return; }

  try {
    const res = await fetch("/api/solicitud", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre:      user.nombre || "Visitante",
        correo:      user.correo || "",
        tipo,
        descripcion: desc,
      })
    });
    const data = await res.json();
    if (data.ok) {
      if (window.contigoTrack) window.contigoTrack("submit_solicitud_real", tipo);
      openModal(`<div class="empty-state">
        <div style="font-size:34px;">✅</div>
        <b>¡Solicitud enviada!</b><br>
        El experto en el stand la verá en segundos.<br>
        <small style="color:var(--text-muted);">ID de tu solicitud: #${data.id}</small>
        <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Entendido</button></div>
      </div>`);
    } else {
      showToast("Error al enviar: " + (data.error || "intenta de nuevo"));
    }
  } catch(e) {
    showToast("Error de conexión con el servidor");
  }
};
