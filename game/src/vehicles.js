// Cars: one shared body for traffic, parked cars, police cruisers and
// whatever Kai is driving. A car is a point with an angle and a speed; the
// renderer draws the body, and traffic steers the ones with drivers.
import { CAR } from './config.js';
import { clampToWorld, collideBuildings } from './world.js';

export function makeCar(x, y, angle, color, kind, driver) {
  return {
    x, y, angle, speed: 0, color, kind,
    driver, // 'parked' | 'traffic' | 'player' | 'police'
    radius: CAR.radius,
    health: 100,
    wrecked: false,
    stolenByPlayer: false,
    // Traffic cars remember their lane so they can hold it.
    lane: null,
    laneOffset: 0,
  };
}

/** Drive a car for one step: throttle from -1 to 1, steering from -1 to 1. */
export function driveCar(car, throttle, steer, dt, city) {
  if (car.wrecked) return;
  const onRoad = city.isOnRoad(car.x, car.y);
  const grip = onRoad ? 1 : CAR.offroadFactor;
  if (throttle > 0) car.speed += CAR.accel * grip * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * grip * throttle * dt;
  }
  // Rolling drag, stronger off the road.
  car.speed -= car.speed * (onRoad ? 0.55 : 1.4) * dt;
  if (car.speed > CAR.maxSpeed * grip) car.speed = CAR.maxSpeed * grip;
  if (car.speed < -CAR.maxReverse) car.speed = -CAR.maxReverse;
  // Steering only bites while moving, and flips when reversing.
  const direction = car.speed >= 0 ? 1 : -1;
  car.angle += steer * CAR.turnRate * direction * Math.min(1, Math.abs(car.speed) / 140) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  collideBuildings(city, car);
  clampToWorld(car, 24);
}

/** Two cars bumping: both shed speed, and a hard hit dents them. */
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = a.radius + b.radius - 6;
  if (dist === 0 || dist >= min) return false;
  const nx = dx / dist;
  const ny = dy / dist;
  const push = (min - dist) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const impact = Math.abs(a.speed - b.speed);
  a.speed *= 0.6;
  b.speed *= 0.6;
  if (impact > 120) {
    a.health -= 8;
    b.health -= 8;
    if (a.health <= 0) a.wrecked = true;
    if (b.health <= 0) b.wrecked = true;
  }
  return true;
}

/** A bullet hitting a car: dents it; a wrecked car stops for good. */
export function shootCar(car, damage) {
  car.health -= damage;
  car.speed *= 0.7;
  if (car.health <= 0) {
    car.wrecked = true;
    car.speed = 0;
  }
}
