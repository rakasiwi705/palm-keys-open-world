// Coral Keys — deterministic screenshot scenes.
// ?shot=start  — title screen over a slow camera pan of the main street.
// ?shot=street — first-person on foot on the main street.
// ?shot=drive  — first-person driving down the main street.
// ?shot=chase  — first-person driving with wanted level 3, police behind.
// ?shot=mission— first-person, mission 2 in progress, carrying the crate.
// In shot mode there is no pointer lock: the camera is driven by code.
var CK = window.CK || {};
CK.shots = (function () {
  var mode = null;

  function getMode() {
    if (mode !== null) return mode;
    try {
      var q = new URLSearchParams(window.location.search);
      mode = q.get('shot');
    } catch (e) {
      mode = null;
    }
    return mode;
  }

  function isShot() { return !!getMode(); }

  // Place the player / camera for the chosen scene. Called after the world
  // and the player exist, before the first frame. Returns the state the
  // game should start in, and (for the title scene) a fixed camera.
  function stage(game) {
    var m = getMode();
    if (!m) return null;
    var player = game.player;
    if (m === 'start') {
      // Title screen: camera at street level on the main street, looking
      // south down the road — eye-level, never a high view.
      return { state: 'title', titleCamera: { x: 0, y: 3.2, z: -60, yaw: Math.PI, pitch: -0.04 } };
    }
    if (m === 'street') {
      player.pos.set(0, 0, -30);
      player.yaw = Math.PI; // face south down the main street
      player.pitch = 0;
      return { state: 'playing' };
    }
    if (m === 'drive') {
      var car = game.spawnPlayerCar(0, -40, Math.PI);
      CK.player.enterCar(car);
      car.speed = 18;
      return { state: 'playing' };
    }
    if (m === 'chase') {
      var chaseCar = game.spawnPlayerCar(0, -40, Math.PI);
      CK.player.enterCar(chaseCar);
      chaseCar.speed = 24;
      CK.police.setWanted(3);
      CK.missions.setIndex(2);
      CK.missions.setMessage('Three stars! The sheriff is on your tail — keep driving!', 10);
      // A cruiser ahead on the same road, head-on, so the chase is visible.
      var headOn = CK.vehicles.createCar(0, 30, 0, { police: true, driver: 'police', color: 0xf2f2f2, name: 'cruiser' });
      game.scene.add(headOn.mesh);
      return { state: 'playing' };
    }
    if (m === 'mission') {
      // Mission 2, second step: crate in hand, on the road east of the
      // motel, facing south — the delivery beacon is visible ahead.
      CK.missions.setIndex(1);
      CK.missions.pickupCrate();
      player.pos.set(160, 0, -20);
      player.yaw = Math.PI; // face south down the road toward Sunset Motel
      player.pitch = 0;
      CK.missions.setMessage('Deliver the crate to Sunset Motel — quietly.', 10);
      return { state: 'playing' };
    }
    return null;
  }

  return { getMode: getMode, isShot: isShot, stage: stage };
})();
