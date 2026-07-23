/* ============================================================
   ContiGO — Núcleo compartido
   ============================================================ */

// ---------- Modal ----------
function openM(html, wide) {
  const md = document.getElementById("md");
  md.style.maxWidth = wide ? "680px" : "520px";
  md.innerHTML = `<button class="modal-x" onclick="closeM()">✕</button><div class="modal-in">${html}</div>`;
  document.getElementById("ov").classList.add("on");
}
function closeM() {
  document.getElementById("ov").classList.remove("on");
  if (window.stopChatPolling) window.stopChatPolling();
}

// ---------- Toast ----------
function toast(msg) {
  const t = document.getElementById("tst");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("on"), 3000);
}

// ---------- Sesión ----------
function getUser() {
  try { return JSON.parse(sessionStorage.getItem("cg_user") || "null"); }
  catch (e) { return null; }
}
function setUser(u) { sessionStorage.setItem("cg_user", JSON.stringify(u)); }
function logout() { sessionStorage.removeItem("cg_user"); location.href = "/"; }

function requireAuth(role) {
  const u = getUser();
  if (!u) { location.href = "/"; return null; }
  if (role && u.role !== role) {
    location.href = u.role === "experto" ? "/experto" : "/usuario";
    return null;
  }
  return u;
}

// ---------- Formato ----------
const AV_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#c026d3"];
function avColor(name) {
  let h = 0; for (const c of (name || "?")) h = (h * 31 + c.charCodeAt(0)) % AV_COLORS.length;
  return AV_COLORS[h];
}
function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  // Se redondea a tramos estables: si el texto cambiara cada segundo,
  // el HTML nunca seria identico y los paneles se repintarian sin parar
  // (eso causaba el parpadeo del chat cada 3s).
  if (s < 45) return "recién";
  if (s < 90) return "hace 1 min";
  if (s < 3600) return "hace " + Math.floor(s / 60) + " min";
  if (s < 86400) return "hace " + Math.floor(s / 3600) + " h";
  return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}
function hhmm(iso) {
  return new Date(iso).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Tracking ----------
(function () {
  function sid() {
    let s = sessionStorage.getItem("cg_sid");
    if (!s) { s = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); sessionStorage.setItem("cg_sid", s); }
    return s;
  }
  window.track = function (name, label) {
    fetch("/api/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid(), event_name: name, event_label: label || "", page: location.pathname })
    }).catch(() => { });
  };
  addEventListener("DOMContentLoaded", () => {
    track("pageview", document.title);
    document.querySelectorAll("[data-track]").forEach(el =>
      el.addEventListener("click", () =>
        track(el.dataset.track, el.dataset.trackLabel || el.textContent.trim().slice(0, 50))));
  });
})();

// ---------- Notificación sonora ----------
function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.value = 880; o.type = "sine";
    g.gain.setValueAtTime(.22, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .35);
    o.start(); o.stop(c.currentTime + .35);
  } catch (e) { }
}
