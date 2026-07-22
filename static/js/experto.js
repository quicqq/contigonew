/* ============================================================
   ContiGO — Panel del profesional (v3)
   ============================================================ */
let ME = null, SOLS = [], OPEN = [], FILT = "todas", ACT = null;
let lastNew = 0, firstLoad = true;
let renderedMsgIds = [], headBuilt = false;

const FASE_LABELS = {
  cotizacion: "Cotización", acuerdo: "Acuerdo propuesto", anticipo: "Esperando anticipo",
  en_curso: "En curso", entregado: "Entregado — esperando confirmación", completado: "Completado"
};

document.addEventListener("DOMContentLoaded", () => {
  ME = requireAuth("experto");
  if (!ME) return;

  const ini = initials(ME.nombre), col = avColor(ME.nombre);
  ["eAv", "pAv"].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = ini; el.style.background = col;
  });
  document.getElementById("eName").textContent = ME.nombre.split(" ")[0];
  document.getElementById("pName").textContent = ME.nombre;
  document.getElementById("pProf").textContent = ME.profesion || "Profesional";
  document.getElementById("fNom").value = ME.nombre;
  document.getElementById("fProf").value = ME.profesion || "—";
  document.getElementById("fMail").value = ME.correo || "—";
  document.getElementById("fUsr").value = ME.username || "—";

  renderServicios();
  loadSols();
  loadOpen();
  setInterval(loadSols, 3000);
  setInterval(loadOpen, 4000);
  setInterval(() => { if (ACT) loadThread(); }, 3000);
});

/* ---------- TABS ---------- */
function tab(name, btn) {
  ["sol", "open", "serv", "wallet", "perf"].forEach(p =>
    document.getElementById("pane-" + p).style.display = p === name ? "" : "none");
  document.querySelectorAll(".exp-tab").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  if (name === "wallet") loadWallet();
  if (name === "open") loadOpen();
  track("tab_experto", name);
}

/* ---------- SOLICITUDES ASIGNADAS ---------- */
async function loadSols() {
  try {
    const r = await fetch(`/api/solicitudes?username=${encodeURIComponent(ME.username)}`);
    SOLS = await r.json();
    const nuevas = SOLS.filter(s => s.estado === "nueva").length;
    const sinLeer = SOLS.reduce((a, s) => a + (s.no_leidos || 0), 0);
    if (!firstLoad && nuevas > lastNew) { toast("🔔 Nueva solicitud"); beep(); flashTitle(); }
    lastNew = nuevas; firstLoad = false;
    renderList(); updateKPIs();
    const tc = document.getElementById("tabCnt");
    const pend = nuevas + sinLeer;
    tc.textContent = pend; tc.style.display = pend ? "" : "none";
  } catch (e) {
    const b = document.getElementById("liveBadge");
    b.className = "badge b-new"; b.innerHTML = "⚠️ Sin conexión";
  }
}

function flashTitle() {
  let n = 0; const orig = document.title;
  const t = setInterval(() => {
    document.title = (n % 2 ? "🔔 ¡Nueva solicitud!" : orig);
    if (++n > 6) { clearInterval(t); document.title = orig; }
  }, 700);
}

function updateKPIs() {
  document.getElementById("kTot").textContent = SOLS.length;
  document.getElementById("kNew").textContent = SOLS.filter(s => s.estado === "nueva").length;
  document.getElementById("kWork").textContent = SOLS.filter(s => s.estado === "atendiendo").length;
  document.getElementById("kDone").textContent = SOLS.filter(s => s.estado === "completada").length;
  const at = SOLS.filter(s => s.estado !== "nueva").length;
  const docs = SOLS.reduce((a, s) => a + (s.archivos || 0), 0);
  const gan = SOLS.filter(s => s.fase === "completado").reduce((a, s) => a + (s.precio || 0), 0);
  document.getElementById("statAt").textContent = at;
  document.getElementById("statDoc").textContent = docs;
  document.getElementById("statResp").textContent = SOLS.length ? Math.round(at / SOLS.length * 100) + "%" : "—";
  const g = document.getElementById("statGan");
  if (g) g.textContent = "$" + gan.toFixed(2);
}

/* ---------- BANDEJA SIN ASIGNAR ---------- */
async function loadOpen() {
  try {
    const r = await fetch("/api/solicitudes/sin-asignar");
    OPEN = await r.json();
    const tb = document.getElementById("tabOpen");
    tb.textContent = OPEN.length; tb.style.display = OPEN.length ? "" : "none";
    document.getElementById("openCount").textContent = OPEN.length + " disponible" + (OPEN.length !== 1 ? "s" : "");
    renderOpen();
  } catch (e) { }
}

function renderOpen() {
  const el = document.getElementById("openList");
  if (!el) return;
  if (!OPEN.length) {
    el.innerHTML = `<div class="empty" style="padding:44px 20px">
      <div class="empty-ic"><svg width="26" height="26" fill="none" stroke="#94a3b8" stroke-width="1.7" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></div>
      <b>No hay trámites abiertos</b>
      <p>Cuando alguien pida ayuda sin elegir a un profesional, aparecerá aquí para que lo tomes.</p>
    </div>`;
    return;
  }
  el.innerHTML = OPEN.map(s => {
    const urg = s.urgencia === "urgente" ? '<span class="badge b-new">Urgente</span>' :
                s.urgencia === "pronto" ? '<span class="badge b-work">Pronto</span>' : '<span class="badge b-info">Normal</span>';
    return `<div class="card" style="padding:18px;display:flex;gap:16px;align-items:center">
      <div class="avatar av-md" style="background:${avColor(s.nombre)};border-radius:13px">${initials(s.nombre)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:9px;align-items:center;margin-bottom:4px;flex-wrap:wrap">
          <b style="font-size:14.5px">${esc(s.tipo)}</b>${urg}
          <span style="font-size:11.5px;color:var(--muted)">${timeAgo(s.created_at)}</span>
        </div>
        <div style="font-size:13px;color:var(--muted);line-height:1.5">${esc(s.descripcion)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:5px">Solicitado por ${esc(s.nombre)}</div>
      </div>
      <button class="btn btn-primary" onclick="tomar(${s.id})" data-track="click_tomar">
        <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        Tomar
      </button>
    </div>`;
  }).join("");
}

async function tomar(sid) {
  try {
    const r = await fetch(`/api/solicitud/${sid}/tomar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: ME.username, nombre: ME.nombre })
    });
    const d = await r.json();
    if (!d.ok) { toast(d.error || "No se pudo tomar"); loadOpen(); return; }
    toast("✓ Trámite tomado — ya está en tus solicitudes");
    track("tramite_tomado", String(sid));
    loadOpen(); await loadSols();
    document.querySelector(".exp-tab").click();  // vuelve a la pestaña Solicitudes
    openThread(sid);
  } catch (e) { toast("Sin conexión"); }
}

/* ---------- BILLETERA ---------- */
async function loadWallet() {
  try {
    const r = await fetch(`/api/billetera?username=${encodeURIComponent(ME.username)}`);
    const d = await r.json();
    document.getElementById("wBalance").textContent = "$" + Number(d.saldo || 0).toFixed(2);
    const el = document.getElementById("wMovs");
    if (!d.movimientos.length) {
      el.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:10px 0">Aún no hay movimientos.</p>`;
      return;
    }
    el.innerHTML = d.movimientos.map(m => movRow(m)).join("");
  } catch (e) { }
}

function movRow(m) {
  const pos = m.monto >= 0;
  const ic = { deposito: "⬇️", retencion: "🔒", pago: "➖", ingreso: "💰", reembolso: "↩️" }[m.tipo] || "•";
  return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
    <div style="width:34px;height:34px;border-radius:9px;background:var(--bg);display:grid;place-items:center;font-size:15px">${ic}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13.5px;font-weight:500">${esc(m.concepto || m.tipo)}</div>
      <div style="font-size:11.5px;color:var(--muted)">${timeAgo(m.created_at)}</div>
    </div>
    <b style="font-family:'Sora',sans-serif;font-size:14.5px;color:${pos ? "var(--ok)" : "var(--ink-2)"}">${pos ? "+" : ""}$${Math.abs(m.monto).toFixed(2)}</b>
  </div>`;
}

/* ---------- LISTA ASIGNADAS ---------- */
function filt(f, btn) {
  FILT = f;
  document.querySelectorAll(".fbtn").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  renderList();
}

function faseChip(fase, mini) {
  const map = {
    cotizacion: "b-info", acuerdo: "b-work", anticipo: "b-work",
    en_curso: "b-work", entregado: "b-info", completado: "b-done"
  };
  if (!fase) return "";
  return `<span class="badge ${map[fase] || "b-info"}" style="${mini ? "font-size:10px;padding:2px 7px" : ""}">${FASE_LABELS[fase] || fase}</span>`;
}

function renderList() {
  const el = document.getElementById("solList");
  const list = FILT === "todas" ? SOLS : SOLS.filter(s => s.estado === FILT);
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:36px 18px">
      <div class="empty-ic"><svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.8" viewBox="0 0 24 24">
        <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/></svg></div>
      <b>${FILT === "todas" ? "Esperando solicitudes" : "Nada por aquí"}</b>
      <p style="font-size:12.5px">${FILT === "todas" ? "Aparecerán automáticamente." : "Cambia el filtro."}</p>
    </div>`;
    return;
  }
  el.innerHTML = list.map(s => {
    const urg = s.urgencia === "urgente" ? '<span class="badge b-new" style="font-size:10px;padding:2px 7px">Urgente</span>' : "";
    return `<div class="sol ${s.estado} ${ACT === s.id ? "on" : ""}" onclick="openThread(${s.id})">
      <div class="sol-hd">
        <div class="avatar av-sm" style="background:${avColor(s.nombre)};width:32px;height:32px;font-size:12px">${initials(s.nombre)}</div>
        <div style="flex:1;min-width:0">
          <div class="sol-nm">${esc(s.nombre)}</div>
          <div class="sol-tm">${timeAgo(s.created_at)}</div>
        </div>
        ${s.no_leidos ? `<span class="sol-unread">${s.no_leidos}</span>` : ""}
      </div>
      <div class="sol-tp">${esc(s.tipo)} ${urg}</div>
      <div class="sol-dc">${esc(s.descripcion)}</div>
      <div class="sol-meta">
        <span>💬 ${s.total_msgs || 0}</span>
        ${s.archivos ? `<span>📎 ${s.archivos}</span>` : ""}
        <span style="margin-left:auto">${faseChip(s.fase, true)}</span>
      </div>
    </div>`;
  }).join("");
}

/* ---------- HILO / CHAT (incremental, sin parpadeo) ---------- */
function openThread(id) {
  ACT = id; headBuilt = false; renderedMsgIds = [];
  renderList(); loadThread();
}

async function loadThread() {
  if (!ACT) return;
  try {
    const r = await fetch(`/api/solicitud/${ACT}/mensajes?marcar=experto`);
    const d = await r.json();
    const s = d.solicitud;
    if (!s) return;
    if (!headBuilt) { buildThreadShell(s); headBuilt = true; }
    else { refreshThreadHead(s); }

    const body = document.getElementById("thBody");
    if (!body) return;
    const nuevos = d.mensajes.filter(m => !renderedMsgIds.includes(m.id));
    if (nuevos.length) {
      const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 120;
      nuevos.forEach(m => { body.insertAdjacentHTML("beforeend", bubbleHTML(m)); renderedMsgIds.push(m.id); });
      if (nearBottom) body.scrollTop = body.scrollHeight;
    }
  } catch (e) { }
}

function faseActions(s) {
  // Botones que cambian según la fase del trámite
  const f = s.fase || "cotizacion";
  if (f === "cotizacion")
    return `<button class="btn btn-primary btn-sm" onclick="acordar()">💵 Proponer acuerdo</button>`;
  if (f === "acuerdo")
    return `<span style="font-size:12px;color:var(--muted)">Esperando que el cliente pague el anticipo…</span>`;
  if (f === "en_curso")
    return `<button class="btn btn-primary btn-sm" onclick="entregar()">📦 Entregar trámite</button>`;
  if (f === "entregado")
    return `<span style="font-size:12px;color:var(--brand-2);margin-right:8px">Entregado. Esperando confirmación.</span>
            <button class="btn btn-ghost btn-sm" onclick="entregar()">✏️ Corregir entrega</button>`;
  if (f === "completado")
    return `<span class="badge b-done">✓ Completado y cobrado</span>`;
  return "";
}

function buildThreadShell(s) {
  const th = document.getElementById("thread");
  th.innerHTML = `
    <div class="th-head" style="flex-direction:column;align-items:stretch;gap:12px">
      <div style="display:flex;align-items:center;gap:13px">
        <div class="avatar av-sm" style="background:${avColor(s.nombre)}">${initials(s.nombre)}</div>
        <div class="th-info">
          <div class="th-nm">${esc(s.nombre)}</div>
          <div class="th-mt">${esc(s.tipo)} · #${s.id}</div>
        </div>
        <span id="thFase"></span>
      </div>
      <div id="phaseTracker"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center" id="thActs">
        <button class="btn btn-ghost btn-sm" onclick="pedirDocs()">📎 Pedir documentos</button>
        <span id="faseBtns"></span>
      </div>
      <div id="expDocPanel"></div>
    </div>
    <div class="th-body" id="thBody"></div>
    <div class="th-bar">
      <button class="btn btn-ghost" onclick="document.getElementById('expFile').click()" style="padding:11px 13px" title="Adjuntar archivo">
        <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.4 11.05l-9.2 9.2a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.3-2.3l8.5-8.5"/></svg>
      </button>
      <input type="file" id="expFile" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp,.heic" onchange="expUpFile(this)">
      <textarea id="thIn" rows="1" placeholder="Escribe tu respuesta…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendExp()}"></textarea>
      <button class="btn btn-primary" onclick="sendExp()" style="padding:11px 16px">
        <svg width="17" height="17" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
      </button>
    </div>`;
  refreshThreadHead(s);
  loadExpDocs();
}

/* ---------- Panel de documentos del experto (revisar/aprobar/rechazar) ---------- */
async function loadExpDocs() {
  if (!ACT) return;
  const el = document.getElementById("expDocPanel");
  if (!el) return;
  try {
    const docs = await (await fetch(`/api/solicitud/${ACT}/documentos`)).json();
    if (!docs.length) { el.innerHTML = ""; return; }
    const aprob = docs.filter(d => d.estado === "aprobado").length;
    el.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="font-size:12.5px">📋 Documentos (${aprob}/${docs.length} aprobados)</b>
        </div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${docs.map(d => expDocRow(d)).join("")}
        </div>
      </div>`;
  } catch (e) { }
}

function expDocRow(d) {
  const badge = {
    pendiente: '<span class="badge b-info" style="font-size:10px;padding:2px 7px">Pendiente</span>',
    enviado: '<span class="badge b-work" style="font-size:10px;padding:2px 7px">Por revisar</span>',
    aprobado: '<span class="badge b-done" style="font-size:10px;padding:2px 7px">✓ Aprobado</span>',
    rechazado: '<span class="badge b-new" style="font-size:10px;padding:2px 7px">Rechazado</span>'
  }[d.estado] || "";
  let acciones = "";
  if (d.estado === "enviado") {
    acciones = `
      <a class="dl" href="/uploads/${encodeURIComponent(d.archivo_path)}" target="_blank" download style="padding:5px 10px;font-size:11.5px">⬇ Ver</a>
      <button class="btn btn-ok btn-sm" style="padding:5px 11px;font-size:11.5px" onclick="aprobarDoc(${d.id})">Aprobar</button>
      <button class="btn btn-ghost btn-sm" style="padding:5px 11px;font-size:11.5px;color:var(--dang);border-color:#fecaca" onclick="rechazarDoc(${d.id})">Rechazar</button>`;
  } else if (d.estado === "aprobado" && d.archivo_path) {
    acciones = `<a class="dl" href="/uploads/${encodeURIComponent(d.archivo_path)}" target="_blank" download style="padding:5px 10px;font-size:11.5px">⬇ Ver</a>`;
  }
  return `<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid var(--line)">
    <span style="font-size:13px;flex:1;min-width:120px">${esc(d.nombre)}</span>
    ${badge}
    ${acciones}
  </div>`;
}

async function aprobarDoc(did) {
  await fetch(`/api/documento/${did}/aprobar`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor_nombre: ME.nombre })
  });
  toast("✓ Documento aprobado");
  loadExpDocs(); loadThread();
}

function rechazarDoc(did) {
  openM(`
    <h2>Rechazar documento</h2>
    <div class="sub">Se le pedirá al cliente que lo envíe de nuevo. Cuéntale por qué.</div>
    <label style="margin-top:0">Motivo del rechazo</label>
    <input type="text" id="rejMotivo" placeholder="Ej: La foto está borrosa / no es el documento correcto">
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-ghost" style="flex:1" onclick="closeM()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="doRechazar(${did})">Rechazar y pedir de nuevo</button>
    </div>`);
}
async function doRechazar(did) {
  const motivo = document.getElementById("rejMotivo").value.trim();
  await fetch(`/api/documento/${did}/rechazar`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo, autor_nombre: ME.nombre })
  });
  closeM(); toast("Documento rechazado — se pidió de nuevo");
  loadExpDocs(); loadThread();
}

async function expUpFile(inp) {
  if (!inp.files?.[0] || !ACT) return;
  const fd = new FormData();
  fd.append("archivo", inp.files[0]);
  fd.append("autor", "experto");
  fd.append("autor_nombre", ME.nombre);
  try {
    const r = await fetch(`/api/solicitud/${ACT}/subir`, { method: "POST", body: fd });
    const d = await r.json();
    if (d.ok) { toast("📎 Archivo enviado"); loadThread(); }
    else toast(d.error || "Error al subir");
  } catch (e) { toast("Sin conexión"); }
  inp.value = "";
}

function refreshThreadHead(s) {
  const f = document.getElementById("thFase");
  if (f) f.innerHTML = faseChip(s.fase, false);
  const b = document.getElementById("faseBtns");
  if (b) b.innerHTML = faseActions(s);
  const pt = document.getElementById("phaseTracker");
  if (pt) pt.innerHTML = phaseTrackerHTML(s.fase);
  loadExpDocs();
}

function phaseTrackerHTML(fase) {
  const steps = [
    ["cotizacion", "Chat"], ["acuerdo", "Acuerdo"], ["en_curso", "Anticipo"],
    ["entregado", "Entrega"], ["completado", "Pago"]
  ];
  const order = ["cotizacion", "acuerdo", "en_curso", "entregado", "completado"];
  const cur = order.indexOf(fase === "anticipo" ? "acuerdo" : fase);
  return `<div style="display:flex;align-items:center;gap:0;font-size:10.5px">
    ${steps.map(([k, lbl], i) => {
      const done = i < cur, active = i === cur;
      const bg = done ? "var(--ok)" : active ? "var(--brand-2)" : "var(--line)";
      const tc = done || active ? "var(--ink)" : "var(--muted)";
      return `<div style="display:flex;align-items:center;${i < steps.length - 1 ? "flex:1" : ""}">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:22px;height:22px;border-radius:50%;background:${bg};color:#fff;display:grid;place-items:center;font-weight:700;font-size:11px">${done ? "✓" : i + 1}</div>
          <span style="color:${tc};font-weight:${active ? 600 : 400};white-space:nowrap">${lbl}</span>
        </div>
        ${i < steps.length - 1 ? `<div style="flex:1;height:2px;background:${done ? "var(--ok)" : "var(--line)"};margin:0 4px;margin-bottom:16px"></div>` : ""}
      </div>`;
    }).join("")}
  </div>`;
}

function bubbleHTML(m) {
  if (m.tipo === "peticion_archivo")
    return `<div class="bubble bb-ask" style="align-self:flex-end">📎 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "archivo")
    return `<div class="bubble bb-file" style="align-self:flex-start">
      <div style="font-weight:600">📄 ${esc(m.autor_nombre)} envió un documento</div>
      <a class="dl" href="/uploads/${encodeURIComponent(m.archivo_path)}" target="_blank" download>
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
        ${esc(m.archivo_nombre)}</a>
      <div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "acuerdo")
    return `<div class="bubble" style="align-self:flex-end;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;white-space:pre-line">🤝 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "entrega")
    return `<div class="bubble" style="align-self:flex-end;background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6">📦 ${esc(m.texto)}${m.archivo_path ? `<a class="dl" href="/uploads/${encodeURIComponent(m.archivo_path)}" target="_blank" download style="color:#7c3aed;border-color:#ddd6fe">⬇ ${esc(m.archivo_nombre)}</a>` : ""}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "pago_hecho" || m.tipo === "pago_liberado")
    return `<div class="bubble" style="align-self:flex-start;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46">✅ ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  return `<div class="bubble ${m.autor === "experto" ? "bb-me" : "bb-them"}">${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
}

async function sendExp() {
  const i = document.getElementById("thIn");
  const t = i.value.trim();
  if (!t || !ACT) return;
  i.value = "";
  await fetch(`/api/solicitud/${ACT}/mensaje`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autor: "experto", autor_nombre: ME.nombre, texto: t })
  });
  loadThread(); loadSols();
}

/* ---------- FASE 2: ACORDAR (precio + anticipo ≤50%) ---------- */
function acordar() {
  if (!ACT) return toast("Selecciona una solicitud");
  const s = SOLS.find(x => x.id === ACT);
  track("abre_acordar");
  openM(`
    <h2>🤝 Proponer acuerdo</h2>
    <div class="sub">Fija el precio total y el anticipo. El anticipo no puede pasar del 50% y queda retenido por ContiGO hasta que entregues.</div>
    <label style="margin-top:0">Precio total del servicio (USD)</label>
    <input type="number" id="acPrecio" min="1" step="0.01" placeholder="Ej: 40" oninput="calcAnticipo()" style="font-size:18px;font-weight:700">
    <label>Anticipo para iniciar (máx. 50%)</label>
    <input type="number" id="acAnticipo" min="0" step="0.01" placeholder="Ej: 20" oninput="checkAnticipo()">
    <div id="acHint" style="font-size:12px;color:var(--muted);margin-top:6px"></div>
    <div class="alert alert-info" style="margin-top:14px">
      <span>🔒</span><span>Modelo protegido: el cliente paga el anticipo con confianza (no lo recibes hasta entregar) y tú trabajas con la seguridad de que ya se comprometió.</span></div>
    <button class="btn btn-primary btn-block btn-lg" id="acBtn" style="margin-top:20px" onclick="enviarAcuerdo()">Enviar propuesta</button>`);
}
function calcAnticipo() {
  const p = parseFloat(document.getElementById("acPrecio").value) || 0;
  const a = document.getElementById("acAnticipo");
  if (p > 0 && !a.value) a.value = (p / 2).toFixed(2);  // sugiere 50%
  checkAnticipo();
}
function checkAnticipo() {
  const p = parseFloat(document.getElementById("acPrecio").value) || 0;
  const a = parseFloat(document.getElementById("acAnticipo").value) || 0;
  const hint = document.getElementById("acHint");
  const btn = document.getElementById("acBtn");
  if (a > p * 0.5 + 0.001) {
    hint.innerHTML = `⚠️ El anticipo (${a.toFixed(2)}) supera el 50% permitido ($${(p * 0.5).toFixed(2)})`;
    hint.style.color = "var(--dang)"; btn.disabled = true;
  } else if (p > 0) {
    hint.innerHTML = `Saldo al entregar: $${(p - a).toFixed(2)}`;
    hint.style.color = "var(--muted)"; btn.disabled = false;
  }
}
async function enviarAcuerdo() {
  const precio = parseFloat(document.getElementById("acPrecio").value);
  const anticipo = parseFloat(document.getElementById("acAnticipo").value) || 0;
  if (!precio || precio <= 0) return toast("Indica el precio total");
  if (anticipo > precio * 0.5 + 0.001) return toast("El anticipo no puede pasar del 50%");
  await fetch(`/api/solicitud/${ACT}/acordar`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ precio, anticipo, autor_nombre: ME.nombre })
  });
  closeM(); toast("🤝 Propuesta enviada");
  track("acuerdo_enviado", "$" + precio);
  loadThread(); loadSols();
}

/* ---------- FASE 4→5: ENTREGAR (comprobante) ---------- */
function entregar() {
  if (!ACT) return toast("Selecciona una solicitud");
  const s = SOLS.find(x => x.id === ACT);
  const corr = s && s.fase === "entregado";
  track("abre_entregar");
  openM(`
    <h2>${corr ? "✏️ Corregir entrega" : "📦 Entregar trámite"}</h2>
    <div class="sub">${corr
      ? "Reemplaza el comprobante anterior. El cliente verá la nueva versión y podrá confirmar."
      : "Sube el comprobante de que completaste el trámite. El cliente lo revisa y confirma para liberar tu pago."}</div>
    ${corr ? `<div class="alert alert-info" style="margin:0 0 14px"><span>ℹ️</span><span>Puedes corregir mientras el cliente no haya liberado el pago (p. ej. si olvidaste adjuntar algo).</span></div>` : ""}
    <label style="margin-top:0">Nota de entrega</label>
    <textarea id="enNota" placeholder="Ej: Trámite completado. Adjunto el documento final y el número de gestión #123456."></textarea>
    <label>Comprobante (documento resuelto, foto, captura)</label>
    <button class="file-btn" onclick="document.getElementById('enFile').click()">
      <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
      <span id="enFileName">Seleccionar archivo</span>
    </button>
    <input type="file" id="enFile" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp,.heic"
           onchange="document.getElementById('enFileName').textContent=this.files[0]?.name||'Seleccionar archivo'">
    <div class="alert alert-info" style="margin-top:14px"><span>🔒</span><span>El pago se libera solo cuando el cliente confirma que recibió el trámite. Así ninguno queda expuesto.</span></div>
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="enviarEntrega()">${corr ? "Enviar corrección" : "Marcar como entregado"}</button>`);
}
async function enviarEntrega() {
  const nota = document.getElementById("enNota").value.trim();
  const file = document.getElementById("enFile").files[0];
  if (!nota && !file) return toast("Agrega una nota o un archivo");
  const fd = new FormData();
  fd.append("nota", nota);
  fd.append("autor_nombre", ME.nombre);
  if (file) fd.append("archivo", file);
  const r = await fetch(`/api/solicitud/${ACT}/entregar`, { method: "POST", body: fd });
  const d = await r.json();
  if (!d.ok) return toast(d.error || "No se pudo entregar");
  closeM(); toast(d.correccion ? "✏️ Entrega corregida" : "📦 Trámite entregado — esperando confirmación");
  track("tramite_entregado");
  loadThread(); loadSols();
}

/* ---------- PEDIR DOCUMENTOS ---------- */
let picked = new Set();
function pedirDocs() {
  if (!ACT) return toast("Selecciona una solicitud");
  picked.clear();
  openM(`
    <h2>Solicitar documentos</h2>
    <div class="sub">El usuario los verá en su chat y podrá subirlos ahí mismo.</div>
    <label style="margin-top:0">Documentos frecuentes</label>
    <div class="doc-chips" id="chips">
      ${DOCS_FRECUENTES.map(dd => `<button class="dchip" onclick="tog(this,'${esc(dd)}')">${esc(dd)}</button>`).join("")}
    </div>
    <label>Otros documentos (uno por línea)</label>
    <textarea id="dExtra" placeholder="Ej: Copia del contrato&#10;Certificado laboral"></textarea>
    <label>Nota adicional (opcional)</label>
    <input type="text" id="dNota" placeholder="Ej: Envíalos antes del viernes">
    <div style="display:flex;gap:10px;margin-top:22px">
      <button class="btn btn-ghost" style="flex:1" onclick="closeM()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="enviarDocs()">Enviar solicitud</button>
    </div>`);
}
function tog(el, doc) {
  if (picked.has(doc)) { picked.delete(doc); el.classList.remove("on"); }
  else { picked.add(doc); el.classList.add("on"); }
}
async function enviarDocs() {
  const extra = document.getElementById("dExtra").value.split("\n").map(x => x.trim()).filter(Boolean);
  const docs = [...picked, ...extra];
  if (!docs.length) return toast("Selecciona o escribe al menos un documento");
  await fetch(`/api/solicitud/${ACT}/pedir-documentos`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentos: docs, nota: document.getElementById("dNota").value.trim(), autor_nombre: ME.nombre })
  });
  closeM(); toast("📎 Documentos solicitados");
  loadThread(); loadSols();
}

/* ---------- SERVICIOS ---------- */
function getServ() { try { return JSON.parse(localStorage.getItem("cg_serv") || "[]"); } catch (e) { return []; } }
function setServ(l) { localStorage.setItem("cg_serv", JSON.stringify(l)); }
function renderServicios() {
  const g = document.getElementById("servGrid");
  const list = getServ();
  if (!list.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-ic"><svg width="26" height="26" fill="none" stroke="#94a3b8" stroke-width="1.8" viewBox="0 0 24 24">
        <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
      <b>Aún no publicas servicios</b>
      <p>Publica lo que ofreces para que los usuarios te encuentren.</p>
      <button class="btn btn-primary" style="margin-top:18px" onclick="nuevoServicio()">Publicar mi primer servicio</button>
    </div>`;
    return;
  }
  g.innerHTML = list.map(s => `
    <div class="pro">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
        <span class="tag">${esc(s.cat)}</span>
        <button onclick="delServ(${s.id})" style="color:var(--muted);font-size:16px;line-height:1">✕</button>
      </div>
      <div style="font-weight:700;font-size:15px">${esc(s.tit)}</div>
      <div class="pro-bio">${esc(s.desc)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--line);margin-top:auto">
        <span style="font-size:12px;color:var(--muted)">⏱ ${esc(s.t || "A convenir")}</span>
        <b style="font-family:'Sora',sans-serif;color:var(--brand-2);font-size:17px">${s.p ? "$" + s.p : "A convenir"}</b>
      </div>
    </div>`).join("");
}
function nuevoServicio() {
  openM(`
    <h2>Publicar un servicio</h2>
    <div class="sub">Así lo verán los usuarios que buscan ayuda.</div>
    <label style="margin-top:0">Título del servicio *</label>
    <input type="text" id="nTit" placeholder="Ej: Renovación de licencia de conducción">
    <label>Categoría</label>
    <select id="nCat">${TIPOS_TRAMITE.map(t => `<option>${t}</option>`).join("")}</select>
    <label>¿Qué incluye? *</label>
    <textarea id="nDesc" placeholder="Explica el alcance, qué gestionas tú y qué necesitas del cliente…"></textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><label>Precio (USD)</label><input type="number" id="nP" min="0" placeholder="25"></div>
      <div><label>Tiempo estimado</label><input type="text" id="nT" placeholder="2-3 días"></div>
    </div>
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:22px" onclick="saveServ()">Publicar servicio</button>`);
}
function saveServ() {
  const tit = document.getElementById("nTit").value.trim();
  const desc = document.getElementById("nDesc").value.trim();
  if (!tit || !desc) return toast("Completa título y descripción");
  const l = getServ();
  l.push({ id: Date.now(), tit, desc, cat: document.getElementById("nCat").value,
    p: document.getElementById("nP").value, t: document.getElementById("nT").value.trim() });
  setServ(l); closeM(); renderServicios();
  toast("✓ Servicio publicado");
}
function delServ(id) { setServ(getServ().filter(s => s.id !== id)); renderServicios(); toast("Servicio eliminado"); }
