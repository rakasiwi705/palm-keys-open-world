// Coral Keys — keyboard + mouse input for FPS play.
// Pointer lock for mouse look; in screenshot mode the camera is driven by
// code instead of the mouse.
var CK = window.CK || {};
CK.input = (function () {
  var keys = {};
  var lookDX = 0;
  var lookDY = 0;
  var locked = false;
  var shotMode = false;
  var pressed = {}; // edge-triggered keys, consumed once per frame

  function isDown(code) { return !!keys[code]; }

  function wasPressed(code) {
    if (pressed[code]) { pressed[code] = false; return true; }
    return false;
  }

  function consumeLook() {
    var d = { dx: lookDX, dy: lookDY };
    lookDX = 0; lookDY = 0;
    return d;
  }

  function isLocked() { return locked; }
  function isShotMode() { return shotMode; }

  function setShotMode(v) { shotMode = v; }

  function requestLock(el) {
    if (shotMode) return;
    try {
      if (el.requestPointerLock) el.requestPointerLock();
    } catch (e) { /* pointer lock unavailable */ }
  }

  function init(canvas) {
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      keys[e.code] = true;
      pressed[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
    });
    window.addEventListener('blur', function () {
      keys = {};
    });
    document.addEventListener('pointerlockchange', function () {
      locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', function (e) {
      if (!locked) return;
      lookDX += e.movementX || 0;
      lookDY += e.movementY || 0;
    });
    canvas.addEventListener('click', function () {
      requestLock(canvas);
    });
  }

  return {
    init: init,
    isDown: isDown,
    wasPressed: wasPressed,
    consumeLook: consumeLook,
    isLocked: isLocked,
    isShotMode: isShotMode,
    setShotMode: setShotMode,
    requestLock: requestLock
  };
})();
