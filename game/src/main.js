// Coral Keys — game loop and wiring.
// States: title, playing, paused, busted, complete. First-person camera,
// pointer-lock mouse look, car entry, shooting, missions, wanted level.
var CK = window.CK || {};
CK.game = (function () {
  var cfg = CK.config;
  var renderer, scene, camera, canvas;
  var player = null;
  var state = 'title';
  var titleCamera = null;
  var lastTime = 0;
  var raycaster = null;
  var gunshotAt = null;
  var shotMode = false;
  var statusEl = null;
  var completeShown = false;

  function status(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    statusEl = document.getElementById('status-line');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(cfg.fov, window.innerWidth / window.innerHeight, 0.1, 900);
    raycaster = new THREE.Raycaster();
    raycaster.far = 120;

    CK.world.build(scene);
    CK.police.init(scene);
    CK.traffic.init(scene, CK.world);
    CK.missions.init(scene);
    CK.hud.build();
    CK.input.init(canvas);
    CK.input.setShotMode(CK.shots.isShot());
    shotMode = CK.shots.isShot();

    player = CK.player.create();
    CK.player.setState(player);

    // Parked cars the player can steal.
    CK.world.carSpawns.forEach(function (s, i) {
      var car = CK.vehicles.createCar(s.x, s.z, s.yaw, { name: ['sedan', 'coupe', 'pickup', 'taxi'][i % 4] });
      scene.add(car.mesh);
    });

    // Title screen.
    showTitle();
    var staged = CK.shots.stage({
      player: player,
      scene: scene,
      spawnPlayerCar: spawnPlayerCar
    });
    if (staged) {
      if (staged.titleCamera) titleCamera = staged.titleCamera;
      if (staged.state === 'playing') {
        hideOverlays();
        state = 'playing';
      }
      // In screenshot mode the title status line must not ghost through.
      if (shotMode) status('');
    }

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('start-btn').addEventListener('click', startPlaying);
    document.getElementById('resume-btn').addEventListener('click', resumePlaying);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('newgame-btn').addEventListener('click', newGame);
    document.getElementById('continue-btn').addEventListener('click', function () {
      hideOverlays();
      state = 'playing';
      CK.input.requestLock(canvas);
    });

    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function spawnPlayerCar(x, z, yaw) {
    var car = CK.vehicles.createCar(x, z, yaw, { name: 'sedan' });
    scene.add(car.mesh);
    return car;
  }

  function showTitle() {
    state = 'title';
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    status('Coral Keys — click Start to play. Click the game to lock the mouse.');
  }

  function hideOverlays() {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  }

  function startPlaying() {
    CK.audio.unlock();
    CK.audio.startMusic();
    // Load a save if one exists, otherwise start fresh.
    var data = CK.save.read();
    if (data) {
      CK.save.apply(player, data);
      CK.missions.setMessage('Save loaded. Welcome back to Coral Keys.', 4);
    }
    hideOverlays();
    state = 'playing';
    CK.input.requestLock(canvas);
    status('Playing Coral Keys. ' + (CK.missions.current() ? CK.missions.current().objective : 'Free roam.'));
  }

  function resumePlaying() {
    hideOverlays();
    state = 'playing';
    CK.input.requestLock(canvas);
  }

  function newGame() {
    CK.save.clear();
    completeShown = false;
    player = CK.player.create();
    CK.player.setState(player);
    CK.missions.setIndex(0);
    CK.police.setWanted(0);
    hideOverlays();
    state = 'playing';
    CK.input.requestLock(canvas);
    CK.missions.setMessage('New game. Meet Marisol at Coral Bait & Tackle.', 5);
  }

  function restartGame() {
    newGame();
  }

  function endScreen(title, text) {
    state = title === 'BUSTED' ? 'busted' : 'complete';
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-text').textContent = text;
    document.getElementById('end-screen').style.display = 'flex';
    if (document.exitPointerLock) document.exitPointerLock();
    CK.audio.stopSiren();
  }

  function shoot() {
    CK.audio.shoot();
    gunshotAt = { x: player.pos.x, z: player.pos.z };
    // Raycast from the camera centre.
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    var targets = [];
    CK.traffic.allPeds().forEach(function (p) { targets.push(p.mesh); });
    CK.vehicles.all().forEach(function (c) { targets.push(c.mesh); });
    var hits = raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      var hit = hits[0];
      var obj = hit.object;
      while (obj.parent && obj.parent !== scene) obj = obj.parent;
      // Panic nearby pedestrians.
      CK.traffic.allPeds().forEach(function (p) {
        var d = Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z);
        if (d < 25) p.panic = 4;
      });
      CK.police.addHeat(18);
      status('Shot fired — the heat is on.');
    } else {
      CK.police.addHeat(6);
    }
  }

  function tryEnterCar() {
    if (player.inCar) {
      CK.player.exitCar();
      status('You got out of the car.');
      return;
    }
    var car = CK.vehicles.nearestCar(player.pos, 4.5);
    if (car) {
      var wasParked = !car.driver;
      CK.player.enterCar(car);
      if (wasParked) {
        CK.police.addHeat(14);
        CK.missions.setMessage('You stole the ' + car.name + '! The heat is on.', 4);
      }
      status('Driving the ' + car.name + '.');
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (state === 'title') {
      // Slow cinematic pan along the main street for the title screen.
      // Small sway only, so the camera stays on the road at eye level.
      var t = now * 0.00008;
      var tc = titleCamera || { x: 0, y: 3.2, z: -60, yaw: Math.PI, pitch: -0.04 };
      camera.position.set(tc.x + Math.sin(t) * 8, tc.y, tc.z + Math.cos(t) * 4);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = tc.yaw + Math.sin(t) * 0.08;
      camera.rotation.x = tc.pitch;
      camera.rotation.z = 0;
      CK.traffic.update(dt, CK.world, player.pos, null);
      renderer.render(scene, camera);
      return;
    }

    if (state !== 'playing') {
      renderer.render(scene, camera);
      return;
    }

    // Global keys.
    if (CK.input.wasPressed('KeyP')) {
      state = 'paused';
      document.getElementById('pause-screen').style.display = 'flex';
      if (document.exitPointerLock) document.exitPointerLock();
      return;
    }
    if (CK.input.wasPressed('KeyM')) {
      CK.audio.setMuted(!CK.audio.isMuted());
      status(CK.audio.isMuted() ? 'Sound muted.' : 'Sound on.');
    }
    if (CK.input.wasPressed('KeyQ')) {
      var ok = CK.save.write(player);
      status(ok ? 'Game saved.' : 'Save failed.');
      CK.missions.setMessage(ok ? 'Game saved.' : 'Save failed.', 3);
    }
    if (CK.input.wasPressed('KeyN')) {
      newGame();
      return;
    }
    if (CK.input.wasPressed('KeyE')) {
      tryEnterCar();
    }

    // Update simulation.
    CK.player.update(dt, CK.input, CK.world, CK.vehicles, shoot);
    if (player.inCar) {
      CK.vehicles.drive(dt, CK.input, CK.world, player.inCar);
      CK.vehicles.applyDriverCamera(camera, player.inCar);
    } else {
      CK.player.applyCamera(camera);
    }
    CK.traffic.update(dt, CK.world, player.pos, gunshotAt);
    gunshotAt = null;
    CK.police.update(dt, player);
    CK.missions.check(player, dt);
    CK.hud.update(dt, player);

    if (player.health <= 0) {
      CK.audio.busted();
      endScreen('BUSTED', 'The sheriff caught up with you in Coral Keys. Your story ends here — for now.');
      return;
    }
    if (CK.missions.getIndex() >= 3 && state === 'playing' && !completeShown) {
      // Story complete: show the end screen once; free roam continues
      // when the player picks "Keep roaming".
      completeShown = true;
      endScreen('STORY COMPLETE', 'You finished all three missions in Coral Keys. Free roam continues — the city is yours.');
      return;
    }

    renderer.render(scene, camera);
  }

  return { init: init, spawnPlayerCar: spawnPlayerCar };
})();

window.addEventListener('DOMContentLoaded', function () {
  CK.game.init();
});
