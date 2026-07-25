/* ============================================================
   ContiGO — Vista del usuario
   ============================================================ */
let ME = null;

document.addEventListener("DOMContentLoaded", () => {
  ME = requireAuth("usuario");
  if (!ME) return;

  const ini = initials(ME.nombre), col = avColor(ME.nombre);
  ["uAv", "sAv"].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = ini; el.style.background = col;
  });
  document.getElementById("uName").textContent = ME.nombre.split(" ")[0];
  document.getElementById("sName").textContent = ME.nombre;
  document.getElementById("sMail").textContent = ME.correo || ME.username;

  renderPros();
  renderVids();
  renderTop();
  checkNotifs();
  setInterval(checkNotifs, 8000);
});

/* ---------- PROFESIONALES ---------- */
function renderPros() {
  document.getElementById("proGrid").innerHTML = PROFESIONALES.map(p => `
    <div class="pro" data-kw="${esc((p.tags.join(" ") + " " + p.titulo + " " + p.nombre).toLowerCase())}">
      <div class="pro-top">
        <img class="pro-photo" src="${p.foto}" alt="${esc(p.nombre)}"
             onerror="this.outerHTML='<div class=\\'avatar\\' style=\\'width:58px;height:58px;border-radius:14px;font-size:19px;background:${avColor(p.nombre)}\\'>${initials(p.nombre)}</div>'">
        <div class="pro-id">
          <div class="pro-name">${esc(p.nombre)}
            <svg class="verified" viewBox="0 0 24 24" fill="#2563eb"><path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z"/><path d="M10.5 14.6l-2.3-2.3 1.1-1.1 1.2 1.2 3.6-3.6 1.1 1.1z" fill="#fff"/></svg>
          </div>
          <div class="pro-role">${esc(p.titulo)}</div>
          <div class="pro-loc">
            <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${esc(p.ciudad)} · <span class="dot-on"></span> Disponible
          </div>
        </div>
      </div>
      <div class="pro-stats">
        <div class="pstat"><b>${p.rating}★</b><span>${p.resenas} reseñas</span></div>
        <div class="pstat"><b>${p.casos}</b><span>casos</span></div>
        <div class="pstat"><b>${p.anios}</b><span>años exp.</span></div>
      </div>
      <div class="pro-bio">${esc(p.bio)}</div>
      <div class="pro-tags">${p.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div>
        <div class="pro-price">Desde <b>$${p.desde}</b> · Responde en ${p.respuesta}</div>
        <div class="pro-foot">
          <button class="btn btn-primary" style="flex:1" onclick="solicitar('${p.id}')"
                  data-track="click_solicitar_servicio" data-track-label="${esc(p.nombre)}">
            Solicitar servicio
          </button>
          <button class="btn btn-ghost btn-sm" onclick="verPerfil('${p.id}')"
                  data-track="click_ver_perfil" data-track-label="${esc(p.nombre)}">Ver perfil</button>
        </div>
      </div>
    </div>`).join("");
}

function verPerfil(id) {
  const p = PROFESIONALES.find(x => x.id === id);
  openM(`
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
      <img src="${p.foto}" style="width:72px;height:72px;border-radius:18px;object-fit:cover;border:2px solid var(--line)"
           onerror="this.outerHTML='<div class=\\'avatar av-lg\\' style=\\'background:${avColor(p.nombre)};border-radius:18px\\'>${initials(p.nombre)}</div>'">
      <div>
        <h2 style="padding:0;font-size:19px">${esc(p.nombre)}</h2>
        <div style="color:var(--brand-2);font-weight:600;font-size:13.5px">${esc(p.titulo)}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:3px">${p.rating}★ (${p.resenas}) · ${p.casos} casos · ${p.ciudad}</div>
      </div>
    </div>
    <div class="alert alert-info" style="margin:0 0 18px"><span>⚡</span><span>Responde en promedio en <b>${p.respuesta}</b></span></div>
    <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6;margin-bottom:18px">${esc(p.bio)}</p>
    <label style="margin-top:0">Especialidades</label>
    <div class="pro-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <label>Servicios y tarifas referenciales</label>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${p.servicios.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border:1px solid var(--line);border-radius:10px">
          <div><div style="font-weight:600;font-size:13.5px">${esc(s.n)}</div>
            <div style="font-size:11.5px;color:var(--muted)">⏱ ${esc(s.t)}</div></div>
          <div style="font-family:'Sora',sans-serif;font-weight:700;color:var(--brand-2)">$${s.p}</div>
        </div>`).join("")}
    </div>
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:22px" onclick="solicitar('${p.id}')">
      Solicitar servicio con ${esc(p.nombre.split(" ")[0])}
    </button>`, true);
}

/* ---------- SOLICITAR SERVICIO ---------- */
function solicitar(profId) {
  const p = profId ? PROFESIONALES.find(x => x.id === profId) : null;
  track("abre_form_solicitud", p ? p.nombre : "general");
  openM(`
    <h2>Solicitar servicio</h2>
    <div class="sub">${p ? `Tu solicitud irá directo a <b>${esc(p.nombre)}</b>` : "Te asignamos el profesional adecuado según tu caso"}</div>
    ${p ? `<div style="display:flex;gap:12px;align-items:center;background:var(--brand-light);padding:13px;border-radius:11px;margin-bottom:20px">
      <img src="${p.foto}" style="width:42px;height:42px;border-radius:11px;object-fit:cover"
           onerror="this.style.display='none'">
      <div><div style="font-weight:600;font-size:13.5px">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:var(--muted)">${esc(p.titulo)}</div></div>
    </div>` : ""}
    <label style="margin-top:0">¿Qué trámite necesitas? *</label>
    <select id="sTipo">${TIPOS_TRAMITE.map(t => `<option>${t}</option>`).join("")}</select>
    <label>Cuéntanos tu caso *</label>
    <textarea id="sDesc" placeholder="Ej: Necesito renovar mi licencia tipo B que venció el mes pasado. Vivo en el norte de Guayaquil y tengo disponibilidad en las mañanas."></textarea>
    <label>¿Qué tan urgente es?</label>
    <select id="sUrg">
      <option value="normal">Normal — en las próximas semanas</option>
      <option value="pronto">Pronto — esta semana</option>
      <option value="urgente">Urgente — en 1-2 días</option>
    </select>
    <div class="alert alert-err" id="sErr" style="display:none"></div>
    <button class="btn btn-primary btn-block btn-lg" id="sBtn" style="margin-top:22px"
            onclick="enviarSolicitud('${p ? esc(p.nombre) : ""}')">Enviar solicitud</button>
    <p style="font-size:12px;color:var(--muted);text-align:center;margin-top:12px">
      Gratis y sin compromiso. Recibirás respuesta en el chat.</p>`);
}

async function enviarSolicitud(profNombre) {
  const tipo = document.getElementById("sTipo").value;
  const desc = document.getElementById("sDesc").value.trim();
  const urg = document.getElementById("sUrg").value;
  const err = document.getElementById("sErr");
  const btn = document.getElementById("sBtn");

  if (desc.length < 10) {
    err.innerHTML = "<span>⚠️</span><span>Describe tu caso con un poco más de detalle (mínimo 10 caracteres)</span>";
    err.style.display = "flex"; return;
  }
  err.style.display = "none";
  btn.disabled = true; btn.textContent = "Enviando…";

  try {
    const dirigida = !!profNombre;
    const r = await fetch("/api/solicitud", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: ME.id, nombre: ME.nombre, correo: ME.correo || ME.username,
        profesional: profNombre || "Cualquier experto disponible",
        experto_username: dirigida ? "admin" : null,
        tipo, descripcion: desc, urgencia: urg
      })
    });
    const d = await r.json();
    if (!d.ok) { btn.disabled = false; btn.textContent = "Enviar solicitud"; return toast(d.error); }

    track("solicitud_enviada", dirigida ? "dirigida" : "abierta");
    if (d.asignada) {
      openM(`
        <div style="text-align:center;padding:14px 0">
          <div style="width:66px;height:66px;border-radius:20px;background:var(--ok-bg);display:grid;place-items:center;margin:0 auto 18px">
            <svg width="32" height="32" fill="none" stroke="#059669" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 style="padding:0;margin-bottom:8px">¡Solicitud enviada!</h2>
          <p style="font-size:14px;color:var(--muted);margin-bottom:6px">
            ${esc(profNombre)} ya recibió tu solicitud y te responderá en el chat.</p>
          <p style="font-size:12.5px;color:var(--muted)">Solicitud <b>#${d.id}</b></p>
          <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="abrirChat(${d.id})">
            Abrir chat con mi asesor</button>
          <button class="btn btn-ghost btn-block" style="margin-top:9px" onclick="closeM()">Más tarde</button>
        </div>`);
    } else {
      openM(`
        <div style="text-align:center;padding:14px 0">
          <div style="width:66px;height:66px;border-radius:20px;background:var(--brand-light);display:grid;place-items:center;margin:0 auto 18px">
            <svg width="32" height="32" fill="none" stroke="#2563eb" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>
          </div>
          <h2 style="padding:0;margin-bottom:8px">¡Trámite publicado!</h2>
          <p style="font-size:14px;color:var(--muted);margin-bottom:6px">
            Tu solicitud está abierta. Un profesional capacitado la tomará pronto y te escribirá por el chat.</p>
          <p style="font-size:12.5px;color:var(--muted)">Solicitud <b>#${d.id}</b></p>
          <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="abrirChat(${d.id})">
            Abrir el chat</button>
          <button class="btn btn-ghost btn-block" style="margin-top:9px" onclick="closeM()">Más tarde</button>
        </div>`);
    }
    checkNotifs();
  } catch (e) {
    btn.disabled = false; btn.textContent = "Enviar solicitud";
    toast("Sin conexión al servidor");
  }
}

/* ---------- MIS SOLICITUDES ---------- */
let uSols = [], uInboxTimer = null;

async function misSolicitudes() {
  track("abre_mis_solicitudes");
  // Muestra la vista de bandeja a pantalla completa
  document.getElementById("mainView").style.display = "none";
  document.getElementById("inboxView").style.display = "";
  window.scrollTo(0, 0);
  await loadInbox();
  if (uInboxTimer) clearInterval(uInboxTimer);
  uInboxTimer = setInterval(loadInbox, 3500);
}

function toggleMenu() {
  const m = document.getElementById("mobileMenu");
  if (m) m.classList.toggle("open");
}
function closeMenu() {
  const m = document.getElementById("mobileMenu");
  if (m) m.classList.remove("open");
}

function cerrarBandeja() {
  document.getElementById("inboxView").style.display = "none";
  document.getElementById("mainView").style.display = "";
  if (uInboxTimer) { clearInterval(uInboxTimer); uInboxTimer = null; }
  stopChatPolling();
  checkNotifs();
}

async function loadInbox() {
  try {
    const r = await fetch(`/api/mis-solicitudes?correo=${encodeURIComponent(ME.correo || ME.username)}&nombre=${encodeURIComponent(ME.nombre)}`);
    uSols = await r.json();
    renderInboxList();
  } catch (e) { }
}

function renderInboxList() {
  const el = document.getElementById("uSolList");
  if (!el) return;
  if (!uSols.length) {
    setHTML(el, `<div class="empty" style="padding:36px 18px">
      <div class="empty-ic"><svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div>
      <b>Aún no tienes trámites</b>
      <p style="font-size:12.5px">Solicita un servicio para empezar.</p>
      <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="cerrarBandeja();solicitar()">Solicitar asesoría</button>
    </div>`);
    return;
  }
  const html = uSols.map(s => {
    const est = s.estado === "nueva" ? "nueva" : s.estado === "completada" ? "completada" : "atendiendo";
    return `<div class="sol ${est} ${chatId === s.id ? "on" : ""}" onclick="abrirChat(${s.id})">
      <div class="sol-hd">
        <div class="avatar av-sm" style="background:${avColor(s.profesional_solicitado || "A")};width:32px;height:32px;font-size:12px">${initials(s.profesional_solicitado || "AS")}</div>
        <div style="flex:1;min-width:0">
          <div class="sol-nm">${esc(s.tipo)}</div>
          <div class="sol-tm">${timeAgo(s.created_at)}</div>
        </div>
        ${s.no_leidos ? `<span class="sol-unread">${s.no_leidos}</span>` : ""}
      </div>
      <div class="sol-dc">${esc(s.descripcion)}</div>
      <div class="sol-meta"><span>👤 ${esc((s.profesional_solicitado || "Asesor").split("·")[0])}</span></div>
    </div>`;
  }).join("");
  setHTML(el, html);
}


/* ---------- CHAT (basado en fases, dentro de la bandeja) ---------- */
let chatId = null, chatTimer = null;
let uRenderedIds = [], uFase = null;

function abrirChat(sid) {
  // Si la bandeja no está abierta (p. ej. tras enviar solicitud), ábrela
  if (document.getElementById("inboxView").style.display === "none") {
    closeM();
    misSolicitudes().then(() => abrirChat(sid));
    return;
  }
  chatId = sid;
  uRenderedIds = [];
  uFase = null;
  renderInboxList();
  const th = document.getElementById("uThread");
  th.innerHTML = `
    <div class="th-head" style="flex-direction:column;align-items:stretch;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="th-info"><div class="th-nm" id="uThTipo">Trámite #${sid}</div>
          <div class="th-mt" id="uThProf">Asesor</div></div>
        <span id="uThFase"></span>
      </div>
      <div id="phaseBar"></div>
      <div id="docPanel"></div>
      <div id="actionPanel"></div>
    </div>
    <div class="th-body" id="cbox"></div>
    <div class="th-bar">
      <button class="btn btn-ghost" onclick="document.getElementById('cfile').click()" style="padding:11px 13px" title="Adjuntar archivo">
        <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.4 11.05l-9.2 9.2a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.3-2.3l8.5-8.5"/></svg>
      </button>
      <input type="file" id="cfile" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp,.heic" onchange="upFile(this)">
      <input type="file" id="docFileInput" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp,.heic" onchange="enviarDocFile(this)">
      <textarea id="cin" rows="1" placeholder="Escribe tu mensaje…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg()}"></textarea>
      <button class="btn btn-primary" onclick="sendMsg()" style="padding:11px 16px">
        <svg width="17" height="17" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
      </button>
    </div>
    <div id="upStat" style="font-size:11px;color:var(--muted);text-align:center;padding:2px 0 6px"></div>`;
  loadMsgs(); loadDocs();
  if (chatTimer) clearInterval(chatTimer);
  chatTimer = setInterval(() => { loadMsgs(); loadDocs(); }, 3000);
}

window.stopChatPolling = function () {
  if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  chatId = null;
};

async function loadMsgs() {
  if (!chatId) return;
  const box = document.getElementById("cbox");
  if (!box) return stopChatPolling();
  try {
    const r = await fetch(`/api/solicitud/${chatId}/mensajes?marcar=usuario`);
    const d = await r.json();
    const nuevos = d.mensajes.filter(m => !uRenderedIds.includes(m.id));
    if (nuevos.length) {
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      nuevos.forEach(m => { box.insertAdjacentHTML("beforeend", uBubble(m)); uRenderedIds.push(m.id); });
      if (nearBottom) box.scrollTop = box.scrollHeight;
    }
    if (d.solicitud) {
      const tt = document.getElementById("uThTipo"), tp = document.getElementById("uThProf");
      if (tt) tt.textContent = d.solicitud.tipo;
      if (tp) tp.textContent = "👤 " + (d.solicitud.profesional_solicitado || "Asesor asignado");
      // Se repinta SIEMPRE segun el estado real del servidor (con guarda anti-parpadeo
      // dentro de cada render), asi el panel desaparece apenas cambia la fase.
      uFase = d.solicitud.fase;
      renderPhaseBar(d.solicitud);
      renderActionPanel(d.solicitud);
    }
  } catch (e) { }
}

function uBubble(m) {
  if (m.tipo === "peticion_archivo")
    return `<div class="bubble bb-ask">📎 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "archivo") {
    const mine = m.autor === "usuario";
    return `<div class="bubble ${mine ? "bb-file" : "bb-them"}" style="${mine ? "" : "align-self:flex-start"}">
      <div style="font-weight:600">📄 ${esc(m.autor_nombre || (mine ? "Tú" : "Asesor"))}</div>
      <a class="dl" href="/uploads/${encodeURIComponent(m.archivo_path)}" target="_blank" download>⬇ ${esc(m.archivo_nombre)}</a>
      <div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  }
  if (m.tipo === "doc_aprobado")
    return `<div class="bubble bb-them" style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46">✓ ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "doc_rechazado")
    return `<div class="bubble bb-them" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;white-space:pre-line">⚠️ ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "acuerdo")
    return `<div class="bubble bb-them" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;white-space:pre-line">🤝 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "entrega")
    return `<div class="bubble bb-them" style="background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6">📦 ${esc(m.texto)}${m.archivo_path ? `<a class="dl" href="/uploads/${encodeURIComponent(m.archivo_path)}" target="_blank" download style="color:#7c3aed">⬇ ${esc(m.archivo_nombre)}</a>` : ""}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "pago_hecho" || m.tipo === "pago_liberado")
    return `<div class="bubble bb-me" style="background:#059669">✅ ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  return `<div class="bubble ${m.autor === "usuario" ? "bb-me" : "bb-them"}">${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
}

/* ---------- Barra de fases (rastreador visible) ---------- */
/* Escribe en el DOM SOLO si el contenido cambio.
   Esto es lo que elimina el parpadeo del polling cada 3s. */
function setHTML(el, html) {
  if (!el) return false;
  if (el.dataset.sig === html) return false;   // identico: no tocar el DOM
  el.dataset.sig = html;
  el.innerHTML = html;
  return true;
}

function renderPhaseBar(s) {
  const el = document.getElementById("phaseBar");
  if (!el) return;
  const steps = [["cotizacion", "Chat"], ["acuerdo", "Acuerdo"], ["en_curso", "Anticipo"], ["entregado", "Entrega"], ["completado", "Pago"]];
  const order = ["cotizacion", "acuerdo", "en_curso", "entregado", "completado"];
  const cur = order.indexOf(s.fase === "anticipo" ? "acuerdo" : s.fase);
  const html = `
    <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 12px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;gap:0;font-size:10.5px">
        ${steps.map(([k, lbl], i) => {
          const done = i < cur, active = i === cur;
          const bg = done ? "var(--ok)" : active ? "var(--brand-2)" : "var(--line)";
          const tc = done || active ? "var(--ink)" : "var(--muted)";
          return `<div style="display:flex;align-items:center;${i < steps.length - 1 ? "flex:1" : ""}">
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="width:24px;height:24px;border-radius:50%;background:${bg};color:#fff;display:grid;place-items:center;font-weight:700;font-size:11px">${done ? "✓" : i + 1}</div>
              <span style="color:${tc};font-weight:${active ? 600 : 400};white-space:nowrap">${lbl}</span>
            </div>
            ${i < steps.length - 1 ? `<div style="flex:1;height:2px;background:${done ? "var(--ok)" : "var(--line)"};margin:0 4px;margin-bottom:16px"></div>` : ""}
          </div>`;
        }).join("")}
      </div>
    </div>`;
  setHTML(el, html);
}

/* ---------- Panel de acción según fase ----------
   Compacto y minimizable: no ocupa toda la pantalla del chat.  */
let panelMin = {};   // { fase: true } si el usuario lo minimizó

function togglePanel(fase) {
  panelMin[fase] = !panelMin[fase];
  const el = document.getElementById("actionPanel");
  if (el) el.dataset.sig = "";      // fuerza el repintado
  if (uLastSol) renderActionPanel(uLastSol);
}

let uLastSol = null;

function panelWrap(fase, color, borde, titulo, cuerpo, minTexto) {
  const min = !!panelMin[fase];
  const btn = `<button onclick="togglePanel('${fase}')" title="${min ? "Mostrar" : "Minimizar"}"
      style="background:rgba(255,255,255,.6);border:1px solid ${borde};color:inherit;width:24px;height:24px;
      border-radius:7px;font-size:13px;line-height:1;flex-shrink:0;cursor:pointer">${min ? "▸" : "▾"}</button>`;
  if (min) {
    return `<div style="background:${color};border:1px solid ${borde};border-radius:11px;padding:9px 12px;margin-bottom:9px;
        display:flex;align-items:center;gap:9px">
      <span style="font-size:12.5px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${minTexto}</span>
      ${btn}</div>`;
  }
  return `<div style="background:${color};border:1px solid ${borde};border-radius:11px;padding:13px;margin-bottom:9px">
    <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:7px">
      <div style="font-weight:700;font-size:13.5px;flex:1">${titulo}</div>${btn}
    </div>
    ${cuerpo}</div>`;
}

function renderActionPanel(s) {
  const el = document.getElementById("actionPanel");
  if (!el) return;
  uLastSol = s;
  const f = s.fase;
  let html = "";

  if (f === "acuerdo") {
    const total = (s.precio || 0).toFixed(2), ant = (s.anticipo || 0).toFixed(2), saldo = ((s.precio || 0) - (s.anticipo || 0)).toFixed(2);
    html = panelWrap("acuerdo", "#eff6ff", "#bfdbfe",
      '<span style="color:#1e3a8a">🤝 Acuerdo propuesto</span>',
      `<div style="font-size:12.5px;color:#334155;line-height:1.6">
         Total <b>$${total}</b> · Anticipo <b>$${ant}</b> · Saldo al recibir <b>$${saldo}</b></div>
       <button class="btn btn-primary btn-block btn-sm" style="margin-top:9px" onclick="pagarAnticipo(${s.id}, ${s.anticipo || 0})">
         Pagar anticipo de $${ant} y comenzar</button>
       <div style="font-size:11px;color:#2563eb;margin-top:6px;text-align:center">🔒 Protegido: el asesor no lo recibe hasta entregar.</div>`,
      `🤝 Acuerdo: pagar anticipo $${ant}`);
  } else if (f === "en_curso") {
    html = panelWrap("en_curso", "#fffbeb", "#fde68a",
      '<span style="color:#92400e">⏳ Trámite en curso</span>',
      `<div style="font-size:12px;color:#b45309">Anticipo de $${(s.pagado_anticipo || 0).toFixed(2)} retenido en garantía. Tu asesor está trabajando.</div>`,
      `⏳ En curso · $${(s.pagado_anticipo || 0).toFixed(2)} en garantía`);
  } else if (f === "entregado") {
    const saldo = ((s.precio || 0) - (s.pagado_anticipo || 0)).toFixed(2);
    html = panelWrap("entregado", "#f5f3ff", "#ddd6fe",
      '<span style="color:#5b21b6">📦 Tu trámite fue entregado</span>',
      `<div style="font-size:12.5px;color:#6d28d9;line-height:1.5">Revisa el comprobante en el chat. Si está correcto, confirma para pagar el saldo de <b>$${saldo}</b>.</div>
       <button class="btn btn-ok btn-block btn-sm" style="margin-top:9px" onclick="confirmarEntrega(${s.id})">
         ✓ Confirmar y liberar pago ($${saldo})</button>
       <button class="btn btn-ghost btn-block btn-sm" style="margin-top:6px" onclick="toast('Escríbele por el chat para resolver dudas antes de confirmar.')">Tengo un problema</button>`,
      `📦 Entregado · confirmar y pagar $${saldo}`);
  } else if (f === "completado") {
    html = `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:11px;padding:10px 13px;margin-bottom:9px;text-align:center">
      <span style="font-weight:700;font-size:13px;color:#065f46">✅ Trámite completado — pago liberado</span></div>`;
  }
  setHTML(el, html);
}

/* ---------- Pagar anticipo (desde billetera) ---------- */
async function pagarAnticipo(sid, monto) {
  // Verifica saldo
  const w = await (await fetch(`/api/billetera?username=${encodeURIComponent(walletUser())}`)).json();
  if ((w.saldo || 0) < monto) {
    return openM(`
      <h2>Saldo insuficiente</h2>
      <div class="sub">Necesitas $${monto.toFixed(2)} y tienes $${(w.saldo || 0).toFixed(2)} en tu billetera.</div>
      <div class="alert alert-info"><span>💡</span><span>Deposita saldo en tu billetera y vuelve a intentarlo.</span></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="abrirBilletera(${sid})">Ir a mi billetera</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="abrirChat(${sid})">Volver al chat</button>`);
  }
  openM(`
    <h2>Confirmar anticipo</h2>
    <div class="sub">Se descontará $${monto.toFixed(2)} de tu billetera y quedará retenido en garantía hasta que recibas el trámite.</div>
    <div class="alert alert-info"><span>🔒</span><span>El asesor NO recibe este dinero ahora. Solo se le paga cuando confirmes la entrega.</span></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-ghost" style="flex:1" onclick="abrirChat(${sid})">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="doPagarAnticipo(${sid})">Pagar $${monto.toFixed(2)}</button>
    </div>`);
}
async function doPagarAnticipo(sid) {
  const r = await fetch(`/api/solicitud/${sid}/pagar-anticipo`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: walletUser() })
  });
  const d = await r.json();
  if (!d.ok) {
    if (d.error === "saldo_insuficiente") return pagarAnticipo(sid, d.necesita);
    return toast(d.error || "No se pudo pagar");
  }
  track("anticipo_pagado");
  closeM();
  toast("✅ Anticipo pagado — trámite iniciado");
  forzarRefresco();
}

/* Limpia las firmas para que los paneles se repinten YA, sin esperar el polling */
function forzarRefresco() {
  uFase = null;
  ["actionPanel", "docPanel", "phaseBar"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dataset.sig = "";
  });
  loadMsgs(); loadDocs(); refreshSaldo();
}

/* ---------- Confirmar entrega (paga saldo + libera) ---------- */
async function confirmarEntrega(sid) {
  const r = await fetch(`/api/solicitud/${sid}/confirmar-entrega`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: walletUser() })
  });
  const d = await r.json();
  if (!d.ok) {
    if (d.error === "saldo_insuficiente") {
      return openM(`
        <h2>Saldo insuficiente para el saldo final</h2>
        <div class="sub">Necesitas $${d.necesita.toFixed(2)} y tienes $${d.saldo.toFixed(2)}.</div>
        <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="abrirBilletera(${sid})">Depositar y volver</button>
        <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeM()">Volver al chat</button>`);
    }
    return toast(d.error || "No se pudo confirmar");
  }
  track("entrega_confirmada");
  closeM();
  toast("🎉 ¡Trámite completado! Pago liberado al asesor");
  forzarRefresco(); loadInbox();
}

/* ---------- DOCUMENTOS: cada uno con su botón "Enviar" ---------- */
let docsMin = false;
function toggleDocs() {
  docsMin = !docsMin;
  const el = document.getElementById("docPanel");
  if (el) el.dataset.sig = "";
  loadDocs();
}

async function loadDocs() {
  if (!chatId) return;
  const el = document.getElementById("docPanel");
  if (!el) return;
  try {
    const r = await fetch(`/api/solicitud/${chatId}/documentos`);
    const docs = await r.json();
    if (!docs.length) { setHTML(el, ""); return; }
    const aprob = docs.filter(d => d.estado === "aprobado").length;
    const pend = docs.filter(d => d.estado === "pendiente" || d.estado === "rechazado").length;
    const btn = `<button onclick="toggleDocs()" title="${docsMin ? "Mostrar" : "Minimizar"}"
        style="background:rgba(255,255,255,.6);border:1px solid #fde68a;color:#92400e;width:24px;height:24px;
        border-radius:7px;font-size:13px;line-height:1;flex-shrink:0;cursor:pointer">${docsMin ? "▸" : "▾"}</button>`;

    let html;
    if (docsMin) {
      html = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:9px 12px;margin-bottom:9px;
          display:flex;align-items:center;gap:9px">
        <span style="font-size:12.5px;font-weight:600;color:#92400e;flex:1">📋 Documentos ${aprob}/${docs.length}${pend ? ` · ${pend} por enviar` : ""}</span>
        ${btn}</div>`;
    } else {
      html = `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:12px;margin-bottom:9px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
            <div style="font-weight:700;font-size:13px;color:#92400e;flex:1">📋 Documentos solicitados</div>
            <span style="font-size:11.5px;color:#b45309;font-weight:600">${aprob}/${docs.length}</span>
            ${btn}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:190px;overflow-y:auto">
            ${docs.map(d => uDocRow(d)).join("")}
          </div>
        </div>`;
    }
    setHTML(el, html);
  } catch (e) { }
}

function uDocRow(d) {
  const st = {
    pendiente: ["#78350f", "⬜", ""],
    enviado: ["#1e40af", "🕓", "Enviado, en revisión"],
    aprobado: ["#059669", "✅", "Aprobado"],
    rechazado: ["#991b1b", "❌", "Rechazado"]
  }[d.estado] || ["#78350f", "⬜", ""];

  let boton = "";
  if (d.estado === "pendiente" || d.estado === "rechazado")
    boton = `<button class="btn btn-primary btn-sm" style="padding:5px 12px;font-size:12px" onclick="pickDocFile(${d.id})">${d.estado === "rechazado" ? "Reenviar" : "Enviar"}</button>`;
  else if (d.estado === "enviado")
    boton = `<span style="font-size:11px;color:#1e40af;font-weight:600">En revisión</span>`;
  else if (d.estado === "aprobado")
    boton = `<span style="font-size:15px">✅</span>`;

  const motivo = (d.estado === "rechazado" && d.motivo)
    ? `<div style="font-size:11.5px;color:#991b1b;margin-top:3px;padding-left:24px">Motivo: ${esc(d.motivo)}</div>` : "";

  return `<div>
    <div style="display:flex;align-items:center;gap:9px">
      <span style="font-size:15px">${st[1]}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:${st[0]}">${esc(d.nombre)}</div>
        ${st[2] ? `<div style="font-size:11px;color:${st[0]};opacity:.85">${st[2]}</div>` : ""}
      </div>
      ${boton}
    </div>
    ${motivo}
  </div>`;
}

let docPendienteId = null;
function pickDocFile(did) {
  docPendienteId = did;
  document.getElementById("docFileInput").click();
}
async function enviarDocFile(inp) {
  if (!inp.files?.[0] || !docPendienteId) return;
  const fd = new FormData();
  fd.append("archivo", inp.files[0]);
  fd.append("autor_nombre", ME.nombre);
  toast("Enviando documento…");
  try {
    const r = await fetch(`/api/documento/${docPendienteId}/enviar`, { method: "POST", body: fd });
    const d = await r.json();
    if (d.ok) { toast("✅ Documento enviado"); track("documento_enviado"); loadDocs(); loadMsgs(); }
    else toast(d.error || "Error al enviar");
  } catch (e) { toast("Sin conexión"); }
  inp.value = ""; docPendienteId = null;
}

async function sendMsg() {
  const i = document.getElementById("cin");
  const t = i.value.trim();
  if (!t || !chatId) return;
  i.value = "";
  await fetch(`/api/solicitud/${chatId}/mensaje`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor: "usuario", autor_nombre: ME.nombre, texto: t })
  });
  track("mensaje_enviado");
  loadMsgs();
}

async function upFile(inp) {
  if (!inp.files?.[0] || !chatId) return;
  const st = document.getElementById("upStat");
  if (st) st.textContent = "Subiendo…";
  const fd = new FormData();
  fd.append("archivo", inp.files[0]);
  fd.append("autor", "usuario");
  fd.append("autor_nombre", ME.nombre);
  try {
    const r = await fetch(`/api/solicitud/${chatId}/subir`, { method: "POST", body: fd });
    const d = await r.json();
    if (st) st.textContent = d.ok ? "✅ Archivo enviado" : "⚠️ " + d.error;
    if (d.ok) { track("archivo_chat"); loadMsgs(); }
  } catch (e) { if (st) st.textContent = "⚠️ Sin conexión"; }
  inp.value = "";
}

/* ---------- BILLETERA (usuario) ---------- */
function walletUser() { return ME.username || ME.correo || ME.nombre; }

async function abrirBilletera(volverChat) {
  track("abre_billetera");
  const w = await (await fetch(`/api/billetera?username=${encodeURIComponent(walletUser())}`)).json();
  const movs = w.movimientos || [];
  openM(`
    <h2>Mi billetera</h2>
    <div class="sub">Deposita saldo y úsalo en cualquier trámite</div>
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:14px;padding:22px;margin-bottom:16px">
      <div style="font-size:12.5px;opacity:.85">Saldo disponible</div>
      <div style="font-family:'Sora',sans-serif;font-size:34px;font-weight:800" id="uBal">$${Number(w.saldo || 0).toFixed(2)}</div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:18px">
      ${[10, 20, 50, 100].map(v => `<button class="btn btn-ghost btn-sm" style="flex:1" onclick="elegirMetodo(${v},${volverChat || "null"})">+$${v}</button>`).join("")}
    </div>
    <button class="btn btn-primary btn-block" onclick="depositarOtro(${volverChat || "null"})">Depositar otro monto</button>
    ${volverChat ? `<button class="btn btn-ok btn-block" style="margin-top:9px" onclick="closeM();forzarRefresco()">Volver al trámite</button>` : ""}
    <label style="margin-top:20px">Movimientos recientes</label>
    <div style="display:flex;flex-direction:column">
      ${movs.length ? movs.map(m => uMovRow(m)).join("") : '<p style="font-size:13px;color:var(--muted)">Aún no hay movimientos.</p>'}
    </div>`, true);
}

function uMovRow(m) {
  const pos = m.monto >= 0;
  const ic = { deposito: "⬇️", retencion: "🔒", pago: "➖", ingreso: "💰", reembolso: "↩️" }[m.tipo] || "•";
  return `<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--line)">
    <div style="width:32px;height:32px;border-radius:9px;background:var(--bg);display:grid;place-items:center">${ic}</div>
    <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">${esc(m.concepto || m.tipo)}</div>
      <div style="font-size:11px;color:var(--muted)">${timeAgo(m.created_at)}</div></div>
    <b style="font-family:'Sora',sans-serif;font-size:14px;color:${pos ? "var(--ok)" : "var(--ink-2)"}">${pos ? "+" : ""}$${Math.abs(m.monto).toFixed(2)}</b>
  </div>`;
}

function depositarOtro(volver) {
  openM(`
    <h2>Depositar saldo</h2>
    <div class="sub">Elige cuánto quieres cargar a tu billetera</div>
    <label style="margin-top:0">Monto (USD)</label>
    <input type="number" id="depMonto" min="1" step="0.01" placeholder="Ej: 40" style="font-size:18px;font-weight:700"
           onkeydown="if(event.key==='Enter')irAMetodo(${volver || "null"})">
    <div style="display:flex;gap:10px;margin-top:22px">
      <button class="btn btn-ghost" style="flex:1" onclick="abrirBilletera(${volver || "null"})">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="irAMetodo(${volver || "null"})">Continuar</button>
    </div>`);
}
function irAMetodo(volver) {
  const monto = parseFloat(document.getElementById("depMonto").value);
  if (!monto || monto <= 0) return toast("Indica un monto válido");
  elegirMetodo(monto, volver);
}

/* Paso 2: elegir método de pago */
let depSel = { monto: 0, volver: null, metodo: "Tarjeta de crédito/débito" };
function elegirMetodo(monto, volver) {
  depSel = { monto, volver: volver || null, metodo: "Tarjeta de crédito/débito" };
  const metodos = [
    ["Tarjeta de crédito/débito", "💳"],
    ["Transferencia bancaria", "🏦"],
    ["Billetera móvil (Bimo, DeUna)", "📱"],
  ];
  openM(`
    <h2>¿Cómo quieres pagar?</h2>
    <div class="sub">Depósito de <b>$${monto.toFixed(2)}</b> a tu billetera</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
      ${metodos.map((m, i) => `
        <button class="dep-metodo${i === 0 ? " sel" : ""}" data-metodo="${esc(m[0])}" onclick="pickMetodo(this)"
          style="display:flex;align-items:center;gap:12px;padding:14px;border:2px solid ${i === 0 ? "var(--brand-2)" : "var(--line)"};
          border-radius:12px;background:${i === 0 ? "var(--brand-light)" : "var(--card)"};text-align:left;width:100%">
          <span style="font-size:22px">${m[1]}</span>
          <span style="font-weight:600;font-size:14px;flex:1">${m[0]}</span>
          <span class="dep-check" style="color:var(--brand-2);font-weight:800;font-size:16px;${i === 0 ? "" : "visibility:hidden"}">✓</span>
        </button>`).join("")}
    </div>
    <div style="display:flex;gap:10px;margin-top:22px">
      <button class="btn btn-ghost" style="flex:1" onclick="abrirBilletera(${volver || "null"})">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="confirmarDeposito()">Continuar</button>
    </div>`);
}
function pickMetodo(btn) {
  depSel.metodo = btn.dataset.metodo;
  document.querySelectorAll(".dep-metodo").forEach(b => {
    const on = b === btn;
    b.style.borderColor = on ? "var(--brand-2)" : "var(--line)";
    b.style.background = on ? "var(--brand-light)" : "var(--card)";
    b.querySelector(".dep-check").style.visibility = on ? "visible" : "hidden";
  });
}

/* Paso 3: confirmar */
function confirmarDeposito() {
  openM(`
    <h2>Confirmar depósito</h2>
    <div class="sub">Revisa antes de confirmar</div>
    <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin:6px 0 4px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px">
        <span style="color:var(--muted)">Monto</span><b>$${depSel.monto.toFixed(2)}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;border-top:1px solid var(--line)">
        <span style="color:var(--muted)">Método</span><b style="text-align:right">${esc(depSel.metodo)}</b></div>
    </div>
    <div class="alert alert-info" style="margin-top:12px"><span>ℹ️</span><span>Depósito simulado: no se cobra dinero real. Es para probar el prototipo.</span></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-ghost" style="flex:1" onclick="elegirMetodo(${depSel.monto},${depSel.volver || "null"})">Atrás</button>
      <button class="btn btn-primary" style="flex:1" onclick="doDeposito()">Confirmar depósito</button>
    </div>`);
}
async function doDeposito() {
  const r = await fetch("/api/billetera/depositar", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: walletUser(), monto: depSel.monto, metodo: depSel.metodo })
  });
  const d = await r.json();
  if (!d.ok) return toast(d.error || "No se pudo depositar");
  track("deposito", "$" + depSel.monto);
  toast(`✅ Depositaste $${depSel.monto.toFixed(2)}`);
  refreshSaldo();
  abrirBilletera(depSel.volver);
}

/* ---------- VIDEOS ---------- */
function renderVids() {
  document.getElementById("vidGrid").innerHTML = VIDEOS.map(v => `
    <div class="vid" data-kw="${esc((v.titulo + " " + v.entidad).toLowerCase())}"
         onclick="verVideo('${v.id}')" data-track="click_video" data-track-label="${esc(v.titulo)}">
      <div class="vid-thumb">
        <img src="${v.yt ? `https://img.youtube.com/vi/${v.yt}/mqdefault.jpg` : v.thumb}" alt="${esc(v.titulo)}">
        <div class="vid-play"><div><svg width="16" height="16" fill="#1e3a8a" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
        <span class="vid-dur">${v.dur}</span>
      </div>
      <div class="vid-body">
        <div class="vid-title">${esc(v.titulo)}</div>
        <div class="vid-meta">${esc(v.entidad)}</div>
      </div>
    </div>`).join("");
}

function verVideo(id) {
  const v = VIDEOS.find(x => x.id === id);
  openM(`
    <h2>${esc(v.titulo)}</h2>
    <div class="sub">${esc(v.entidad)} · ${v.dur}</div>
    ${v.yt
      ? `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;background:#000">
           <iframe src="https://www.youtube.com/embed/${v.yt}" style="position:absolute;inset:0;width:100%;height:100%;border:0"
                   allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
         </div>`
      : `<div style="aspect-ratio:16/9;border-radius:12px;background:var(--bg);border:1.5px dashed var(--line);
              display:grid;place-items:center;text-align:center;padding:24px;color:var(--muted);font-size:13px">
           <div><div style="font-size:32px;margin-bottom:10px">🎬</div>
           <b style="color:var(--ink)">Video pendiente</b><br>
           Agrega el ID de YouTube en <code style="background:var(--line);padding:2px 6px;border-radius:4px">static/js/data.js</code></div>
         </div>`}
    <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6;margin-top:18px">${esc(v.desc)}</p>
    <div class="alert alert-info" style="margin-top:18px">
      <span>💡</span><span>¿Prefieres que lo haga un profesional? Solicita el servicio y nos encargamos.</span></div>
    <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="closeM();solicitar()">
      Solicitar ayuda profesional</button>`, true);
}

/* ---------- BUSCADOR ---------- */
function qFind(t) { document.getElementById("q").value = t; buscar(); }
function buscar() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  track("busqueda", q);
  if (!q) { document.querySelectorAll(".pro,.vid").forEach(e => e.style.display = ""); return; }
  let n = 0;
  document.querySelectorAll(".pro,.vid").forEach(e => {
    const hit = (e.dataset.kw || "").includes(q) || e.textContent.toLowerCase().includes(q);
    e.style.display = hit ? "" : "none";
    if (hit) n++;
  });
  if (!n) {
    toast("Sin resultados. Solicita una asesoría y te ayudamos.");
    document.querySelectorAll(".pro,.vid").forEach(e => e.style.display = "");
  } else {
    document.getElementById("profesionales").scrollIntoView({ behavior: "smooth" });
    toast(`${n} resultado${n > 1 ? "s" : ""} para "${q}"`);
  }
}

/* ---------- NOTIFICACIONES ---------- */
async function checkNotifs() {
  try {
    const r = await fetch(`/api/mis-solicitudes?correo=${encodeURIComponent(ME.correo || ME.username)}&nombre=${encodeURIComponent(ME.nombre)}`);
    const list = await r.json();
    const n = list.reduce((s, x) => s + (x.no_leidos || 0), 0);
    ["notifBadge", "mcCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = n; el.style.display = n ? "" : "none"; }
    });
  } catch (e) { }
  refreshSaldo();
}

async function refreshSaldo() {
  try {
    const w = await (await fetch(`/api/billetera?username=${encodeURIComponent(ME.username || ME.correo || ME.nombre)}`)).json();
    const el = document.getElementById("topSaldo");
    if (el) el.textContent = "$" + Number(w.saldo || 0).toFixed(2);
  } catch (e) { }
}

/* ---------- EXTRAS ---------- */
function renderTop() {
  document.getElementById("topTramites").innerHTML = [
    ["Work and Travel", 48], ["RUC / SRI", 42], ["Licencia", 35], ["Visa", 28]
  ].map(([n, v]) => `
    <div><div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span>${n}</span><b style="color:var(--brand-2)">${v}%</b></div>
      <div style="height:5px;background:var(--line);border-radius:3px">
        <div style="height:5px;width:${v}%;background:var(--brand-2);border-radius:3px"></div></div></div>`).join("");
}

function verDocs() {
  openM(`<h2>Mis documentos</h2><div class="sub">Archivos que has enviado a tus asesores</div>
    <div class="alert alert-info"><span>🔒</span><span>Tus documentos solo son visibles para el asesor asignado a tu caso.</span></div>
    <p style="font-size:13.5px;color:var(--muted);margin-top:16px">Abre cualquier solicitud desde <b>Mis solicitudes</b> para ver y enviar documentos en el chat.</p>
    <button class="btn btn-primary btn-block" style="margin-top:18px" onclick="closeM();misSolicitudes()">Ir a mis solicitudes</button>`);
}

function ayuda() {
  openM(`<h2>¿Cómo funciona ContiGO?</h2>
    <div style="display:flex;flex-direction:column;gap:18px;margin-top:20px">
      ${[["1", "Describe tu trámite", "Elige un profesional o pide asesoría general. Cuéntanos tu caso en tus palabras."],
         ["2", "Recibe respuesta", "Un asesor verificado revisa tu solicitud y te contacta por el chat."],
         ["3", "Envía tus documentos", "Tu asesor te dice exactamente qué necesita. Los subes desde el chat."],
         ["4", "Trámite resuelto", "El profesional gestiona todo y te mantiene informado hasta finalizar."]
        ].map(([n, t, d]) => `
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--brand-2);color:#fff;
                display:grid;place-items:center;font-weight:700;flex-shrink:0;font-family:'Sora',sans-serif">${n}</div>
          <div><b style="font-size:14px">${t}</b>
            <p style="font-size:13px;color:var(--muted);margin-top:3px;line-height:1.5">${d}</p></div>
        </div>`).join("")}
    </div>
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="closeM();solicitar()">Empezar ahora</button>`);
}
