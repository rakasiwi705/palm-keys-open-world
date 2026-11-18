// Traffic and pedestrians: the city alive around Kai. Traffic cars hold
// their lane on one road and wrap around the map; pedestrians stroll the
// sidewalks, wait at corners, and run from gunfire and speeding cars.
import { CAR_COLORS, H_ROADS, PED_SHIRTS, ROAD_WIDTH, V_ROADS, WORLD } from './config.js';
import { makeCar } from './vehicles.js';
import { clampToWorld, collideBuildings } from './world.js';

function choose(random, list) {
  return list[Math.floor(random() * list.length)];
}

function makeTrafficCar(random, city) {
  const horizontal = random() < 0.5;
  const road = horizontal ? choose(random, H_ROADS) : choose(random, V_ROADS);
  const direction = random() < 0.5 ? 1 : -1;
  const laneOffset = 34;
  let car;
  if (horizontal) {
    car = makeCar(60 + random() * (WORLD.width - 120), road + (direction > 0 ? laneOffset : -laneOffset), direction > 0 ? 0 : Math.PI, choose(random, CAR_COLORS), random() < 0.25 ? 'pickup' : 'sedan', 'traffic');
    car.lane = { axis: 'h', at: road, direction };
  } else {
    car = makeCar(road + (direction > 0 ? laneOffset : -laneOffset), 60 + random() * (WORLD.height - 120), direction > 0 ? Math.PI / 2 : -Math.PI / 2, choose(random, CAR_COLORS), random() < 0.25 ? 'pickup' : 'sedan', 'traffic');
    car.lane = { axis: 'v', at: road, direction };
  }
  car.laneOffset = laneOffset;
  car.cruiseSpeed = 95 + random() * 55;
  car.speed = car.cruiseSpeed;
  return car;
}

export function spawnTraffic(random, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) cars.push(makeTrafficCar(random, city));
  return cars;
}

/** A traffic car holds its lane, slows for the car ahead, and wraps at the edge. */
export function updateTraffic(cars, dt, city, allCars) {
  for (const car of cars) {
    if (car.driver !== 'traffic' || car.wrecked || !car.lane) continue;
    const lane = car.lane;
    // Slow for a moving car ahead in the same lane. Parked cars are street
    // furniture: traffic drives past them instead of queuing forever.
    let targetSpeed = car.cruiseSpeed || 120;
    for (const other of allCars) {
      if (other === car || other.wrecked || other.driver === 'parked') continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 90 && side < 40) { targetSpeed = 0; break; }
    }
    if (car.speed < targetSpeed) car.speed = Math.min(targetSpeed, car.speed + 130 * dt);
    else if (car.speed > targetSpeed) car.speed = Math.max(targetSpeed, car.speed - 320 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the map edge so the streets never run dry.
    if (lane.axis === 'h') {
      if (car.x < -80) car.x = WORLD.width + 80;
      if (car.x > WORLD.width + 80) car.x = -80;
    } else {
      if (car.y < -80) car.y = WORLD.height + 80;
      if (car.y > WORLD.height + 80) car.y = -80;
    }
  }
}

function makePedestrian(random, city) {
  const road = city.nearestRoadPoint(100 + random() * (WORLD.width - 200), 100 + random() * (WORLD.height - 200));
  let x;
  let y;
  if (road.axis === 'h') {
    x = 100 + random() * (WORLD.width - 200);
    y = road.at + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 16);
  } else {
    x = road.at + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 16);
    y = 100 + random() * (WORLD.height - 200);
  }
  return {
    x, y, vx: 0, vy: 0, radius: 12,
    shirt: choose(random, PED_SHIRTS),
    speed: 38 + random() * 26,
    target: null,
    wait: random() * 2,
    panicked: 0,
    down: 0,
    walkCycle: random() * 6,
  };
}

export function spawnPedestrians(random, city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) peds.push(makePedestrian(random, city));
  return peds;
}

/** A new sidewalk stroll target near the pedestrian's current road. */
function pickStrollTarget(ped, city, random) {
  const road = city.nearestRoadPoint(ped.x, ped.y);
  const side = random() < 0.5 ? -1 : 1;
  const offset = ROAD_WIDTH / 2 + 16;
  if (road.axis === 'h') {
    return { x: 80 + random() * (WORLD.width - 160), y: road.at + side * offset };
  }
  return { x: road.at + side * offset, y: 80 + random() * (WORLD.height - 160) };
}

export function updatePedestrians(peds, dt, city, random, threats) {
  for (const ped of peds) {
    // Knocked down: stay on the ground until the timer runs out.
    if (ped.down > 0) {
      ped.down -= dt;
      ped.vx = 0;
      ped.vy = 0;
      continue;
    }
    // Panic: run away from the nearest threat (gunfire, a speeding car).
    let fleeX = 0;
    let fleeY = 0;
    for (const threat of threats) {
      const dx = ped.x - threat.x;
      const dy = ped.y - threat.y;
      const d = Math.hypot(dx, dy);
      if (d < 260 && d > 1) {
        fleeX += (dx / d) * (260 - d);
        fleeY += (dy / d) * (260 - d);
      }
    }
    if (fleeX !== 0 || fleeY !== 0) {
      ped.panicked = 1.5;
      const len = Math.hypot(fleeX, fleeY);
      ped.vx = (fleeX / len) * ped.speed * 2.2;
      ped.vy = (fleeY / len) * ped.speed * 2.2;
    } else if (ped.panicked > 0) {
      ped.panicked -= dt;
      ped.vx *= 0.9;
      ped.vy *= 0.9;
    } else if (ped.wait > 0) {
      ped.wait -= dt;
      ped.vx = 0;
      ped.vy = 0;
    } else {
      if (!ped.target) ped.target = pickStrollTarget(ped, city, random);
      const dx = ped.target.x - ped.x;
      const dy = ped.target.y - ped.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) {
        ped.target = null;
        ped.wait = 1 + random() * 3;
        ped.vx = 0;
        ped.vy = 0;
      } else {
        ped.vx = (dx / d) * ped.speed;
        ped.vy = (dy / d) * ped.speed;
      }
    }
    ped.x += ped.vx * dt;
    ped.y += ped.vy * dt;
    ped.walkCycle += dt * 8;
    collideBuildings(city, ped);
    clampToWorld(ped, 20);
  }
}
