// The Keys County sheriff: wanted stars, patrol cruisers that chase Kai,
// and deputies on foot when he runs. Heat rises with crimes and cools when
// Kai stays clean and out of sight.
import { POLICE, WORLD } from './config.js';
import { makeCar } from './vehicles.js';
import { clampToWorld, collideBuildings } from './world.js';

export const EVENT_BUSTED = 1;
export const EVENT_WANTED_UP = 2;

/** Raise the heat by one star (at most three) and note when it happened. */
export function raiseWanted(state, amount) {
  const before = state.wanted;
  state.wanted = Math.min(3, state.wanted + amount);
  state.lastCrimeAt = state.elapsed;
  return state.wanted > before ? EVENT_WANTED_UP : 0;
}

/** A cruiser enters at the map edge, on a road, aimed roughly at Kai. */
function spawnCruiser(state, random) {
  const player = state.player;
  const edge = Math.floor(random() * 4);
  let x;
  let y;
  if (edge === 0) { x = player.x; y = 60; }
  else if (edge === 1) { x = player.x; y = WORLD.height - 60; }
  else if (edge === 2) { x = 60; y = player.y; }
  else { x = WORLD.width - 60; y = player.y; }
  x = Math.max(80, Math.min(WORLD.width - 80, x));
  y = Math.max(80, Math.min(WORLD.height - 80, y));
  const car = makeCar(x, y, Math.atan2(player.y - y, player.x - x), '#20242e', 'police', 'police');
  car.siren = true;
  car.chaseSide = random() < 0.5 ? -1 : 1;
  state.cars.push(car);
  return car;
}

/**
 * A cruiser steers toward its target with a simple pursuit turn. It aims at
 * a point beside the target, not straight at its nose: a cruiser driving
 * head-on into its quarry just locks bumpers with it, while one pulling
 * alongside can ram it off the road.
 */
function chaseTarget(car, target, dt, city) {
  const heading = target.angle !== undefined ? target.angle : 0;
  const side = car.chaseSide || 1;
  const aimX = target.x + Math.cos(heading + (Math.PI / 2) * side) * 70;
  const aimY = target.y + Math.sin(heading + (Math.PI / 2) * side) * 70;
  const dist = Math.hypot(target.x - car.x, target.y - car.y);
  const desired = Math.atan2(aimY - car.y, aimX - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2));
  // The shared car physics, at full throttle, steered toward the target.
  const onRoad = city.isOnRoad(car.x, car.y);
  const grip = onRoad ? 1 : 0.45;
  // Ease off once alongside the target instead of ramming it forever.
  const throttle = dist < 90 ? 0.3 : 1;
  car.speed += POLICE.accel * grip * throttle * dt;
  car.speed -= car.speed * 0.4 * dt;
  if (car.speed > POLICE.maxSpeed * grip) car.speed = POLICE.maxSpeed * grip;
  car.angle += steer * POLICE.turnRate * Math.min(1, Math.abs(car.speed) / 140) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  collideBuildings(city, car);
  clampToWorld(car, 24);
}

export function updatePolice(state, dt, random) {
  const player = state.player;
  const target = player.inCar || player;
  const cruisers = state.cars.filter((c) => c.driver === 'police' && !c.wrecked);
  const wantedCars = state.wanted === 0 ? 0 : Math.min(POLICE.maxCars, state.wanted + 1);

  // Keep the right number of cruisers on the road while Kai is wanted.
  if (cruisers.length < wantedCars && state.spawnTimer <= 0) {
    spawnCruiser(state, random);
    state.spawnTimer = 1.2;
  }
  if (state.spawnTimer > 0) state.spawnTimer -= dt;

  // Cruisers chase; when Kai is on foot and one gets close, a deputy steps
  // out and chases on foot instead.
  for (const cruiser of cruisers) {
    chaseTarget(cruiser, target, dt, state.city);
    const dist = Math.hypot(target.x - cruiser.x, target.y - cruiser.y);
    if (!player.inCar && dist < 130 && state.officers.length < 2 && state.officerTimer <= 0) {
      state.officers.push({
        x: cruiser.x, y: cruiser.y, vx: 0, vy: 0, radius: 12,
        shirt: '#20242e', speed: 235, target: null, wait: 0, panicked: 0, walkCycle: 0, officer: true,
      });
      state.officerTimer = 3;
    }
  }
  if (state.officerTimer > 0) state.officerTimer -= dt;

  // Deputies run Kai down and rough him up on contact.
  for (const officer of state.officers) {
    const dx = player.x - officer.x;
    const dy = player.y - officer.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      officer.vx = (dx / d) * officer.speed;
      officer.vy = (dy / d) * officer.speed;
    }
    officer.x += officer.vx * dt;
    officer.y += officer.vy * dt;
    officer.walkCycle += dt * 8;
  }

  // Heat cools: thirty quiet seconds with no cruiser nearby drops one star.
  if (state.wanted > 0 && state.elapsed - state.lastCrimeAt > 30) {
    const nearest = cruisers.reduce((best, c) => Math.min(best, Math.hypot(c.x - target.x, c.y - target.y)), Infinity);
    if (nearest > 500) {
      state.wanted -= 1;
      state.lastCrimeAt = state.elapsed;
    }
  }

  // No wanted level: cruisers and deputies stand down and drive off.
  if (state.wanted === 0) {
    for (const cruiser of cruisers) cruiser.driver = 'traffic';
    state.officers.length = 0;
  }
}

/** A cruiser ramming Kai's car, or a deputy catching him on foot. */
export function policeContactDamage(state) {
  const player = state.player;
  const target = player.inCar || player;
  let damage = 0;
  for (const car of state.cars) {
    if (car.driver !== 'police' || car.wrecked) continue;
    const d = Math.hypot(car.x - target.x, target.y - target.y);
    if (d < car.radius + target.radius + 4 && Math.abs(car.speed) > 60) damage += 6;
  }
  if (!player.inCar) {
    for (const officer of state.officers) {
      if (Math.hypot(officer.x - player.x, officer.y - player.y) < 30) damage += 12;
    }
  }
  return damage;
}
