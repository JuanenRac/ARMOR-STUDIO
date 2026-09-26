const map = document.getElementById("map"), c = map.getContext("2d");
c.strokeStyle="#54e7ff"; c.lineWidth=2; c.strokeRect(35,35,map.width-70,map.height-70);
c.fillStyle="#ffcf5c"; [[100,100],[700,100],[700,260],[100,260]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();});

/** Render a status object returned by the authenticated central API. */
function renderStatus(status) {
  document.getElementById("armed").textContent = status.security.armed ? "ARMED" : "DISARMED";
  document.getElementById("nodes").textContent = Object.keys(status.nodes).length;
}
window.armorStudio = { renderStatus };
renderStatus({ security: { armed: false }, nodes: {} });
