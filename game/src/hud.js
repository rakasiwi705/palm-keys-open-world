// Coral Keys — HUD.
// DOM overlay plus a 2D minimap canvas. The minimap is UI, not the game
// world, so it stays a 2D canvas overlay. Every HUD element is kept inside
// the viewport with a 16px margin — nothing is drawn past the right edge.
var CK = window.CK || {};
CK.hud = (function () {
  var els = {};
  var minimap = null;
  var mmCtx = null;
  var clock = 0;
  var day = 1;

  function build() {
    var hud = document.getElementById('hud');
    hud.innerHTML = '';
    function div(id, cls, html) {
      var d = document.createElement('div');
      d.id = id;
      d.className = cls || '';
      if (html !== undefined) d.innerHTML = html;
      hud.appendChild(d);
      els[id] = d;
      return d;
    }
    div('mission', 'hud-box hud-top-left');
    div('health', 'hud-top-center');
    div('clock', 'hud-box hud-top-right');
    div('crosshair', 'crosshair', '+');
    div('message', 'hud-message');
    div('crate', 'hud-crate');
    div('controls', 'hud-controls', 'WASD move/drive &middot; E enter car &middot; F shoot &middot; P pause &middot; Q save &middot; M mute');
    div('mode', 'hud-box hud-bottom-right');
    var mmWrap = div('minimap-wrap', 'minimap-wrap');
    minimap = document.createElement('canvas');
    minimap.width = 180; minimap.height = 180;
    mmWrap.appendChild(minimap);
    var label = document.createElement('div');
    label.className = 'minimap-label';
    label.textContent = 'CORAL KEYS';
    mmWrap.appendChild(label);
    mmCtx = minimap.getContext('2d');
  }

  function fmtTime() {
    var total = CK.config.startHour * 3600 + clock;
    var h = Math.floor(total / 3600) % 24;
    var m = Math.floor((total % 3600) / 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '&#9733;' : '&#9734;';
    return s;
  }

  function update(dt, player) {
    clock += dt;
    var m = CK.missions.current();
    var missionHtml = m
      ? '<b>' + m.title + '</b><br>' + CK.missions.objectiveText() + '<br><span class="hint">' + CK.missions.hintText() + '</span>'
      : '<b>FREE ROAM</b><br>Explore Coral Keys.<br><span class="hint">Steal a car with E. Watch the heat.</span>';
    els.mission.innerHTML = missionHtml;
    els.health.innerHTML = '<div class="health-bar"><div class="health-fill" style="width:' +
      Math.max(0, player.health) + '%"></div><span>HEALTH ' +
      Math.round(Math.max(0, player.health)) + '</span></div>';
    els.clock.innerHTML =
      '<div class="clock-time">' + fmtTime() + '</div>' +
      '<div class="clock-day">Day ' + day + '</div>' +
      '<div class="clock-stars">' + stars(CK.police.getWanted()) + '</div>' +
      '<div class="clock-money">$' + player.money + '</div>';
    els.message.textContent = CK.missions.getMessage();
    els.crate.style.display = CK.missions.isCarrying() ? 'block' : 'none';
    els.crate.textContent = 'CARRYING THE CRATE';
    els.mode.textContent = player.inCar ? 'Driving: ' + player.inCar.name : 'On foot';
    drawMinimap(player);
  }

  // Minimap: schematic top-down UI drawing of the city (roads, sea,
  // buildings, player arrow, mission marker, police, traffic).
  function drawMinimap(player) {
    var g = mmCtx;
    var S = 180;
    var half = CK.config.cityHalf;
    function px(x) { return (x + half) / (half * 2) * S; }
    function pz(z) { return (z + half) / (half * 2) * S; }
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#2a2a30';
    g.fillRect(0, 0, S, S);
    // Sea at the bottom (south).
    g.fillStyle = '#2f9dc4';
    g.fillRect(0, pz(150), S, S - pz(150));
    g.fillStyle = '#e8d3a0';
    g.fillRect(0, pz(150), S, 4);
    // Roads.
    g.fillStyle = '#55555f';
    CK.config.roadLines.forEach(function (c) {
      g.fillRect(px(c) - 3, 0, 6, S);
      g.fillRect(0, pz(c) - 3, S, 6);
    });
    // Buildings.
    g.fillStyle = '#8a8a92';
    CK.world.buildings.forEach(function (b) {
      g.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w / (half * 2) * S, b.d / (half * 2) * S);
    });
    // Traffic dots.
    g.fillStyle = '#ffffff';
    CK.traffic.allCars().forEach(function (c) {
      g.beginPath(); g.arc(px(c.pos.x), pz(c.pos.z), 2, 0, 7); g.fill();
    });
    // Police dots.
    g.fillStyle = '#ff4d4d';
    CK.police.allCruisers().forEach(function (c) {
      g.beginPath(); g.arc(px(c.pos.x), pz(c.pos.z), 3, 0, 7); g.fill();
    });
    // Mission marker.
    var t = CK.missions.targetPos();
    if (t) {
      g.fillStyle = '#f5d76e';
      g.beginPath(); g.arc(px(t.x), pz(t.z), 5, 0, 7); g.fill();
      g.strokeStyle = '#f5d76e'; g.lineWidth = 2;
      g.beginPath(); g.arc(px(t.x), pz(t.z), 9, 0, 7); g.stroke();
    }
    // Player arrow (points along facing).
    var yaw = player.inCar ? player.inCar.yaw : player.yaw;
    var x = px(player.pos.x), y = pz(player.pos.z);
    g.save();
    g.translate(x, y);
    g.rotate(-yaw);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath();
    g.fill();
    g.restore();
  }

  function setDay(d) { day = d; }
  function getClock() { return clock; }

  return {
    build: build,
    update: update,
    setDay: setDay,
    getClock: getClock
  };
})();
