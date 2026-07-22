(function(){
  const blobs=document.querySelectorAll(".blob");if(!blobs.length)return;
  let tx=0,ty=0,cx=0,cy=0;
  window.addEventListener("mousemove",function(e){tx=(e.clientX/window.innerWidth-.5)*2;ty=(e.clientY/window.innerHeight-.5)*2;});
  function animate(){cx+=(tx-cx)*.04;cy+=(ty-cy)*.04;blobs.forEach(function(b,i){const d=(i+1)*12;b.style.transform=`translate(${cx*d}px,${cy*d}px)`;});requestAnimationFrame(animate);}
  animate();
})();
