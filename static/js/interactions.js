const PROFESSIONALS={
  maria:{name:"María Fernanda López",role:"Abogada",color:"#ec4899",initials:"ML",rating:"4.9 (124 reseñas)",price:"Desde $25/consulta",bio:"12 años en trámites notariales y derecho civil. Te acompaña en escrituras, poderes, declaraciones juradas y herencias.",specialties:["Trámites notariales","Herencias","Poderes","Declaraciones juradas"]},
  juan:{name:"Juan Pablo Martínez",role:"Contador Público",color:"#5b4fe3",initials:"JM",rating:"4.8 (98 reseñas)",price:"Desde $20/consulta",bio:"Especialista en SRI: RUC, declaraciones de impuestos y contabilidad para personas naturales y pequeños negocios.",specialties:["RUC","Declaraciones SRI","Contabilidad","Facturación electrónica"]},
  ana:{name:"Ana Sofía Gómez",role:"Gestora Administrativa",color:"#16a34a",initials:"AG",rating:"4.7 (76 reseñas)",price:"Desde $15/consulta",bio:"Gestiona trámites de tránsito: licencias, matriculación vehicular y permisos de circulación.",specialties:["Licencias","Matriculación","Permisos de tránsito"]},
  david:{name:"David Morales",role:"Abogado Migratorio",color:"#f97316",initials:"DM",rating:"4.9 (112 reseñas)",price:"Desde $30/consulta",bio:"Apoya procesos de visas, residencias y trámites ante Cancillería y Migración.",specialties:["Visas de turismo","Residencias","Trámites migratorios"]}
};
const VIDEOS={ruc:{title:"Cómo sacar el RUC",desc:"Paso a paso ante el SRI para obtener tu RUC por primera vez."},licencia:{title:"Renovar licencia de conducción",desc:"Tutorial completo para renovar tu licencia sin contratiempos."},antecedentes:{title:"Certificado de antecedentes",desc:"Paso a paso para tu certificado de antecedentes penales."},visa:{title:"Solicitar visa de turismo",desc:"Guía completa para solicitar tu visa ante Cancillería."}};

function openModal(html){document.getElementById("modalBox").innerHTML='<button class="modal-close" onclick="closeModal()">✕</button>'+html;document.getElementById("modalOverlay").classList.add("open");}
function closeModal(){document.getElementById("modalOverlay").classList.remove("open");}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);}

/* BÚSQUEDA */
function quickSearch(term){document.getElementById("searchInput").value=term;runSearch();}
function runSearch(){
  const q=document.getElementById("searchInput").value.trim().toLowerCase();
  const banner=document.getElementById("searchBanner");
  const all=document.querySelectorAll(".video-card,.pro-card");
  if(window.contigoTrack)window.contigoTrack("ejecuta_busqueda",q);
  if(!q){all.forEach(c=>c.classList.remove("match","dim"));banner.style.display="none";return;}
  let m=0;
  all.forEach(c=>{const kw=(c.getAttribute("data-keywords")||"").toLowerCase();const match=kw.includes(q)||c.textContent.toLowerCase().includes(q);c.classList.toggle("match",match);c.classList.toggle("dim",!match);if(match)m++;});
  banner.style.display="flex";
  if(m>0){banner.innerHTML=`Mostrando ${m} resultado(s) para "<b>${q}</b>" — <button onclick="clearSearch()">ver todo</button>`;document.querySelector(".match")?.scrollIntoView({behavior:"smooth",block:"center"});}
  else banner.innerHTML=`Sin resultados para "<b>${q}</b>". <button onclick="openPublishForm()">Publica tu trámite</button>`;
}
function clearSearch(){document.getElementById("searchInput").value="";document.querySelectorAll(".video-card,.pro-card").forEach(c=>c.classList.remove("match","dim"));document.getElementById("searchBanner").style.display="none";}

/* PERFIL */
function openProfile(id){
  const p=PROFESSIONALS[id];if(!p)return;
  openModal(`<div style="display:flex;gap:14px;align-items:center;margin-bottom:6px;">
    <div style="width:56px;height:56px;border-radius:50%;background:${p.color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">${p.initials}</div>
    <div><h2 style="padding-right:0;">${p.name}</h2><div class="sub" style="margin:0;">${p.role} · ⭐ ${p.rating}</div></div></div>
  <p style="font-size:13.5px;line-height:1.5;color:var(--text-muted);">${p.bio}</p>
  <label>Especialidades</label><div style="display:flex;flex-wrap:wrap;gap:6px;">${p.specialties.map(s=>`<span class="tag">${s}</span>`).join("")}</div>
  <label>Tarifa referencial</label><div style="font-size:14px;font-weight:600;">${p.price}</div>
  <button class="btn-primary" style="width:100%;justify-content:center;margin-top:18px;" onclick="contigoTrack('click_contactar_profesional','${p.name}');closeModal();openChat('${p.name}')">
    Contactar a ${p.name.split(" ")[0]}</button>`);
}

/* VIDEOS */
function openVideoModal(id){
  const v=VIDEOS[id];if(!v)return;
  openModal(`<h2>${v.title}</h2><div class="sub">${v.desc}</div>
  <div style="background:#1e1b2e;border-radius:10px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;text-align:center;padding:20px;">
    🎬 Aquí se reproducirá el video tutorial.<br><small style="opacity:.6;">(reemplaza este div por un iframe de YouTube)</small></div>`);
}

/* PERFIL PROPIO, ESTADOS VACÍOS */
function openMyProfile(){openModal(`<h2>Mi perfil</h2><label>Nombre</label><input type="text" value="Carlos Ramírez" readonly><label>Correo</label><input type="text" value="carlos.ramirez@email.com" readonly><label>Ciudad</label><input type="text" value="Guayaquil, Ecuador" readonly><button class="btn-outline" style="margin-top:16px;" onclick="showToast('La edición llegará en una próxima versión')">Editar datos</button>`);}
function openMyProcedures(){openModal(`<h2>Mis trámites</h2><div class="empty-state"><div style="font-size:30px;">📄</div>Todavía no tienes trámites activos.<div style="margin-top:14px;"><button class="btn-primary" onclick="closeModal();openPublishForm()">Publicar mi primer trámite</button></div></div>`);}
function openFavorites(){openModal(`<h2>Favoritos</h2><div class="empty-state"><div style="font-size:30px;">🤍</div>Aún no guardaste profesionales.<br>Toca el corazón en cualquier perfil.</div>`);}
function openSettings(){openModal(`<h2>Configuración</h2><label>Notificaciones por correo</label><select><option>Activadas</option><option>Desactivadas</option></select><label>Idioma</label><select><option>Español</option><option>English</option></select><button class="btn-primary" style="width:100%;justify-content:center;margin-top:18px;" onclick="showToast('Preferencias guardadas');closeModal();">Guardar</button>`);}
function openNotifications(){openModal(`<h2>Notificaciones</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;"><div style="font-size:13.5px;padding:10px;background:var(--primary-light);border-radius:8px;">🔔 Juan Pablo Martínez respondió tu consulta sobre el RUC.</div><div style="font-size:13.5px;padding:10px;background:var(--bg);border-radius:8px;">✅ Tu certificado de antecedentes fue marcado como "en proceso".</div></div>`);}
function openMessages(){openModal(`<h2>Mensajes</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
  <div style="display:flex;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px;cursor:pointer;" onclick="closeModal();openChat('María Fernanda López')">
    <div style="width:36px;height:36px;border-radius:50%;background:#ec4899;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">ML</div>
    <div><div style="font-weight:600;font-size:13.5px;">María Fernanda López</div><div style="font-size:12.5px;color:var(--text-muted);">Claro, te ayudo con la escritura...</div></div></div>
  <div style="display:flex;gap:10px;padding:10px;border:1px solid var(--border);border-radius:10px;cursor:pointer;" onclick="closeModal();openChat('Juan Pablo Martínez')">
    <div style="width:36px;height:36px;border-radius:50%;background:#5b4fe3;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">JM</div>
    <div><div style="font-weight:600;font-size:13.5px;">Juan Pablo Martínez</div><div style="font-size:12.5px;color:var(--text-muted);">Ya revisé tu RUC, falta un paso...</div></div></div>
</div>`);}

/* CHAT */
function openChat(withName){
  const name=withName||"soporte ContiGO";
  openModal(`<h2>Chat con ${name}</h2><div class="chat-window">
    <div class="chat-messages" id="chatMessages"><div class="chat-bubble bot">Hola 👋 ¿En qué trámite te podemos ayudar hoy?</div></div>
    <div class="chat-input-row"><input type="text" id="chatInput" placeholder="Escribe un mensaje..." onkeydown="if(event.key==='Enter') sendChat()"><button class="btn-primary" onclick="sendChat()">➤</button></div>
  </div>`);
}
function sendChat(){const i=document.getElementById("chatInput");const t=i.value.trim();if(!t)return;const b=document.getElementById("chatMessages");b.insertAdjacentHTML("beforeend",`<div class="chat-bubble me">${t}</div>`);i.value="";b.scrollTop=b.scrollHeight;if(window.contigoTrack)window.contigoTrack("envia_mensaje_chat",t);setTimeout(()=>{b.insertAdjacentHTML("beforeend",`<div class="chat-bubble bot">Gracias por contarnos. Un profesional verificado te responderá pronto 🙂</div>`);b.scrollTop=b.scrollHeight;},700);}

/* PUBLICAR TRÁMITE */
function openPublishForm(){openModal(`<h2>Publicar mi trámite</h2><div class="sub">Cuéntanos qué necesitas y te conectamos con el profesional ideal.</div>
  <label>Tipo de trámite</label><select id="pubTipo"><option>Trámite notarial / civil</option><option>RUC / impuestos</option><option>Licencia de conducción</option><option>Visa / migración</option><option>Otro</option></select>
  <label>Describe lo que necesitas</label><textarea id="pubDesc" placeholder="Ej: Necesito renovar mi licencia tipo B antes de fin de mes..."></textarea>
  <button class="btn-primary" style="width:100%;justify-content:center;margin-top:18px;" onclick="submitPublish()">Publicar trámite</button>`);}
function submitPublish(){if(window.contigoTrack)window.contigoTrack("submit_publicar_tramite","");openModal(`<div class="empty-state"><div style="font-size:34px;">✅</div><b>¡Listo! Tu trámite fue publicado.</b><br>Los profesionales disponibles podrán contactarte pronto.<div style="margin-top:16px;"><button class="btn-outline" onclick="closeModal()">Entendido</button></div></div>`);}

/* HISTORIAL DE PAGOS */
function openPayHistory(){openPayHistoryModal();}
