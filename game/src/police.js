// Coral Keys — wanted level and police.
// Crimes raise heat (stealing a car, shooting). Police cruisers (3D car
// models with a light bar) spawn and chase the player. Heat cools down
// when the player stays out of trouble. Getting caught on foot hurts.
var CK = window.CK || {};
CK.police = (function () {
  var wanted = 0;
  var heat = 0; // 0..100, drives the wanted stars
  var cruisers = [];
  var scene = null;
  var sirenOn = false;

  function init(s) {
    scene = s;
  }

  function addHeat(amount) {
    heat = Math.min(100, heat + amount);
    var level = heat < 12 ? 0 : heat < 40 ? 1 : heat < 70 ? 2 : 3;
    if (level > wanted) {
      wanted = level;
      spawnCruisers();
      return true;
    }
    return false;
  }

  function setWanted(level) {
    wanted = level;
    heat = [0, 20, 50, 85][level] || 0;
    spawnCruisers();
  }

  function spawnCruisers() {
    // One cruiser per wanted star, spawned on roads near the player.
    var player = CK.player.getState();
    while (cruisers.length < wanted) {
      var angle = Math.random() * Math.PI * 2;
      var x = player.pos.x + Math.cos(angle) * 45;
      var z = player.pos.z + Math.sin(angle) * 45;
      var cl = CK.world.clampToCity(x, z);
      var car = CK.vehicles.createCar(cl.x, cl.z, 0, {
        police: true, driver: 'police', color: 0xf2f2f2, name: 'cruiser'
      });
      scene.add(car.mesh);
      cruisers.push(car);
    }
    while (cruisers.length > wanted) {
      var old = cruisers.pop();
      CK.vehicles.removeCar(old, scene);
    }
    if (wanted > 0) { CK.audio.startSiren(); sirenOn = true; }
    else { CK.audio.stopSiren(); sirenOn = false; }
  }

  function update(dt, player) {
    // Heat cools slowly when no new crime happens.
    if (heat > 0) {
      heat = Math.max(0, heat - dt * 1.6);
      var level = heat < 12 ? 0 : heat < 40 ? 1 : heat < 70 ? 2 : 3;
      if (level !== wanted) {
        wanted = level;
        spawnCruisers();
      }
    }
    // Chase: steer toward the player, drive fast, flash the light bar.
    var t = performance.now() * 0.006;
    cruisers.forEach(function (car) {
      var dx = player.pos.x - car.pos.x;
      var dz = player.pos.z - car.pos.z;
      var dist = Math.hypot(dx, dz);
      var wantYaw = Math.atan2(-dx, -dz);
      var diff = wantYaw - car.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.yaw += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      var targetSpeed = dist > 60 ? 34 : 26;
      car.speed += (targetSpeed - car.speed) * dt * 0.8;
      var nx = car.pos.x - Math.sin(car.yaw) * car.speed * dt;
      var nz = car.pos.z - Math.cos(car.yaw) * car.speed * dt;
      if (!CK.world.collideCircle(nx, nz, 2.0)) {
        car.pos.x = nx; car.pos.z = nz;
      } else {
        car.yaw += 0.6 * dt; // nudge around obstacles
      }
      var cl = CK.world.clampToCity(car.pos.x, car.pos.z);
      car.pos.x = cl.x; car.pos.z = cl.z;
      CK.vehicles.syncMesh(car);
      var red = car.mesh.userData.lightRed;
      var blue = car.mesh.userData.lightBlue;
      if (red) red.visible = Math.sin(t) > 0;
      if (blue) blue.visible = Math.sin(t) <= 0;
      // Caught on foot: the cruiser rams the player.
      if (!player.inCar && dist < 2.4) {
        CK.player.hurt(25 * dt);
      }
      // Ram the player's car: damage + slow it.
      if (player.inCar && dist < 3.4) {
        player.inCar.speed *= 0.92;
        CK.player.hurt(6 * dt);
      }
    });
    CK.audio.engine(player.inCar ? Math.abs(player.inCar.speed) / 42 : 0);
  }

  function getWanted() { return wanted; }
  function getHeat() { return heat; }
  function allCruisers() { return cruisers; }
  function isSirenOn() { return sirenOn; }

  return {
    init: init,
    addHeat: addHeat,
    setWanted: setWanted,
    update: update,
    getWanted: getWanted,
    getHeat: getHeat,
    allCruisers: allCruisers,
    isSirenOn: isSirenOn
  };
})();
