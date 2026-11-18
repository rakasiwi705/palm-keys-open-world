// Boot and the one loop for Coral Keys: input is read every frame, the town
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between five screens: title, play, paused, busted and story
// complete. A saved game can be continued from the title screen.
//
// ?seed=N fixes the town layout. ?shot=start|street|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame, EVENT_BUSTED, EVENT_MISSION, EVENT_PICKUP, EVENT_SHOT, stepGame } from './state.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_SAVE, ACTION_SHOOT, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { drawHud } from './hud.js';
import { stageShot } from './shots.js';
import { initAudio, playHorn, playMissionDone, playPickup, playShot, toggleMute, updateEngine } from './audio.js';
import { hasSave, loadGame, saveGame } from './save.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const INPUT_FLAGS = { ENTER: ACTION_ENTER_CAR, SHOOT: ACTION_SHOOT };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(createRandom(seed));
// Exposed for scripted play-tests and debugging; the game never reads it.
window.__coralKeys = game;
const renderer = createRenderer(canvas);
renderer.draw.onHud = drawHud;

function applySave(data) {
  game.player.cash = data.cash;
  game.player.health = data.health;
  game.missionIndex = data.missionIndex;
  game.hasPackage = !!data.hasPackage;
  game.player.x = data.x;
  game.player.y = data.y;
  game.clock = data.clock;
  game.day = data.day;
  game.shellsCollected = data.shells || 0;
  game.storyDone = !!data.storyDone;
  game.camera.x = data.x;
  game.camera.y = data.y;
  game.message = `Save loaded — Day ${game.day}, $${game.player.cash}.`;
  game.messageTimer = 5;
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, {});
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let lostCash = 0;
  let audioStarted = false;

  function announce(message) {
    status.textContent = message;
  }

  function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    initAudio();
  }

  function startGame() {
    startAudio();
    if (hasSave()) applySave(loadGame());
    screen = SCREEN_PLAY;
    announce('Playing Coral Keys. Meet Marisol at the bait shop.');
  }

  function newGame() {
    startAudio();
    const fresh = createGame(createRandom(seed));
    Object.assign(game, fresh);
    screen = SCREEN_PLAY;
    announce('A new story in Coral Keys.');
  }

  function bustPlayer() {
    lostCash = Math.min(game.player.cash, Math.max(50, Math.floor(game.player.cash * 0.2)));
    game.player.cash -= lostCash;
    game.player.health = 100;
    game.wanted = 0;
    game.officers.length = 0;
    if (game.player.inCar) {
      game.player.inCar.driver = 'parked';
      game.player.inCar = null;
    }
    // The clinic patches Kai up and the story continues from there.
    game.player.x = 1600;
    game.player.y = 430;
    game.camera.x = 1600;
    game.camera.y = 430;
    screen = SCREEN_BUSTED;
    announce(`Busted. You lost $${lostCash}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_BUSTED) bustPlayer();
    if (events & EVENT_MISSION) {
      playMissionDone();
      if (game.storyDone) screen = SCREEN_COMPLETE;
    }
    if (events & EVENT_PICKUP) playPickup();
    if (events & EVENT_SHOT) {
      if (game.player.inCar) playHorn();
      else playShot();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      startAudio();
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_BUSTED || screen === SCREEN_COMPLETE) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_SAVE && screen === SCREEN_PLAY) {
      if (saveGame(game)) {
        game.message = 'Game saved.';
        game.messageTimer = 3;
      }
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      // The title screen's backdrop is a living town: traffic and pedestrians
      // move, but nothing can hurt Kai and no mission advances.
      const events = stepGame(game, STEP, { x: 0, y: 0 }, 0, INPUT_FLAGS);
      void events;
      return;
    }
    const events = stepGame(game, STEP, input.axes(), actions, INPUT_FLAGS);
    updateEngine(game.player.inCar ? game.player.inCar.speed : 0, game.wanted);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game, screen, { lost: lostCash });
  }

  // Leaving the tab pauses a running game rather than letting the sheriff
  // catch Kai unseen. M toggles the music (handled on keydown via toggleMute
  // in a small listener so it works from every screen).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat) {
      const muted = toggleMute();
      game.message = muted ? 'Sound off.' : 'Sound on.';
      game.messageTimer = 2;
    }
    if (event.code === 'KeyN' && !event.repeat && screen === SCREEN_TITLE) newGame();
  });

  announce('Coral Keys. Press Space or click to start. N starts a new story.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
