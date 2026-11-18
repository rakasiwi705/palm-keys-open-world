// The screenshot scenes behind ?shot=start|street|chase|mission. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a waypoint autopilot that drives along the road grid, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { H_ROADS, STEP, V_ROADS } from './config.js';
import { stepGame } from './state.js';
import { makeCar } from './vehicles.js';
import { ACTION_ENTER_CAR, ACTION_SHOOT } from './input.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const FLAGS = { ENTER: ACTION_ENTER_CAR, SHOOT: ACTION_SHOOT };
const START_SECONDS = 6;
const STREET_SECONDS = 11;
const CHASE_SECONDS = 9;
const MISSION_SECONDS = 7;

/** Road-grid waypoints from (sx, sy) to (tx, ty): along roads, never through blocks. */
function roadWaypoints(sx, sy, tx, ty) {
  const nearestH = (y) => H_ROADS.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
  const nearestV = (x) => V_ROADS.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  const iy0 = nearestH(sy);
  const ix1 = nearestV(tx);
  const iy1 = nearestH(ty);
  return [
    { x: sx, y: iy0 },
    { x: ix1, y: iy0 },
    { x: ix1, y: iy1 },
    { x: tx, y: iy1 },
    { x: tx, y: ty },
  ];
}

/** Steer a car toward a waypoint: throttle on, turn toward the target angle. */
function driveToward(car, waypoint) {
  const desired = Math.atan2(waypoint.y - car.y, waypoint.x - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { x: Math.max(-1, Math.min(1, diff * 2.5)), y: -1 };
}

/** Run the game forward for `seconds`, steering with `steer(state)` each step. */
function simulate(state, seconds, steer) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const axes = steer(state) || { x: 0, y: 0 };
    stepGame(state, STEP, axes, 0, FLAGS);
  }
}

function waypointDriver(waypoints) {
  let index = 0;
  return (state) => {
    const car = state.player.inCar;
    if (!car) return { x: 0, y: 0 };
    while (index < waypoints.length - 1 && Math.hypot(waypoints[index].x - car.x, waypoints[index].y - car.y) < 80) index += 1;
    return driveToward(car, waypoints[index]);
  };
}

/** Put Kai in a fresh car of his own on the road at (x, y), facing `angle`. */
function giveCar(state, x, y, angle, color) {
  const car = makeCar(x, y, angle, color, 'sedan', 'player');
  car.stolenByPlayer = true;
  state.cars.push(car);
  state.player.inCar = car;
  state.player.x = x;
  state.player.y = y;
  return car;
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * start: the title screen over a live street. street: Kai walking the main
 * street. chase: a three-star police chase. mission: the dock-drop delivery.
 */
export function stageShot(name, game) {
  if (name === 'street') {
    game.player.x = 600;
    game.player.y = 816;
    game.player.vx = 0;
    game.player.vy = 0;
    simulate(game, STREET_SECONDS, () => ({ x: 1, y: 0 }));
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'chase') {
    giveCar(game, 500, 1400, 0, '#d94f3d');
    game.wanted = 3;
    game.lastCrimeAt = game.elapsed;
    game.message = 'Three stars! The sheriff is on your tail — keep driving!';
    game.messageTimer = 99;
    // A long run east, then north: the frame catches the chase mid-flight,
    // cruisers behind the player on the open road, not piled on a building.
    const waypoints = roadWaypoints(500, 1400, 2800, 400);
    simulate(game, CHASE_SECONDS, waypointDriver(waypoints));
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'mission') {
    game.missionIndex = 1;
    game.hasPackage = true;
    giveCar(game, 2900, 1900, Math.PI, '#3d7fd9');
    game.message = 'Deliver the crate to Sunset Motel — quietly.';
    game.messageTimer = 99;
    const waypoints = roadWaypoints(2900, 1900, 300, 1400);
    simulate(game, MISSION_SECONDS, waypointDriver(waypoints));
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // start (and any unknown name): a living street behind the title panel.
  simulate(game, START_SECONDS, () => ({ x: 0, y: 0 }));
  game.camera.x = 1600;
  game.camera.y = 1750;
  return { screen: SCREEN_TITLE, best: 0 };
}
