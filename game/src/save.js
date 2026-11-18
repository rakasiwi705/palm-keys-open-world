// Coral Keys — save / load via localStorage.
var CK = window.CK || {};
CK.save = (function () {
  var KEY = 'coral-keys-save-v1';

  function write(player) {
    try {
      var data = {
        x: player.pos.x,
        z: player.pos.z,
        yaw: player.yaw,
        health: player.health,
        money: player.money,
        mission: CK.missions.getIndex(),
        wanted: CK.police.getWanted(),
        savedAt: Date.now()
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function has() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function apply(player, data) {
    if (!data) return false;
    player.pos.set(data.x, 0, data.z);
    player.yaw = data.yaw;
    player.health = data.health;
    player.money = data.money;
    CK.missions.setIndex(data.mission || 0);
    if (data.wanted) CK.police.setWanted(data.wanted);
    return true;
  }

  return { write: write, read: read, has: has, clear: clear, apply: apply };
})();
