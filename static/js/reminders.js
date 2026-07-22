// ================================================================
// RECORDATORIOS Y DOCUMENTOS — ContiGO
// ================================================================

const DEFAULT_DOCS = [
  { id: 1, label: "Cédula de identidad (ambas caras)", required: true,  checked: false },
  { id: 2, label: "Fotografía tamaño carné reciente",   required: true,  checked: false },
  { id: 3, label: "Formulario de solicitud descargado", required: true,  checked: false },
  { id: 4, label: "Comprobante de pago de tasas",       required: true,  checked: false },
  { id: 5, label: "Certificado médico (si aplica)",     required: false, checked: false },
  { id: 6, label: "Dirección domiciliaria actualizada", required: false, checked: false },
];

const DEFAULT_REMINDERS = [
  { id: 1, title: "Enviar documentos al experto", meta: "Trámite: Renovación de licencia", urgency: "urgent",   emoji: "📎", date: daysFromNow(1) },
  { id: 2, title: "Pago de tasas de tránsito",     meta: "Vence en Agencia de Tránsito",   urgency: "soon",    emoji: "💸", date: daysFromNow(3) },
  { id: 3, title: "Confirmar cita presencial",      meta: "Centro de atención CTE",          urgency: "soon",    emoji: "📅", date: daysFromNow(5) },
  { id: 4, title: "Revisar estado del trámite",     meta: "El experto enviará novedades",   urgency: "normal",  emoji: "🔍", date: daysFromNow(7) },
];

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

function getDocs()      { try { return JSON.parse(sessionStorage.getItem("contigo_docs")      || "null") || DEFAULT_DOCS.map(d=>({...d}));   } catch(e){ return DEFAULT_DOCS.map(d=>({...d})); } }
function getReminders() { try { return JSON.parse(sessionStorage.getItem("contigo_reminders") || "null") || DEFAULT_REMINDERS.map(r=>({...r})); } catch(e){ return DEFAULT_REMINDERS.map(r=>({...r})); } }
function saveDocs(list)      { sessionStorage.setItem("contigo_docs",      JSON.stringify(list)); }
function saveReminders(list) { sessionStorage.setItem("contigo_reminders", JSON.stringify(list)); }

// ----------------------------------------------------------------
// INICIALIZACIÓN
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  setTramiteDeadline();
  renderDocChecklist();
  renderReminderList();
  renderSideReminders();
});

function setTramiteDeadline() {
  const el = document.getElementById("tramiteDeadline");
  if (el) el.textContent = daysFromNow(7);
}

// ----------------------------------------------------------------
// CHECKLIST DE DOCUMENTOS
// ----------------------------------------------------------------
function renderDocChecklist() {
  const el = document.getElementById("docChecklist");
  if (!el) return;
  const docs = getDocs();
  const checked = docs.filter(d => d.checked).length;

  el.innerHTML = docs.map(d => `
    <div class="doc-item ${d.checked ? "checked" : ""}" onclick="toggleDoc(${d.id})">
      <div class="doc-checkbox">
        ${d.checked ? `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5"><path d="M2 6l3 3 5-5"/></svg>` : ""}
      </div>
      <span class="doc-label">${d.label}</span>
      <span class="doc-tag ${d.required ? "doc-required" : "doc-optional"}">${d.required ? "Requerido" : "Opcional"}</span>
    </div>
  `).join("");

  // Actualizar barra de progreso (solo los requeridos)
  const required = docs.filter(d => d.required);
  const checkedReq = required.filter(d => d.checked).length;
  const pct = required.length ? Math.round(checkedReq / required.length * 100) : 0;

  const prog = document.getElementById("docsProgress");
  if (prog) prog.textContent = `${checkedReq} / ${required.length}`;
  const fill = document.getElementById("docsFill");
  if (fill) fill.style.width = pct + "%";

  if (window.contigoTrack) window.contigoTrack("docs_progress", pct + "%");
}

function toggleDoc(id) {
  const docs = getDocs();
  const doc = docs.find(d => d.id === id);
  if (doc) {
    doc.checked = !doc.checked;
    saveDocs(docs);
    if (window.contigoTrack) window.contigoTrack("toggle_documento", doc.label + (doc.checked ? " ✓" : " ✗"));
    renderDocChecklist();
  }
}

// ----------------------------------------------------------------
// LISTA DE RECORDATORIOS
// ----------------------------------------------------------------
function renderReminderList() {
  const el = document.getElementById("reminderList");
  if (!el) return;
  const list = getReminders();
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="padding:16px 0;"><div style="font-size:24px;">✅</div>Sin recordatorios pendientes.</div>`;
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="reminder-item ${r.urgency}">
      <div class="reminder-icon" style="background:${urgencyBg(r.urgency)};">${r.emoji}</div>
      <div style="flex:1;">
        <div class="reminder-title">${r.title}</div>
        <div class="reminder-meta">${r.meta} · <b>${r.date}</b></div>
      </div>
      <div class="reminder-actions">
        <button class="reminder-btn" onclick="dismissReminder(${r.id})">Hecho</button>
        <button class="reminder-btn" onclick="snoozeReminder(${r.id})">+1 día</button>
      </div>
    </div>
  `).join("");
}

function urgencyBg(u) {
  return u === "urgent" ? "#fde8e8" : u === "soon" ? "#fff7e6" : "#eef0ff";
}

function dismissReminder(id) {
  const list = getReminders().filter(r => r.id !== id);
  saveReminders(list);
  if (window.contigoTrack) window.contigoTrack("recordatorio_hecho", String(id));
  renderReminderList();
  renderSideReminders();
  showToast("✅ Recordatorio marcado como listo");
}

function snoozeReminder(id) {
  const list = getReminders();
  const r = list.find(x => x.id === id);
  if (r) {
    // Sumar 1 día a la fecha actual del recordatorio
    const parts = r.date.split(" ");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    r.date = d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
    if (r.urgency === "urgent") r.urgency = "soon";
    saveReminders(list);
    renderReminderList();
    renderSideReminders();
    showToast("⏰ Recordatorio pospuesto 1 día");
  }
}

// ----------------------------------------------------------------
// SIDEBAR: próximos vencimientos (máx. 3)
// ----------------------------------------------------------------
function renderSideReminders() {
  const el = document.getElementById("sideReminders");
  if (!el) return;
  const list = getReminders().slice(0, 3);
  if (!list.length) {
    el.innerHTML = `<div style="color:var(--text-muted);font-size:12.5px;">Sin vencimientos próximos.</div>`;
    return;
  }
  el.innerHTML = list.map(r => `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:26px;height:26px;border-radius:7px;background:${urgencyBg(r.urgency)};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${r.emoji}</div>
      <div style="flex:1;overflow:hidden;">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.title}</div>
        <div style="color:var(--text-muted);font-size:11px;">${r.date}</div>
      </div>
    </div>
  `).join("");
}

// ----------------------------------------------------------------
// AGREGAR RECORDATORIO MANUAL
// ----------------------------------------------------------------
function openAddReminder() {
  if (window.contigoTrack) window.contigoTrack("abre_agregar_recordatorio", "");
  openModal(`
    <h2>+ Agregar recordatorio</h2>
    <div class="sub">Te avisaremos para que no se te pase ningún paso de tu trámite.</div>
    <label>Título del recordatorio</label>
    <input type="text" id="remTitle" placeholder="Ej: Llevar cédula original a la cita">
    <label>Notas adicionales</label>
    <input type="text" id="remMeta" placeholder="Ej: Cita en el CTE a las 10:00">
    <label>Fecha límite</label>
    <input type="date" id="remDate">
    <label>Prioridad</label>
    <select id="remUrgency">
      <option value="urgent">🔴 Urgente</option>
      <option value="soon">🟡 Próximamente</option>
      <option value="normal" selected>🔵 Normal</option>
    </select>
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="submitReminder()">
      Guardar recordatorio
    </button>
  `);
}

function submitReminder() {
  const title = document.getElementById("remTitle").value.trim();
  if (!title) { showToast("Escribe al menos un título"); return; }

  const rawDate = document.getElementById("remDate").value;
  let dateLabel = daysFromNow(3);
  if (rawDate) {
    dateLabel = new Date(rawDate + "T12:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short" });
  }

  const list = getReminders();
  list.unshift({
    id: Date.now(),
    title,
    meta: document.getElementById("remMeta").value.trim() || "Recordatorio manual",
    urgency: document.getElementById("remUrgency").value,
    emoji: "📌",
    date: dateLabel,
  });
  saveReminders(list);
  if (window.contigoTrack) window.contigoTrack("recordatorio_creado", title);
  closeModal();
  renderReminderList();
  renderSideReminders();
  showToast("📌 Recordatorio guardado");
}

// ----------------------------------------------------------------
// ENVIAR DOCUMENTOS AL EXPERTO
// ----------------------------------------------------------------
function openSendDocs() {
  if (window.contigoTrack) window.contigoTrack("abre_enviar_docs", "");
  const docs = getDocs().filter(d => d.checked);
  const unchecked = getDocs().filter(d => d.required && !d.checked);

  if (unchecked.length) {
    openModal(`
      <h2>📎 Enviar documentos</h2>
      <div style="background:#fff7e6;border-radius:10px;padding:12px;font-size:13px;color:#b45309;margin-bottom:14px;">
        ⚠️ Tienes <b>${unchecked.length} documento(s) requerido(s)</b> sin marcar como listos. Revísalos antes de enviar.
      </div>
      ${unchecked.map(d=>`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border);">🔸 ${d.label}</div>`).join("")}
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn-outline" style="flex:1;" onclick="closeModal()">Completar checklist</button>
        <button class="btn-primary" style="flex:1;justify-content:center;" onclick="confirmSendDocs()">Enviar de todas formas</button>
      </div>
    `);
  } else {
    confirmSendDocs();
  }
}

function confirmSendDocs() {
  if (window.contigoTrack) window.contigoTrack("envio_documentos_confirmado", "");
  openModal(`
    <h2>📎 Enviar documentos</h2>
    <div class="sub">Sube los archivos para enviarlos directamente a tu experto asignado.</div>
    <div class="file-upload" onclick="showToast('Selecciona archivos para subir')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
      Arrastrar archivos aquí o hacer clic para seleccionar
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin:8px 0;">Formatos aceptados: PDF, JPG, PNG. Máx. 10 MB por archivo.</div>
    <label>Mensaje para el experto (opcional)</label>
    <textarea placeholder="Ej: Adjunto los documentos solicitados. Avísame si necesitas algo más."></textarea>
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="finalizeSend()">
      Enviar al experto
    </button>
  `);
}

function finalizeSend() {
  if (window.contigoTrack) window.contigoTrack("documentos_enviados", "");
  // Marcar el recordatorio de documentos como hecho automáticamente
  const list = getReminders().filter(r => !r.title.toLowerCase().includes("documentos"));
  saveReminders(list);
  renderReminderList();
  renderSideReminders();
  openModal(`<div class="empty-state">
    <div style="font-size:34px;">📬</div>
    <b>¡Documentos enviados!</b><br>
    Tu experto los recibirá y te avisará si necesita algo más.
    <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Cerrar</button></div>
  </div>`);
}

// ----------------------------------------------------------------
// Expuesto globalmente para que payments.js lo llame al crear
// un trámite nuevo (agrega el deadline como recordatorio)
// ----------------------------------------------------------------
window.addTramiteToReminders = function(tipo, prof, fecha) {
  const list = getReminders();
  list.unshift({
    id: Date.now(),
    title: `Deadline: ${tipo}`,
    meta: `Experto: ${prof.split("—")[0].trim()}`,
    urgency: "soon", emoji: "⏳",
    date: fecha ? new Date(fecha + "T12:00:00").toLocaleDateString("es-EC",{day:"numeric",month:"short"}) : daysFromNow(7),
  });
  saveReminders(list);
  renderReminderList();
  renderSideReminders();
};
