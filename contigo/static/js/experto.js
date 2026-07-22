/* ============================================================
   ContiGO — Panel del profesional
   ============================================================ */
let ME = null, SOLS = [], FILT = "todas", ACT = null;
let lastNew = 0, msgCount = -1, firstLoad = true;

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
  setInterval(loadSols, 3000);
  setInterval(() => { if (ACT) loadThread(false); }, 3000);
});

/* ---------- TABS ---------- */
function tab(name, btn) {
  ["sol", "serv", "perf"].forEach(p =>
    document.getElementById("pane-" + p).style.display = p === name ? "" : "none");
  document.querySelectorAll(".exp-tab").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  track("tab_experto", name);
}

/* ---------- CARGA DE SOLICITUDES (polling) ---------- */
async function loadSols() {
  try {
    const r = await fetch("/api/solicitudes");
    SOLS = await r.json();

    const nuevas = SOLS.filter(s => s.estado === "nueva").length;
    const sinLeer = SOLS.reduce((a, s) => a + (s.no_leidos || 0), 0);

    if (!firstLoad && (nuevas > lastNew)) {
      toast("🔔 Nueva solicitud recibida");
      beep();
      flashTitle();
    }
    lastNew = nuevas; firstLoad = false;

    renderList();
    updateKPIs();

    const tc = document.getElementById("tabCnt");
    const pend = nuevas + sinLeer;
    tc.textContent = pend; tc.style.display = pend ? "" : "none";
  } catch (e) {
    document.getElementById("liveBadge").className = "badge b-new";
    document.getElementById("liveBadge").innerHTML = "⚠️ Sin conexión";
  }
}

function flashTitle() {
  let n = 0;
  const orig = document.title;
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
  document.getElementById("statAt").textContent = at;
  document.getElementById("statDoc").textContent = docs;
  document.getElementById("statResp").textContent = SOLS.length ? Math.round(at / SOLS.length * 100) + "%" : "—";
}

/* ---------- LISTA ---------- */
function filt(f, btn) {
  FILT = f;
  document.querySelectorAll(".fbtn").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  renderList();
}

function renderList() {
  const el = document.getElementById("solList");
  const list = FILT === "todas" ? SOLS : SOLS.filter(s => s.estado === FILT);

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:36px 18px">
      <div class="empty-ic"><svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.8" viewBox="0 0 24 24">
        <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/></svg></div>
      <b>${FILT === "todas" ? "Esperando solicitudes" : "Nada por aquí"}</b>
      <p style="font-size:12.5px">${FILT === "todas" ? "Las solicitudes aparecerán automáticamente." : "Cambia el filtro para ver otras."}</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(s => {
    const urg = s.urgencia === "urgente" ? '<span class="badge b-new" style="font-size:10px;padding:2px 7px">Urgente</span>' :
                s.urgencia === "pronto" ? '<span class="badge b-work" style="font-size:10px;padding:2px 7px">Pronto</span>' : "";
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
        <span style="margin-left:auto">${esc((s.profesional_solicitado || "").split("·")[0])}</span>
      </div>
    </div>`;
  }).join("");
}

/* ---------- HILO / CHAT ---------- */
function openThread(id) {
  ACT = id; msgCount = -1;
  renderList();
  loadThread(true);
}

async function loadThread(scroll) {
  if (!ACT) return;
  try {
    const r = await fetch(`/api/solicitud/${ACT}/mensajes?marcar=experto`);
    const d = await r.json();
    const s = d.solicitud;
    if (!s) return;

    const th = document.getElementById("thread");
    if (msgCount === -1) {
      const badge = s.estado === "nueva" ? ["b-new", "Sin atender"] :
                    s.estado === "atendiendo" ? ["b-work", "En proceso"] : ["b-done", "Completada"];
      th.innerHTML = `
        <div class="th-head">
          <div class="avatar av-sm" style="background:${avColor(s.nombre)}">${initials(s.nombre)}</div>
          <div class="th-info">
            <div class="th-nm">${esc(s.nombre)}</div>
            <div class="th-mt">${esc(s.tipo)} · ${esc(s.correo || "sin correo")} · #${s.id}</div>
          </div>
          <span class="badge ${badge[0]}" id="thBadge">${badge[1]}</span>
          <div class="th-acts">
            <button class="btn btn-ghost btn-sm" onclick="pedirDocs()">📎 Pedir documentos</button>
            <button class="btn btn-ok btn-sm" onclick="marcar('completada')">✓ Completar</button>
          </div>
        </div>
        <div class="th-body" id="thBody"></div>
        <div class="th-bar">
          <textarea id="thIn" rows="1" placeholder="Escribe tu respuesta…"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendExp()}"></textarea>
          <button class="btn btn-primary" onclick="sendExp()" style="padding:11px 16px">
            <svg width="17" height="17" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
          </button>
        </div>`;
    }

    if (d.mensajes.length !== msgCount) {
      msgCount = d.mensajes.length;
      document.getElementById("thBody").innerHTML = d.mensajes.map(m => {
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
        return `<div class="bubble ${m.autor === "experto" ? "bb-me" : "bb-them"}">${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
      }).join("");
      if (scroll !== false) {
        const b = document.getElementById("thBody");
        b.scrollTop = b.scrollHeight;
      }
    }
  } catch (e) { }
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
  track("experto_respondio");
  msgCount = -1; loadThread(true); loadSols();
}

async function marcar(estado) {
  if (!ACT) return;
  await fetch(`/api/solicitud/${ACT}/estado`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
  toast(estado === "completada" ? "✓ Solicitud completada" : "Estado actualizado");
  track("estado_cambiado", estado);
  msgCount = -1; loadThread(false); loadSols();
}

/* ---------- PEDIR DOCUMENTOS ---------- */
let picked = new Set();

function pedirDocs() {
  if (!ACT) return toast("Selecciona una solicitud");
  picked.clear();
  track("abre_pedir_docs");
  openM(`
    <h2>Solicitar documentos</h2>
    <div class="sub">El usuario los verá destacados en su chat y podrá subirlos ahí mismo.</div>
    <label style="margin-top:0">Documentos frecuentes</label>
    <div class="doc-chips" id="chips">
      ${DOCS_FRECUENTES.map(d => `<button class="dchip" onclick="tog(this,'${esc(d)}')">${esc(d)}</button>`).join("")}
    </div>
    <label>Otros documentos (uno por línea)</label>
    <textarea id="dExtra" placeholder="Ej: Copia del contrato de arriendo&#10;Certificado laboral"></textarea>
    <label>Nota adicional (opcional)</label>
    <input type="text" id="dNota" placeholder="Ej: Envíalos antes del viernes por favor">
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
  closeM();
  toast("📎 Documentos solicitados");
  track("docs_solicitados", docs.length + " docs");
  msgCount = -1; loadThread(true); loadSols();
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
  l.push({
    id: Date.now(), tit, desc,
    cat: document.getElementById("nCat").value,
    p: document.getElementById("nP").value,
    t: document.getElementById("nT").value.trim()
  });
  setServ(l); closeM(); renderServicios();
  toast("✓ Servicio publicado");
  track("servicio_publicado", tit);
}

function delServ(id) {
  setServ(getServ().filter(s => s.id !== id));
  renderServicios();
  toast("Servicio eliminado");
}
