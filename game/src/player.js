// Coral Keys — first-person player.
// The camera sits at the character's eye. WASD walks, Shift runs, Space
// jumps, E enters/exits the nearest car, F shoots (raycast from the camera).
var CK = window.CK || {};
CK.player = (function () {
  var cfg = CK.config;
  var state = null; // set by main.js: { pos: THREE.Vector3, yaw, pitch, ... }

  function create() {
    var s = CK.world.playerSpawn;
    return {
      pos: new THREE.Vector3(s.x, 0, s.z),
      velY: 0,
      yaw: s.yaw,
      pitch: 0,
      onGround: true,
      inCar: null,
      health: 100,
      money: cfg.startMoney,
      speed: 0
    };
  }

  function forwardVector(yaw) {
    return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  }

  function update(dt, input, world, vehicles, onShoot) {
    var p = state;
    if (!p) return;
    if (p.inCar) return; // driving is handled by vehicles.js

    // Mouse look.
    var look = input.consumeLook();
    p.yaw -= look.dx * 0.0023;
    p.pitch -= look.dy * 0.0023;
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));

    // Movement relative to facing.
    var fwd = forwardVector(p.yaw);
    var right = { x: -fwd.z, z: fwd.x };
    var mx = 0, mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) { mx += fwd.x; mz += fwd.z; }
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) { mx -= fwd.x; mz -= fwd.z; }
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) { mx += right.x; mz += right.z; }
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) { mx -= right.x; mz -= right.z; }
    var len = Math.sqrt(mx * mx + mz * mz);
    var speed = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) ? cfg.runSpeed : cfg.walkSpeed;
    p.speed = len > 0 ? speed : 0;
    if (len > 0) {
      mx /= len; mz /= len;
      var nx = p.pos.x + mx * speed * dt;
      var nz = p.pos.z + mz * speed * dt;
      var hit = world.collideCircle(nx, nz, cfg.playerRadius);
      if (!hit) {
        p.pos.x = nx; p.pos.z = nz;
      } else {
        // Slide along the wall: try each axis separately.
        if (!world.collideCircle(nx, p.pos.z, cfg.playerRadius)) p.pos.x = nx;
        else if (!world.collideCircle(p.pos.x, nz, cfg.playerRadius)) p.pos.z = nz;
      }
      var cl = world.clampToCity(p.pos.x, p.pos.z);
      p.pos.x = cl.x; p.pos.z = cl.z;
    }

    // Jump + gravity.
    if (input.isDown('Space') && p.onGround) {
      p.velY = cfg.jumpSpeed;
      p.onGround = false;
    }
    if (!p.onGround) {
      p.velY -= cfg.gravity * dt;
      p.pos.y += p.velY * dt;
      if (p.pos.y <= 0) { p.pos.y = 0; p.velY = 0; p.onGround = true; }
    }

    // Shoot.
    if (input.wasPressed('KeyF') && onShoot) onShoot();
  }

  function applyCamera(camera) {
    var p = state;
    if (!p) return;
    if (p.inCar) return; // vehicles.js positions the camera while driving
    var bob = (p.speed > 0 && p.onGround) ? Math.sin(performance.now() * 0.012) * 0.05 : 0;
    camera.position.set(p.pos.x, cfg.eyeHeight + p.pos.y + bob, p.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = p.yaw;
    camera.rotation.x = p.pitch;
    camera.rotation.z = 0;
  }

  function enterCar(car) {
    state.inCar = car;
    car.driver = 'player';
  }

  function exitCar() {
    var car = state.inCar;
    if (!car) return null;
    state.inCar = null;
    car.driver = null;
    // Step out to the left of the car.
    var side = { x: Math.cos(car.yaw), z: -Math.sin(car.yaw) };
    state.pos.set(car.pos.x + side.x * 2.2, 0, car.pos.z + side.z * 2.2);
    state.yaw = car.yaw;
    return car;
  }

  function hurt(amount) {
    state.health = Math.max(0, state.health - amount);
    return state.health;
  }

  function heal(amount) {
    state.health = Math.min(100, state.health + amount);
  }

  function setState(s) { state = s; }
  function getState() { return state; }

  return {
    create: create,
    setState: setState,
    getState: getState,
    update: update,
    applyCamera: applyCamera,
    enterCar: enterCar,
    exitCar: exitCar,
    hurt: hurt,
    heal: heal,
    forwardVector: forwardVector
  };
})();
