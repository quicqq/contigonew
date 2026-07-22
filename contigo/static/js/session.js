function getContigoUser(){try{return JSON.parse(sessionStorage.getItem("contigo_user")||"null");}catch(e){return null;}}
function initials(name){return name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");}
document.addEventListener("DOMContentLoaded",function(){
  const u=getContigoUser();
  if(!u||!u.nombre)return;
  const ini=initials(u.nombre);
  document.querySelectorAll("#topAvatar,#sideAvatar,#profAvatar").forEach(el=>el.textContent=ini);
  const g=document.getElementById("topGreeting");if(g)g.textContent="Hola, "+u.nombre.split(" ")[0];
  const sn=document.getElementById("sideName");if(sn)sn.textContent=u.nombre;
  const se=document.getElementById("sideEmail");if(se&&u.correo)se.textContent=u.correo;
  const pn=document.getElementById("profName");if(pn)pn.textContent=u.nombre;
  const pr=document.getElementById("profRole");if(pr&&u.profesion)pr.textContent=u.profesion;
  const wn=document.getElementById("welcomeName");if(wn)wn.textContent=u.nombre.split(" ")[0];
});
