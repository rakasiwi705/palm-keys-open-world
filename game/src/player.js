// Kai Marlin on foot: walking, facing, shooting, and climbing in and out
// of cars. Driving itself lives in vehicles.js.
import { CAR, PLAYER } from './config.js';
import { clampToWorld, collideBuildings } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, radius: PLAYER.radius,
    facing: 0, // radians, the direction Kai is looking
    health: PLAYER.maxHealth,
    cash: 25,
    inCar: null, // the car Kai is driving, or null while on foot
    hurtTimer: 0,
    walkCycle: 0,
  };
}

/** Walk with the WASD axes; friction stops Kai when no key is held down. */
export function updatePlayerOnFoot(player, axes, dt, city) {
  const ax = axes.x;
  const ay = axes.y;
  const len = Math.hypot(ax, ay);
  if (len > 0) {
    player.vx += (ax / len) * PLAYER.accel * dt;
    player.vy += (ay / len) * PLAYER.accel * dt;
    player.facing = Math.atan2(ay, ax);
    player.walkCycle += dt * 10;
  }
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > PLAYER.walkSpeed) {
    player.vx = (player.vx / speed) * PLAYER.walkSpeed;
    player.vy = (player.vy / speed) * PLAYER.walkSpeed;
  } else if (len === 0 && speed > 0) {
    const drop = PLAYER.friction * dt;
    if (speed <= drop) { player.vx = 0; player.vy = 0; }
    else { player.vx -= (player.vx / speed) * drop; player.vy -= (player.vy / speed) * drop; }
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  collideBuildings(city, player);
  clampToWorld(player, 20);
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
}

/** The closest car Kai can climb into — parked, traffic or police. */
export function nearestEnterableCar(player, cars, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const car of cars) {
    if (car.wrecked) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestDistance) { bestDistance = d; best = car; }
  }
  return best;
}

/** Climb into a car: Kai disappears inside it and drives from then on. */
export function enterCar(player, car) {
  player.inCar = car;
  car.driver = 'player';
  player.vx = 0;
  player.vy = 0;
  return car;
}

/** Step out beside the car, on the side away from the road centre. */
export function exitCar(player, car) {
  const side = Math.PI / 2;
  player.x = car.x + Math.cos(car.angle + side) * 48;
  player.y = car.y + Math.sin(car.angle + side) * 48;
  player.vx = 0;
  player.vy = 0;
  player.inCar = null;
  car.driver = 'parked';
  clampToWorld(player, 20);
}

/** One pistol round in the facing direction. Returns the bullet, or null. */
export function fireBullet(player) {
  return {
    x: player.x + Math.cos(player.facing) * 22,
    y: player.y + Math.sin(player.facing) * 22,
    vx: Math.cos(player.facing) * 700,
    vy: Math.sin(player.facing) * 700,
    life: 0.9,
    from: 'player',
  };
}

/** Hurt Kai; returns true when his health reaches zero. */
export function damagePlayer(player, amount) {
  if (player.hurtTimer > 0) return false;
  player.health -= amount;
  player.hurtTimer = 0.6;
  if (player.health <= 0) {
    player.health = 0;
    return true;
  }
  return false;
}

export { CAR };
