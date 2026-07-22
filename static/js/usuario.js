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
    const r = await fetch("/api/solicitud", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: ME.id, nombre: ME.nombre, correo: ME.correo || ME.username,
        profesional: profNombre || "Cualquier experto disponible",
        tipo, descripcion: desc, urgencia: urg
      })
    });
    const d = await r.json();
    if (!d.ok) { btn.disabled = false; btn.textContent = "Enviar solicitud"; return toast(d.error); }

    track("solicitud_enviada", tipo);
    openM(`
      <div style="text-align:center;padding:14px 0">
        <div style="width:66px;height:66px;border-radius:20px;background:var(--ok-bg);display:grid;place-items:center;margin:0 auto 18px">
          <svg width="32" height="32" fill="none" stroke="#059669" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style="padding:0;margin-bottom:8px">¡Solicitud enviada!</h2>
        <p style="font-size:14px;color:var(--muted);margin-bottom:6px">
          Tu asesor ya la recibió y te responderá en el chat.</p>
        <p style="font-size:12.5px;color:var(--muted)">Solicitud <b>#${d.id}</b></p>
        <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="abrirChat(${d.id})">
          Abrir chat con mi asesor</button>
        <button class="btn btn-ghost btn-block" style="margin-top:9px" onclick="closeM()">Más tarde</button>
      </div>`);
    checkNotifs();
  } catch (e) {
    btn.disabled = false; btn.textContent = "Enviar solicitud";
    toast("Sin conexión al servidor");
  }
}

/* ---------- MIS SOLICITUDES ---------- */
async function misSolicitudes() {
  track("abre_mis_solicitudes");
  try {
    const r = await fetch(`/api/mis-solicitudes?correo=${encodeURIComponent(ME.correo || ME.username)}&nombre=${encodeURIComponent(ME.nombre)}`);
    const list = await r.json();
    if (!list.length) {
      return openM(`<h2>Mis solicitudes</h2>
        <div class="empty">
          <div class="empty-ic"><svg width="26" height="26" fill="none" stroke="#94a3b8" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div>
          <b>Aún no tienes solicitudes</b>
          <p>Elige un profesional y solicita tu primer servicio.</p>
          <button class="btn btn-primary" style="margin-top:18px" onclick="closeM();solicitar()">Solicitar asesoría</button>
        </div>`);
    }
    openM(`<h2>Mis solicitudes</h2><div class="sub">Toca una para abrir el chat con tu asesor</div>
      <div style="display:flex;flex-direction:column;gap:11px">
        ${list.map(s => {
          const b = s.estado === "nueva" ? ["b-new", "Enviada"] :
                    s.estado === "atendiendo" ? ["b-work", "En atención"] : ["b-done", "Completada"];
          return `<div style="border:1px solid var(--line);border-radius:12px;padding:15px;cursor:pointer;position:relative;transition:all .15s"
               onmouseover="this.style.borderColor='var(--brand-2)'" onmouseout="this.style.borderColor='var(--line)'"
               onclick="abrirChat(${s.id})">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:7px">
              <div style="font-weight:600;font-size:14px">${esc(s.tipo)}</div>
              <span class="badge ${b[0]}">${b[1]}</span>
            </div>
            <div style="font-size:12.5px;color:var(--muted);line-height:1.45;margin-bottom:9px">${esc(s.descripcion.slice(0, 110))}${s.descripcion.length > 110 ? "…" : ""}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--muted)">
              <span>👤 ${esc(s.profesional_solicitado || "Asesor asignado")}</span>
              <span>${timeAgo(s.created_at)}</span>
            </div>
            ${s.no_leidos > 0 ? `<span style="position:absolute;top:13px;right:13px;background:var(--dang);color:#fff;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px">${s.no_leidos} nuevo${s.no_leidos > 1 ? "s" : ""}</span>` : ""}
          </div>`;
        }).join("")}
      </div>`, true);
  } catch (e) { toast("Sin conexión al servidor"); }
}

/* ---------- CHAT ---------- */
let chatId = null, chatTimer = null;
let uRenderedIds = [];      // mensajes ya pintados (evita repintar → sin parpadeo)
let uHeadBuilt = false;     // cabecera del chat construida una sola vez
let uPagoEstado = null;     // para detectar cambios en el pago

function abrirChat(sid) {
  chatId = sid;
  uRenderedIds = [];
  uHeadBuilt = false;
  uPagoEstado = null;
  openM(`
    <h2>Chat con tu asesor</h2>
    <div class="sub">Solicitud #${sid} · Responde en tiempo real</div>
    <div id="docPanel"></div>
    <div id="payPanel"></div>
    <div class="chat-box" id="cbox"></div>
    <div class="chat-bar">
      <input type="text" id="cin" placeholder="Escribe tu mensaje…" onkeydown="if(event.key==='Enter')sendMsg()">
      <button class="btn btn-primary" onclick="sendMsg()" style="padding:11px 16px">
        <svg width="17" height="17" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
      </button>
    </div>
    <button class="file-btn" onclick="document.getElementById('cfile').click()" data-track="click_enviar_doc">
      <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.4 11.05l-9.2 9.2a5 5 0 0 1-7.1-7.1l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.3-2.3l8.5-8.5"/></svg>
      Adjuntar documento (PDF, JPG, PNG)
    </button>
    <input type="file" id="cfile" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp,.heic" onchange="upFile(this)">
    <div id="upStat" style="font-size:12px;color:var(--muted);text-align:center;margin-top:8px"></div>`, true);
  loadMsgs();
  loadDocs();
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

    // --- Solo agregar mensajes nuevos (sin repintar → sin parpadeo) ---
    const nuevos = d.mensajes.filter(m => !uRenderedIds.includes(m.id));
    if (nuevos.length) {
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      nuevos.forEach(m => {
        box.insertAdjacentHTML("beforeend", uBubble(m));
        uRenderedIds.push(m.id);
      });
      if (nearBottom) box.scrollTop = box.scrollHeight;
    }

    // --- Refrescar panel de pago si cambió el estado ---
    if (d.solicitud && d.solicitud.pago_estado !== uPagoEstado) {
      uPagoEstado = d.solicitud.pago_estado;
      renderPayPanel(d.solicitud);
    }
  } catch (e) { }
}

function uBubble(m) {
  if (m.tipo === "peticion_archivo")
    return `<div class="bubble bb-ask">📎 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "archivo")
    return `<div class="bubble bb-file">📄 ${esc(m.archivo_nombre)}<div class="bb-time">Enviado ✓ · ${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "solicitud_pago")
    return `<div class="bubble bb-them" style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;white-space:pre-line">💵 ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  if (m.tipo === "pago_hecho" || m.tipo === "pago_liberado")
    return `<div class="bubble bb-me" style="background:#1e3a8a">✅ ${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
  return `<div class="bubble ${m.autor === "usuario" ? "bb-me" : "bb-them"}">${esc(m.texto)}<div class="bb-time">${hhmm(m.created_at)}</div></div>`;
}

/* ---------- PANEL DE PAGO (usuario) ---------- */
function renderPayPanel(s) {
  const el = document.getElementById("payPanel");
  if (!el) return;
  const p = s.precio ? Number(s.precio).toFixed(2) : "0.00";

  if (s.pago_estado === "pendiente") {
    el.innerHTML = `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div><div style="font-weight:700;font-size:14px;color:#065f46">💵 Pago solicitado: $${p}</div>
            <div style="font-size:12px;color:#047857;margin-top:2px">Tu dinero queda protegido hasta confirmar el trámite</div></div>
          <button class="btn btn-ok btn-sm" onclick="pagar(${s.id})">Pagar ahora</button>
        </div>
      </div>`;
  } else if (s.pago_estado === "en_garantia") {
    el.innerHTML = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div><div style="font-weight:700;font-size:14px;color:#1e3a8a">🔒 $${p} en garantía</div>
            <div style="font-size:12px;color:#2563eb;margin-top:2px">Libera el pago cuando tu trámite esté completo</div></div>
          <button class="btn btn-primary btn-sm" onclick="liberar(${s.id})">Trámite listo, liberar</button>
        </div>
      </div>`;
  } else if (s.pago_estado === "liberado") {
    el.innerHTML = `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;margin-bottom:12px;text-align:center">
        <div style="font-weight:700;font-size:14px;color:#065f46">✅ Pago de $${p} completado</div>
        <div style="font-size:12px;color:#047857;margin-top:2px">¡Gracias! El trámite quedó cerrado.</div>
      </div>`;
  } else {
    el.innerHTML = "";
  }
}

async function pagar(sid) {
  track("abre_pago");
  openM(`
    <h2>💳 Pagar servicio</h2>
    <div class="sub">Pago protegido — el dinero solo se libera cuando confirmes que tu trámite está completo.</div>
    <label style="margin-top:0">Método de pago</label>
    <select id="payMet">
      <option>Tarjeta de crédito/débito</option>
      <option>Transferencia bancaria</option>
      <option>Billetera móvil (Bimo, De Una)</option>
    </select>
    <label>Número de tarjeta</label>
    <input type="text" placeholder="•••• •••• •••• ••••" maxlength="19" value="4242 4242 4242 4242">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><label>Vencimiento</label><input type="text" placeholder="MM/AA" value="09/27"></div>
      <div><label>CVV</label><input type="text" placeholder="•••" maxlength="4" value="123"></div>
    </div>
    <div class="alert alert-info" style="margin-top:16px">
      <span>🔒</span><span>Demostración — no se procesa ningún cobro real.</span></div>
    <button class="btn btn-ok btn-block btn-lg" style="margin-top:20px" onclick="confirmarPago(${sid})">Confirmar pago</button>`);
}

async function confirmarPago(sid) {
  const metodo = document.getElementById("payMet").value;
  await fetch(`/api/solicitud/${sid}/pagar`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metodo, autor_nombre: ME.nombre })
  });
  track("pago_realizado");
  closeM();
  abrirChat(sid);   // reabre el chat ya con el estado "en garantía"
  toast("✅ Pago realizado — en garantía");
}

async function liberar(sid) {
  openM(`
    <h2>Confirmar trámite completo</h2>
    <div class="sub">Al liberar el pago, el dinero se transfiere a tu asesor. Hazlo solo si tu trámite está resuelto a tu satisfacción.</div>
    <div class="alert alert-info"><span>💡</span><span>Esta acción cierra la solicitud y no se puede deshacer.</span></div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-ghost" style="flex:1" onclick="abrirChat(${sid})">Todavía no</button>
      <button class="btn btn-ok" style="flex:1" onclick="confirmarLiberar(${sid})">Sí, liberar pago</button>
    </div>`);
}

async function confirmarLiberar(sid) {
  await fetch(`/api/solicitud/${sid}/liberar-pago`, { method: "POST" });
  track("pago_liberado");
  closeM();
  toast("🎉 ¡Trámite completado! Gracias por usar ContiGO");
  checkNotifs();
}

/* ---------- DOCUMENTOS PENDIENTES ---------- */
async function loadDocs() {
  if (!chatId) return;
  const el = document.getElementById("docPanel");
  if (!el) return;
  try {
    const r = await fetch(`/api/solicitud/${chatId}/documentos`);
    const docs = await r.json();
    if (!docs.length) { el.innerHTML = ""; return; }

    const done = docs.filter(d => d.entregado).length;
    el.innerHTML = `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-weight:700;font-size:13.5px;color:#92400e">📋 Documentos pendientes</div>
          <span style="font-size:12px;color:#b45309;font-weight:600">${done}/${docs.length} entregados</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${docs.map(d => `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:${d.entregado ? "#059669" : "#78350f"}">
              <span style="font-size:14px">${d.entregado ? "✅" : "⬜"}</span>
              <span style="${d.entregado ? "text-decoration:line-through;opacity:.7" : ""}">${esc(d.nombre)}</span>
            </div>`).join("")}
        </div>
        ${done < docs.length ? `<div style="font-size:11.5px;color:#b45309;margin-top:8px">Usa "Adjuntar documento" abajo para enviarlos.</div>` : ""}
      </div>`;
  } catch (e) { }
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
  st.textContent = "Subiendo…";
  const fd = new FormData();
  fd.append("archivo", inp.files[0]);
  fd.append("autor_nombre", ME.nombre);
  try {
    const r = await fetch(`/api/solicitud/${chatId}/subir`, { method: "POST", body: fd });
    const d = await r.json();
    st.textContent = d.ok ? "✅ Documento enviado a tu asesor" : "⚠️ " + d.error;
    if (d.ok) { track("documento_enviado", d.archivo); loadMsgs(); loadDocs(); }
  } catch (e) { st.textContent = "⚠️ Sin conexión"; }
  inp.value = "";
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
}

/* ---------- EXTRAS ---------- */
function renderTop() {
  document.getElementById("topTramites").innerHTML = [
    ["RUC / SRI", 42], ["Licencia", 35], ["Visa", 28], ["Notarial", 21]
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
