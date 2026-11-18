// Coral Keys — procedural WebAudio sound.
// Every sound is synthesised in code (oscillators + noise). No audio files.
var CK = window.CK || {};
CK.audio = (function () {
  var ctx = null;
  var master = null;
  var muted = false;
  var engineOsc = null;
  var engineGain = null;
  var musicTimer = null;
  var musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
  }

  function isMuted() { return muted; }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
    var g = ctx.createGain();
    g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  function shoot() {
    noiseBurst(0.14, 0.5, 2500);
    tone(180, 0.1, 'square', 0.18, 60);
  }

  function pickup() {
    tone(660, 0.12, 'sine', 0.25);
    setTimeout(function () { tone(880, 0.18, 'sine', 0.25); }, 110);
  }

  function missionDone() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.22, 'triangle', 0.25); }, i * 130);
    });
  }

  function busted() {
    tone(220, 0.5, 'sawtooth', 0.2, 110);
    setTimeout(function () { tone(165, 0.7, 'sawtooth', 0.2, 82); }, 400);
  }

  // Two-tone police siren, looping while wanted.
  var sirenTimer = null;
  function startSiren() {
    if (sirenTimer || !ensure()) return;
    var high = true;
    sirenTimer = setInterval(function () {
      if (muted) return;
      tone(high ? 950 : 700, 0.4, 'sine', 0.07);
      high = !high;
    }, 420);
  }
  function stopSiren() {
    if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
  }

  // Engine hum: one oscillator whose pitch follows speed.
  function engine(speed01) {
    if (!ensure()) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain.gain.value = 0;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 500;
      engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
    }
    engineOsc.frequency.value = 45 + speed01 * 110;
    engineGain.gain.value = muted ? 0 : 0.02 + speed01 * 0.06;
  }

  // Island music: a slow major arpeggio loop.
  var islandNotes = [262, 330, 392, 523, 392, 330];
  function startMusic() {
    if (musicTimer || !ensure()) return;
    musicTimer = setInterval(function () {
      if (muted) return;
      tone(islandNotes[musicStep % islandNotes.length], 0.5, 'triangle', 0.06);
      musicStep++;
    }, 520);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return {
    unlock: unlock,
    setMuted: setMuted,
    isMuted: isMuted,
    shoot: shoot,
    pickup: pickup,
    missionDone: missionDone,
    busted: busted,
    startSiren: startSiren,
    stopSiren: stopSiren,
    engine: engine,
    startMusic: startMusic,
    stopMusic: stopMusic
  };
})();
