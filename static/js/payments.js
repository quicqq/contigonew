// ================================================================
// PAGOS SEGUROS — ContiGO
// Modelo "escrow": el usuario deposita, el dinero queda
// retenido por ContiGO hasta que el trámite se confirme
// como completado, entonces se libera al profesional.
// ================================================================

function getBalance() {
  return parseFloat(sessionStorage.getItem("contigo_balance") || "0");
}
function setBalance(v) {
  sessionStorage.setItem("contigo_balance", String(v));
  renderBalance();
}

function fmtUSD(v) {
  return "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function renderBalance() {
  const v = getBalance();
  document.querySelectorAll("#balanceDisplay, #sideBalance").forEach(el => {
    if (el) el.textContent = fmtUSD(v);
  });
}

function getActiveTramites() {
  try { return JSON.parse(sessionStorage.getItem("contigo_tramites") || "[]"); }
  catch (e) { return []; }
}
function saveActiveTramites(list) {
  sessionStorage.setItem("contigo_tramites", JSON.stringify(list));
}

function getInvoices() {
  try { return JSON.parse(sessionStorage.getItem("contigo_invoices") || "[]"); }
  catch (e) { return []; }
}
function saveInvoices(list) {
  sessionStorage.setItem("contigo_invoices", JSON.stringify(list));
}

// ----------------------------------------------------------------
// INICIALIZACIÓN
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  renderBalance();
  renderActiveTramites();
});

// ----------------------------------------------------------------
// DEPÓSITO
// ----------------------------------------------------------------
function openDeposit() {
  if (window.contigoTrack) window.contigoTrack("abre_depositar", "");
  openModal(`
    <h2>💳 Depositar saldo</h2>
    <div class="sub">El saldo queda en garantía hasta que tu trámite se complete correctamente.</div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:14px 0;">
      ${[20,50,100].map(v=>`<button class="pay-quick-btn" style="padding:12px;" onclick="setDepositAmount(${v})">
        <div style="font-size:18px;font-weight:800;color:var(--primary);font-family:'Sora',sans-serif;">$${v}</div></button>`).join("")}
    </div>

    <label>Otro monto (USD)</label>
    <input type="number" id="depositAmount" min="1" placeholder="Ej: 35" style="font-size:18px;font-weight:700;">

    <label>Método de pago</label>
    <select id="depositMethod">
      <option>💳 Tarjeta de crédito/débito</option>
      <option>🏦 Transferencia bancaria</option>
      <option>📱 Nequi / Daviplata / Bimo</option>
    </select>

    <div style="background:#eef0ff;border-radius:10px;padding:12px;margin-top:14px;font-size:12.5px;color:var(--primary);">
      🔒 Tu depósito está protegido por ContiGO. Si el trámite no se completa, te devolvemos el 100%.
    </div>

    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="submitDeposit()">
      Confirmar depósito
    </button>
  `);
}

function setDepositAmount(v) {
  const input = document.getElementById("depositAmount");
  if (input) input.value = v;
}

function submitDeposit() {
  const raw = document.getElementById("depositAmount").value;
  const amount = parseFloat(raw);
  if (!raw || isNaN(amount) || amount <= 0) {
    showToast("Ingresa un monto válido mayor a $0"); return;
  }
  const method = document.getElementById("depositMethod").value;
  setBalance(getBalance() + amount);

  // Guardar en facturas
  const inv = getInvoices();
  inv.unshift({
    id: Date.now(), tipo: "Depósito", monto: amount,
    metodo: method, estado: "Completado",
    fecha: new Date().toLocaleDateString("es-EC"),
  });
  saveInvoices(inv);

  if (window.contigoTrack) window.contigoTrack("deposito_realizado", String(amount));

  openModal(`<div class="empty-state">
    <div style="font-size:34px;">✅</div>
    <b>¡Depósito exitoso!</b><br>
    Se añadieron <b>${fmtUSD(amount)}</b> a tu saldo en garantía.<br>
    <small style="color:var(--text-muted);">Método: ${method}</small>
    <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Entendido</button></div>
  </div>`);
}

// ----------------------------------------------------------------
// RETIRO
// ----------------------------------------------------------------
function openWithdraw() {
  const bal = getBalance();
  if (bal <= 0) {
    showToast("No tienes saldo disponible para retirar"); return;
  }
  openModal(`
    <h2>Retirar saldo</h2>
    <div class="sub">Saldo disponible: <b>${fmtUSD(bal)}</b></div>
    <label>Monto a retirar (USD)</label>
    <input type="number" id="withdrawAmount" min="1" max="${bal}" placeholder="Máx. ${fmtUSD(bal)}">
    <label>Cuenta de destino</label>
    <select><option>Cuenta Banco Pichincha ••••1234</option><option>Otro</option></select>
    <div style="background:#fff7e6;border-radius:10px;padding:12px;margin-top:14px;font-size:12.5px;color:#b45309;">
      ⚠️ Solo puedes retirar saldo que no esté asignado a un trámite activo. Los retiros se procesan en 1-2 días hábiles.
    </div>
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="submitWithdraw()">
      Solicitar retiro
    </button>
  `);
}

function submitWithdraw() {
  const raw = document.getElementById("withdrawAmount").value;
  const amount = parseFloat(raw);
  const bal = getBalance();
  if (!raw || isNaN(amount) || amount <= 0) { showToast("Ingresa un monto válido"); return; }
  if (amount > bal) { showToast("No tienes suficiente saldo"); return; }
  setBalance(bal - amount);
  if (window.contigoTrack) window.contigoTrack("retiro_solicitado", String(amount));
  openModal(`<div class="empty-state">
    <div style="font-size:34px;">⏳</div>
    <b>Retiro solicitado</b><br>${fmtUSD(amount)} serán transferidos en 1-2 días hábiles.
    <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Entendido</button></div>
  </div>`);
}

// ----------------------------------------------------------------
// PAGAR TRÁMITE (asignar saldo a un profesional)
// ----------------------------------------------------------------
function openPayTramite() {
  if (window.contigoTrack) window.contigoTrack("abre_pagar_tramite", "");
  const bal = getBalance();
  openModal(`
    <h2>Pagar trámite</h2>
    <div class="sub">El pago queda retenido hasta confirmar que el trámite está completo. Saldo disponible: <b>${fmtUSD(bal)}</b></div>
    <label>Profesional</label>
    <select id="ptProfesional">
      <option>María Fernanda López — Abogada</option>
      <option>Juan Pablo Martínez — Contador Público</option>
      <option>Ana Sofía Gómez — Gestora Administrativa</option>
      <option>David Morales — Abogado Migratorio</option>
    </select>
    <label>Tipo de trámite</label>
    <select id="ptTipo">
      <option>Renovación de licencia</option>
      <option>Obtención de RUC</option>
      <option>Certificado de antecedentes</option>
      <option>Visa de turismo</option>
      <option>Trámite notarial</option>
    </select>
    <label>Monto a pagar (USD)</label>
    <input type="number" id="ptMonto" min="1" placeholder="Ej: 25">
    <label>Fecha estimada de entrega</label>
    <input type="date" id="ptFecha">
    <div style="background:#eef0ff;border-radius:10px;padding:12px;margin-top:14px;font-size:12.5px;color:var(--primary);">
      🔒 El profesional recibirá el pago <b>solo cuando confirmes</b> que el trámite fue completado correctamente.
    </div>
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="submitPayTramite()">
      Confirmar pago en garantía
    </button>
  `);
}

function submitPayTramite() {
  const prof = document.getElementById("ptProfesional").value;
  const tipo = document.getElementById("ptTipo").value;
  const raw = document.getElementById("ptMonto").value;
  const fecha = document.getElementById("ptFecha").value;
  const amount = parseFloat(raw);

  if (!raw || isNaN(amount) || amount <= 0) { showToast("Ingresa un monto válido"); return; }
  if (amount > getBalance()) { showToast("Saldo insuficiente. Deposita primero."); return; }

  setBalance(getBalance() - amount);

  const tramites = getActiveTramites();
  const t = { id: Date.now(), prof, tipo, amount, fecha, estado: "En garantía" };
  tramites.unshift(t);
  saveActiveTramites(tramites);

  const inv = getInvoices();
  inv.unshift({ id: Date.now(), tipo: `Pago: ${tipo}`, monto: amount, metodo: "Saldo ContiGO", estado: "En garantía", fecha: new Date().toLocaleDateString("es-EC") });
  saveInvoices(inv);

  // Actualizar recordatorios con el trámite nuevo
  if (window.addTramiteToReminders) window.addTramiteToReminders(tipo, prof, fecha);

  if (window.contigoTrack) window.contigoTrack("pago_tramite_creado", tipo);
  renderActiveTramites();

  openModal(`<div class="empty-state">
    <div style="font-size:34px;">🔒</div>
    <b>Pago en garantía registrado</b><br>
    <b>${fmtUSD(amount)}</b> están retenidos para:<br>
    <i>${tipo}</i> con <i>${prof.split("—")[0].trim()}</i><br><br>
    <small style="color:var(--text-muted);">El pago se libera cuando confirmes que el trámite está completo.</small>
    <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Entendido</button></div>
  </div>`);
}

// ----------------------------------------------------------------
// LIBERAR PAGO
// ----------------------------------------------------------------
function openReleasePay(id) {
  openModal(`
    <h2>¿Liberar el pago?</h2>
    <div class="sub">Al confirmar, el dinero se transfiere al profesional. Esta acción no se puede deshacer.</div>
    <div style="background:#e8f7ee;border-radius:10px;padding:12px;font-size:13px;color:#16a34a;margin-bottom:16px;">
      ✅ Confirma que el trámite fue completado a tu entera satisfacción antes de liberar.
    </div>
    <button class="btn-primary" style="width:100%;justify-content:center;background:#16a34a;" onclick="confirmRelease(${id})">
      Sí, el trámite está completo — liberar pago
    </button>
    <button class="btn-outline" style="width:100%;margin-top:8px;" onclick="closeModal()">Cancelar</button>
  `);
}

function confirmRelease(id) {
  const tramites = getActiveTramites();
  const t = tramites.find(x => x.id === id);
  if (t) t.estado = "Completado ✅";
  saveActiveTramites(tramites);
  if (window.contigoTrack) window.contigoTrack("pago_liberado", t ? t.tipo : "");
  renderActiveTramites();
  openModal(`<div class="empty-state">
    <div style="font-size:34px;">🎉</div>
    <b>¡Pago liberado con éxito!</b><br>El profesional ya fue notificado.
    <div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Cerrar</button></div>
  </div>`);
}

// ----------------------------------------------------------------
// RENDERIZAR TRÁMITES ACTIVOS
// ----------------------------------------------------------------
function renderActiveTramites() {
  const el = document.getElementById("activeTramites");
  if (!el) return;
  const list = getActiveTramites();
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="padding:18px 0;">
      <div style="font-size:24px;">📋</div>
      No tienes trámites en curso. <a href="#" onclick="openPayTramite();return false;" style="color:var(--primary);font-weight:600;">Pagar un trámite</a>
    </div>`; return;
  }
  el.innerHTML = list.map(t => {
    const isComplete = t.estado.includes("Completado");
    const statusClass = isComplete ? "pay-status-done" : "pay-status-held";
    return `<div class="pay-tramite-row">
      <div class="pt-info">
        <div class="pt-title">${t.tipo}</div>
        <div class="pt-meta">${t.prof.split("—")[0].trim()} · ${t.fecha || "Fecha por definir"}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div class="pt-amount">${fmtUSD(t.amount)}</div>
        <span class="pay-status ${statusClass}">${t.estado}</span>
        ${!isComplete ? `<button class="reminder-btn" onclick="openReleasePay(${t.id})" style="font-size:11px;">Liberar pago</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

// ----------------------------------------------------------------
// FACTURAS
// ----------------------------------------------------------------
function openInvoices() {
  if (window.contigoTrack) window.contigoTrack("abre_mis_facturas", "");
  const list = getInvoices();
  const rows = list.length
    ? list.map(i => `
        <div class="pay-tramite-row" style="margin-bottom:6px;">
          <div class="pt-info">
            <div class="pt-title">${i.tipo}</div>
            <div class="pt-meta">${i.metodo} · ${i.fecha}</div>
          </div>
          <div style="text-align:right;">
            <div class="pt-amount">${fmtUSD(i.monto)}</div>
            <span class="pay-status ${i.estado === "Completado" ? "pay-status-done" : "pay-status-held"}">${i.estado}</span>
          </div>
        </div>`).join("")
    : `<div class="empty-state"><div style="font-size:28px;">🧾</div>Aún no tienes facturas. Aparecen aquí después de cada depósito o pago.</div>`;

  openModal(`
    <h2>🧾 Mis facturas</h2>
    <div class="sub">Historial de todos tus movimientos en ContiGO.</div>
    <div style="margin-top:8px;">${rows}</div>
    ${list.length ? `<button class="btn-outline" style="width:100%;margin-top:14px;" onclick="showToast('Descarga de PDF disponible próximamente')">⬇ Descargar PDF</button>` : ""}
  `);
}

// ----------------------------------------------------------------
// MÉTODOS DE PAGO
// ----------------------------------------------------------------
function openPayMethods() {
  if (window.contigoTrack) window.contigoTrack("abre_metodos_pago", "");
  openModal(`
    <h2>💳 Métodos de pago</h2>
    <div class="sub">Administra cómo depositas a tu saldo ContiGO.</div>

    <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0;">
      <div class="pay-tramite-row" style="cursor:default;">
        <div style="font-size:22px;">💳</div>
        <div class="pt-info"><div class="pt-title">Tarjeta Visa ••••1234</div><div class="pt-meta">Vence 09/27 · Principal</div></div>
        <span class="pay-status pay-status-done">Activa</span>
      </div>
      <div class="pay-tramite-row" style="cursor:default;">
        <div style="font-size:22px;">🏦</div>
        <div class="pt-info"><div class="pt-title">Banco Pichincha ••••5678</div><div class="pt-meta">Cuenta de ahorro</div></div>
        <span class="pay-status pay-status-held">Verificando</span>
      </div>
    </div>

    <button class="btn-primary" style="width:100%;justify-content:center;" onclick="openAddPayMethod()">
      + Agregar método de pago
    </button>
  `);
}

function openAddPayMethod() {
  openModal(`
    <h2>Agregar método de pago</h2>
    <label>Tipo</label>
    <select id="pmTipo">
      <option>Tarjeta de crédito / débito</option>
      <option>Cuenta bancaria (transferencia)</option>
      <option>Billetera móvil (Bimo, De Una)</option>
    </select>
    <label>Número de tarjeta / cuenta</label>
    <input type="text" placeholder="•••• •••• •••• ••••" maxlength="19">
    <label>Nombre del titular</label>
    <input type="text" placeholder="Como aparece en la tarjeta">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div><label>Vencimiento</label><input type="text" placeholder="MM/AA"></div>
      <div><label>CVV</label><input type="text" placeholder="•••" maxlength="4"></div>
    </div>
    <div style="background:#eef0ff;border-radius:10px;padding:10px;font-size:12px;color:var(--primary);margin-top:12px;">
      🔒 Tus datos se transmiten encriptados. ContiGO no almacena números de tarjeta completos.
    </div>
    <button class="btn-primary" style="width:100%;justify-content:center;margin-top:16px;" onclick="showToast('Método agregado ✓');closeModal();">
      Guardar método
    </button>
  `);
}

// ----------------------------------------------------------------
// ¿CÓMO FUNCIONA EL PAGO EN GARANTÍA?
// ----------------------------------------------------------------
function openTrustInfo() {
  if (window.contigoTrack) window.contigoTrack("abre_info_garantia", "");
  openModal(`
    <h2>🔒 ¿Cómo funciona el pago en garantía?</h2>
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:10px;">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">1</div>
        <div><b>Depositas el pago</b><br><span style="font-size:13px;color:var(--text-muted);">El dinero entra a una cuenta de garantía administrada por ContiGO, no al profesional todavía.</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">2</div>
        <div><b>El experto trabaja en tu trámite</b><br><span style="font-size:13px;color:var(--text-muted);">Recibes actualizaciones y puedes comunicarte en todo momento por el chat.</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">3</div>
        <div><b>Tú confirmas y liberas el pago</b><br><span style="font-size:13px;color:var(--text-muted);">Solo cuando estés satisfecho con el trámite completado, tú autorizas la transferencia al profesional.</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:32px;height:32px;border-radius:50%;background:#e8f7ee;color:#16a34a;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🛡️</div>
        <div><b>Garantía de devolución</b><br><span style="font-size:13px;color:var(--text-muted);">Si el trámite no se completa o hay algún problema, ContiGO gestiona la devolución.</span></div>
      </div>
    </div>
    <button class="btn-outline" style="width:100%;margin-top:18px;" onclick="closeModal()">Entendido</button>
  `);
}

// ----------------------------------------------------------------
// HISTORIAL (llamado desde interactions.js)
// ----------------------------------------------------------------
function openPayHistoryModal() {
  openInvoices();
}
