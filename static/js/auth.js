/* ============================================================
   ContiGO — Autenticación real contra la base de datos
   ============================================================ */

function authChoice(mode) {
  track(mode === "login" ? "abre_login" : "abre_registro");
  const go = r => mode === "login" ? `showLogin('${r}')` : `showRegister('${r}')`;
  openM(`
    <h2>${mode === "login" ? "Iniciar sesión" : "Crear tu cuenta"}</h2>
    <div class="sub">Elige el perfil con el que quieres entrar</div>
    <div class="role-2">
      <div class="role-c" onclick="${go('usuario')}">
        <div class="ic" style="background:#eff6ff">
          <svg width="24" height="24" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
        </div>
        <b>Necesito un trámite</b>
        <span>Busco ayuda profesional</span>
      </div>
      <div class="role-c" onclick="${go('experto')}">
        <div class="ic" style="background:#ecfdf5">
          <svg width="24" height="24" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
        </div>
        <b>Soy profesional</b>
        <span>Ofrezco mis servicios</span>
      </div>
    </div>`);
}

// ---------- REGISTRO ----------
function showRegister(role) {
  const isE = role === "experto";
  openM(`
    <h2>${isE ? "Registro profesional" : "Crear cuenta"}</h2>
    <div class="sub">${isE ? "Para recibir y atender solicitudes de trámites." : "Gratis y toma menos de un minuto."}</div>
    <label>Nombre completo *</label>
    <input type="text" id="rNom" placeholder="Ej: María Fernanda Pérez" autocomplete="name">
    <label>Nombre de usuario *</label>
    <input type="text" id="rUsr" placeholder="Ej: maria.perez" autocomplete="username">
    <label>Correo electrónico</label>
    <input type="email" id="rMail" placeholder="maria@correo.com" autocomplete="email">
    ${isE ? `<label>Profesión *</label>
      <select id="rProf">
        <option>Abogado/a</option><option>Contador/a Público</option>
        <option>Economista</option><option>Auditor/a</option>
        <option>Gestor/a Administrativo</option><option>Otro</option>
      </select>` : ""}
    <label>Contraseña *</label>
    <input type="password" id="rPwd" placeholder="Mínimo 3 caracteres" autocomplete="new-password"
           onkeydown="if(event.key==='Enter')doRegister('${role}')">
    <div class="alert alert-err" id="rErr" style="display:none"></div>
    <button class="btn ${isE ? 'btn-ok' : 'btn-primary'} btn-block btn-lg" id="rBtn" style="margin-top:22px"
            onclick="doRegister('${role}')">Crear mi cuenta</button>
    <div class="sub" style="margin:14px 0 0;text-align:center">
      ¿Ya tienes cuenta? <a href="#" onclick="authChoice('login');return false" style="color:var(--brand-2);font-weight:600">Inicia sesión</a>
    </div>`);
}

async function doRegister(role) {
  const nombre = document.getElementById("rNom").value.trim();
  const username = document.getElementById("rUsr").value.trim();
  const correo = document.getElementById("rMail").value.trim();
  const password = document.getElementById("rPwd").value;
  const profesion = document.getElementById("rProf")?.value;
  const err = document.getElementById("rErr");
  const btn = document.getElementById("rBtn");

  const fail = m => {
    err.innerHTML = `<span>⚠️</span><span>${m}</span>`;
    err.style.display = "flex";
    btn.disabled = false; btn.textContent = "Crear mi cuenta";
  };

  if (!nombre) return fail("Escribe tu nombre completo");
  if (!username) return fail("Elige un nombre de usuario");
  if (password.length < 3) return fail("La contraseña debe tener al menos 3 caracteres");

  err.style.display = "none";
  btn.disabled = true; btn.textContent = "Creando cuenta…";

  try {
    const r = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, username, correo, password, role, profesion })
    });
    const d = await r.json();
    if (!d.ok) return fail(d.error || "No se pudo crear la cuenta");
    track("registro_exitoso", role);
    enter(d.user);
  } catch (e) {
    fail("Sin conexión al servidor. Verifica que app.py esté corriendo.");
  }
}

// ---------- LOGIN ----------
function showLogin(role) {
  const demo = role === "experto" ? ["admin", "admin"] : ["user", "user"];
  openM(`
    <h2>Iniciar sesión</h2>
    <div class="sub">Entra con tu cuenta de ContiGO</div>
    <div class="alert alert-info" style="margin:0 0 18px">
      <span>💡</span><span>Cuenta de demostración: <b>${demo[0]} / ${demo[1]}</b></span>
    </div>
    <button class="btn btn-ghost btn-block" onclick="doLogin('${demo[0]}','${demo[1]}')">
      ⚡ Entrar con la cuenta demo
    </button>
    <div style="text-align:center;font-size:12px;color:var(--muted);margin:16px 0 4px">— o con tu cuenta —</div>
    <label>Usuario</label>
    <input type="text" id="lUsr" placeholder="tu usuario" autocomplete="username">
    <label>Contraseña</label>
    <input type="password" id="lPwd" placeholder="tu contraseña" autocomplete="current-password"
           onkeydown="if(event.key==='Enter')submitLogin()">
    <div class="alert alert-err" id="lErr" style="display:none"></div>
    <button class="btn btn-primary btn-block btn-lg" id="lBtn" style="margin-top:20px" onclick="submitLogin()">
      Iniciar sesión</button>
    <div class="sub" style="margin:14px 0 0;text-align:center">
      ¿No tienes cuenta? <a href="#" onclick="authChoice('register');return false" style="color:var(--brand-2);font-weight:600">Créala aquí</a>
    </div>`);
}

function submitLogin() {
  const u = document.getElementById("lUsr").value.trim();
  const p = document.getElementById("lPwd").value;
  if (!u || !p) {
    const e = document.getElementById("lErr");
    e.innerHTML = "<span>⚠️</span><span>Escribe tu usuario y contraseña</span>";
    e.style.display = "flex"; return;
  }
  doLogin(u, p);
}

async function doLogin(username, password) {
  const btn = document.getElementById("lBtn");
  const err = document.getElementById("lErr");
  if (btn) { btn.disabled = true; btn.textContent = "Entrando…"; }
  try {
    const r = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const d = await r.json();
    if (!d.ok) {
      if (err) { err.innerHTML = `<span>⚠️</span><span>${d.error}</span>`; err.style.display = "flex"; }
      else toast(d.error);
      if (btn) { btn.disabled = false; btn.textContent = "Iniciar sesión"; }
      return;
    }
    track("login_exitoso", d.user.role);
    enter(d.user);
  } catch (e) {
    if (err) { err.innerHTML = "<span>⚠️</span><span>Sin conexión al servidor</span>"; err.style.display = "flex"; }
    if (btn) { btn.disabled = false; btn.textContent = "Iniciar sesión"; }
  }
}

function enter(user) {
  setUser(user);
  location.href = user.role === "experto" ? "/experto" : "/usuario";
}
