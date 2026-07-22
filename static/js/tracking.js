(function(){
  function getSessionId(){
    let sid=sessionStorage.getItem("contigo_session");
    if(!sid){sid=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());sessionStorage.setItem("contigo_session",sid);}
    return sid;
  }
  function track(eventName,eventLabel){
    fetch("/api/track",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({session_id:getSessionId(),event_name:eventName,event_label:eventLabel||"",page:window.location.pathname})
    }).catch(()=>{});
  }
  window.addEventListener("DOMContentLoaded",function(){
    track("pageview",document.title);
    document.querySelectorAll("[data-track]").forEach(function(el){
      el.addEventListener("click",function(){
        track(el.getAttribute("data-track"),el.getAttribute("data-track-label")||el.textContent.trim());
      });
    });
  });
  window.contigoTrack=track;
})();
