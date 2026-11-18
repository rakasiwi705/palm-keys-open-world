// The simulation core of Coral Keys: one game state, one step function. It
// owns the player, the cars, the pedestrians, the police, the missions and
// the clock, and it knows nothing about drawing or the browser — the loop in
// main.js feeds it input and reads back events.
import { PLAYER, WORLD } from './config.js';
import { createCity } from './world.js';
import { createPlayer, damagePlayer, enterCar, exitCar, fireBullet, nearestEnterableCar, updatePlayerOnFoot } from './player.js';
import { collideCars, driveCar, makeCar, shootCar } from './vehicles.js';
import { spawnPedestrians, spawnTraffic, updatePedestrians, updateTraffic } from './traffic.js';
import { policeContactDamage, raiseWanted, updatePolice } from './police.js';
import { updateMissions } from './missions.js';

export const EVENT_BUSTED = 1;
export const EVENT_MISSION = 2;
export const EVENT_PICKUP = 4;
export const EVENT_SHOT = 8;
export const EVENT_CRIME = 16;

export function createGame(random) {
  const city = createCity(random);
  const player = createPlayer(700, 810);
  const cars = city.parkedCars.map((p) => makeCar(p.x, p.y, p.angle, p.color, p.kind, 'parked'));
  cars.push(...spawnTraffic(random, city, 14));
  const peds = spawnPedestrians(random, city, 24);
  return {
    city,
    player,
    cars,
    peds,
    officers: [],
    bullets: [],
    wanted: 0,
    lastCrimeAt: -999,
    elapsed: 0,
    clock: 13 * 3600 + 47 * 60, // a warm afternoon, like the reference street
    day: 1,
    missionIndex: 0,
    hasPackage: false,
    mission3Started: false,
    storyDone: false,
    shellsCollected: 0,
    message: 'Welcome to Coral Keys. Meet Marisol at the bait shop — follow the yellow marker.',
    messageTimer: 7,
    spawnTimer: 0,
    officerTimer: 0,
    shootTimer: 0,
    camera: { x: 700, y: 810 },
    random,
  };
}

function commitCrime(state, amount) {
  raiseWanted(state, amount);
  return EVENT_CRIME;
}

/** One fixed step of the whole game. `actions` are ACTION_* flags from input. */
export function stepGame(state, dt, axes, actions, inputFlags) {
  let events = 0;
  const player = state.player;
  state.elapsed += dt;
  state.clock += dt * 60; // one real second is one game minute
  if (state.clock >= 24 * 3600) { state.clock -= 24 * 3600; state.day += 1; }
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.shootTimer > 0) state.shootTimer -= dt;

  // --- Climb in or out of a car ---
  if (actions & inputFlags.ENTER) {
    if (player.inCar) {
      exitCar(player, player.inCar);
    } else {
      const car = nearestEnterableCar(player, state.cars, 90);
      if (car) {
        const wasPolice = car.kind === 'police';
        const freshTheft = !car.stolenByPlayer && car.driver !== 'player';
        enterCar(player, car);
        if (wasPolice) {
          events |= commitCrime(state, 2);
          state.message = 'You jacked a police cruiser! The whole county is coming.';
          state.messageTimer = 4;
        } else if (freshTheft) {
          car.stolenByPlayer = true;
          events |= commitCrime(state, 1);
          state.message = 'You stole a car! Lose the heat or keep driving.';
          state.messageTimer = 4;
        }
      }
    }
  }

  // --- Shoot on foot, or honk from a car ---
  if (actions & inputFlags.SHOOT) {
    if (player.inCar) {
      events |= EVENT_SHOT; // the loop plays the horn for this
    } else if (state.shootTimer <= 0 && state.bullets.length < 8) {
      state.bullets.push(fireBullet(player));
      state.shootTimer = 0.25;
      events |= EVENT_SHOT;
    }
  }

  // --- Move the player ---
  if (player.inCar) {
    const car = player.inCar;
    const throttle = axes.y < 0 ? 1 : axes.y > 0 ? -1 : 0;
    driveCar(car, throttle, axes.x, dt, state.city);
    player.x = car.x;
    player.y = car.y;
    player.facing = car.angle;
  } else {
    updatePlayerOnFoot(player, axes, dt, state.city);
  }

  // --- Bullets fly, and hit buildings, cars, pedestrians and deputies ---
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < WORLD.width && b.y > 0 && b.y < WORLD.height);
  for (const bullet of state.bullets) {
    // A building stops a bullet.
    const hitWall = state.city.buildings.some((b) => bullet.x > b.x && bullet.x < b.x + b.w && bullet.y > b.y && bullet.y < b.y + b.h);
    if (hitWall) { bullet.life = 0; continue; }
    for (const car of state.cars) {
      if (car.wrecked) continue;
      if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < car.radius) {
        shootCar(car, 34);
        bullet.life = 0;
        if (car.kind === 'police' && !car.shotReported) {
          car.shotReported = true;
          events |= commitCrime(state, 1);
        }
        break;
      }
    }
    if (bullet.life <= 0) continue;
    for (const ped of state.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 18) {
        ped.down = 5;
        ped.vx = 0;
        ped.vy = 0;
        bullet.life = 0;
        events |= commitCrime(state, 1);
        state.message = 'You shot a bystander! The sheriff is on the way.';
        state.messageTimer = 4;
        break;
      }
    }
    if (bullet.life <= 0) continue;
    for (let i = 0; i < state.officers.length; i += 1) {
      const officer = state.officers[i];
      if (Math.hypot(officer.x - bullet.x, officer.y - bullet.y) < 18) {
        state.officers.splice(i, 1);
        bullet.life = 0;
        events |= commitCrime(state, 1);
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  // --- Traffic, pedestrians, police ---
  updateTraffic(state.cars, dt, state.city, state.cars);
  const threats = state.bullets.map((b) => ({ x: b.x, y: b.y }));
  if (player.inCar && Math.abs(player.inCar.speed) > 260) threats.push({ x: player.x, y: player.y });
  updatePedestrians(state.peds, dt, state.city, state.random, threats);
  updatePolice(state, dt, state.random);

  // --- Car-to-car bumps ---
  for (let i = 0; i < state.cars.length; i += 1) {
    for (let j = i + 1; j < state.cars.length; j += 1) {
      collideCars(state.cars[i], state.cars[j]);
    }
  }

  // --- Cars hitting people, and traffic clipping Kai on foot ---
  for (const car of state.cars) {
    if (car.wrecked) continue;
    for (const ped of state.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(car.x - ped.x, car.y - ped.y) < car.radius + 10 && Math.abs(car.speed) > 80) {
        ped.down = 5;
        ped.vx = 0;
        ped.vy = 0;
        if (car.driver === 'player') {
          events |= commitCrime(state, 1);
          state.message = 'You ran someone over! The sheriff is on the way.';
          state.messageTimer = 4;
        }
      }
    }
    if (!player.inCar && car.driver === 'traffic' && Math.hypot(car.x - player.x, car.y - player.y) < car.radius + player.radius && Math.abs(car.speed) > 60) {
      if (damagePlayer(player, 20)) events |= EVENT_BUSTED;
      player.x += (player.x - car.x) * 0.4;
      player.y += (player.y - car.y) * 0.4;
    }
  }

  // --- Police contact damage ---
  const contact = policeContactDamage(state);
  if (contact > 0 && damagePlayer(player, contact * dt * 2)) events |= EVENT_BUSTED;

  // --- Seashells on the beach ---
  for (const shell of state.city.shells) {
    if (!shell.taken && Math.hypot(shell.x - player.x, shell.y - player.y) < 34) {
      shell.taken = true;
      state.shellsCollected += 1;
      player.cash += 10;
      events |= EVENT_PICKUP;
      state.message = `Found a seashell! +$10 (${state.shellsCollected} found)`;
      state.messageTimer = 3;
    }
  }

  // --- Missions ---
  if (updateMissions(state)) events |= EVENT_MISSION;

  // --- Slow health recovery when nobody is after Kai ---
  if (state.wanted === 0 && player.health > 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 3 * dt);
  }

  // --- The camera follows Kai, clamped to the world ---
  const target = player.inCar || player;
  const viewW = 1280;
  const viewH = 720;
  const wantX = Math.max(viewW / 2, Math.min(WORLD.width - viewW / 2, target.x));
  const wantY = Math.max(viewH / 2, Math.min(WORLD.height - viewH / 2, target.y));
  // A slightly stiffer follow than the first draft: the camera keeps up
  // with a fast car without lagging a full block behind.
  state.camera.x += (wantX - state.camera.x) * Math.min(1, dt * 6);
  state.camera.y += (wantY - state.camera.y) * Math.min(1, dt * 6);

  return events;
}
