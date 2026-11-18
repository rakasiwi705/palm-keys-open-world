// Coral Keys — story missions.
// Three original missions with a 3D beacon marking the objective in the
// world (a tall glowing cylinder) plus HUD text. All characters and places
// are original.
var CK = window.CK || {};
CK.missions = (function () {
  var cfg = CK.config;
  var scene = null;
  var beacon = null;
  var index = 0; // 0,1,2 missions, 3 = story complete (free roam)
  var stage = 0; // sub-step inside a mission
  var carryingCrate = false;
  var message = '';
  var messageUntil = 0;

  var defs = [
    {
      title: 'MEET MARISOL',
      objective: 'Meet Marisol at Coral Bait & Tackle',
      hint: 'Walk with WASD, get in a car with E. Follow the yellow beacon.',
      target: { x: cfg.places.baitShop.x, z: cfg.places.baitShop.z },
      reward: 50,
      doneText: 'Marisol has work for you. +$50'
    },
    {
      title: 'THE DOCK DROP',
      objective: 'Pick up the crate at Marina Pier',
      hint: 'Head south to the pier. The crate is not yours to open.',
      target: { x: cfg.places.pier.x, z: 168 },
      reward: 150,
      doneText: 'Crate delivered to Sunset Motel. +$150'
    },
    {
      title: 'HEAT ON THE KEYS',
      objective: 'Lose the heat — reach the Old Boatyard',
      hint: 'Three stars! The sheriff is on your tail — keep driving!',
      target: { x: cfg.places.boatyard.x, z: cfg.places.boatyard.z },
      reward: 300,
      doneText: 'You slipped the sheriff. Story complete — free roam! +$300'
    }
  ];

  function init(s) {
    scene = s;
    // Beacon: a tall translucent 3D cylinder marking the objective.
    var geo = new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true);
    var mat = new THREE.MeshBasicMaterial({
      color: 0xf5d76e, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false
    });
    beacon = new THREE.Mesh(geo, mat);
    beacon.position.y = 30;
    scene.add(beacon);
    showMission(0);
  }

  function current() {
    return index < defs.length ? defs[index] : null;
  }

  // Objective and hint change with the mission step: once the crate is
  // picked up, the goal is the delivery, not the pickup.
  function objectiveText() {
    var m = current();
    if (!m) return 'Explore Coral Keys.';
    if (index === 1 && stage === 1) return 'Deliver the crate to Sunset Motel';
    return m.objective;
  }

  function hintText() {
    var m = current();
    if (!m) return 'Steal a car with E. Watch the heat.';
    if (index === 1 && stage === 1) return 'Drive it there. The crate is not yours to open.';
    return m.hint;
  }

  function showMission(i) {
    index = i;
    stage = 0;
    carryingCrate = false;
    var m = current();
    if (!m) {
      if (beacon) beacon.visible = false;
      setMessage('Free roam — Coral Keys is yours.');
      return;
    }
    if (index === 2) CK.police.setWanted(3);
    if (beacon) {
      beacon.visible = true;
      beacon.position.x = m.target.x;
      beacon.position.z = m.target.z;
    }
  }

  function setMessage(text, seconds) {
    message = text;
    messageUntil = performance.now() + (seconds || 4) * 1000;
  }

  function getMessage() {
    return performance.now() < messageUntil ? message : '';
  }

  function targetPos() {
    var m = current();
    if (!m) return null;
    if (index === 1 && stage === 1) {
      return { x: cfg.places.motel.x, z: cfg.places.motel.z };
    }
    return m.target;
  }

  function check(player, dt) {
    var m = current();
    if (!m) return;
    var t = targetPos();
    var d = Math.hypot(player.pos.x - t.x, player.pos.z - t.z);
    if (index === 1 && stage === 0) {
      // Mission 2, step 1: reach the pier and pick up the crate.
      if (d < 5) {
        stage = 1;
        carryingCrate = true;
        setMessage('Crate picked up — deliver it to Sunset Motel.', 4);
        CK.audio.pickup();
        if (beacon) {
          beacon.position.x = cfg.places.motel.x;
          beacon.position.z = cfg.places.motel.z;
        }
      }
      return;
    }
    if (d < 6) complete(player);
  }

  function complete(player) {
    var m = current();
    if (!m) return;
    player.money += m.reward;
    CK.audio.missionDone();
    setMessage(m.doneText, 5);
    CK.audio.pickup();
    if (index === 1) carryingCrate = false;
    showMission(index + 1);
  }

  function getIndex() { return index; }
  function getStage() { return stage; }
  function isCarrying() { return carryingCrate; }

  function setIndex(i) {
    showMission(i);
  }

  // Jump mission 2 straight to "carrying the crate" (used by the
  // deterministic screenshot scene so the crate state is visible).
  function pickupCrate() {
    if (index !== 1) return;
    stage = 1;
    carryingCrate = true;
    if (beacon) {
      beacon.position.x = cfg.places.motel.x;
      beacon.position.z = cfg.places.motel.z;
    }
  }

  return {
    init: init,
    current: current,
    check: check,
    targetPos: targetPos,
    getMessage: getMessage,
    setMessage: setMessage,
    getIndex: getIndex,
    getStage: getStage,
    isCarrying: isCarrying,
    setIndex: setIndex,
    pickupCrate: pickupCrate,
    objectiveText: objectiveText,
    hintText: hintText,
    defs: defs
  };
})();
