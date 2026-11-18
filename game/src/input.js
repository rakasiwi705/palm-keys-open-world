// Keyboard input for Coral Keys. Held keys steer and drive; one-shot presses
// (enter a car, shoot, pause, save) are queued as flags and taken once by the
// loop, so a press between two frames is never lost or counted twice.

export const ACTION_ENTER_CAR = 1;
export const ACTION_SHOOT = 2;
export const ACTION_PAUSE = 4;
export const ACTION_CONFIRM = 8;
export const ACTION_SAVE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;

  function queue(event, flag) {
    if (!event.repeat) actions |= flag;
    event.preventDefault();
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (event.code === 'KeyE') queue(event, ACTION_ENTER_CAR);
    else if (event.code === 'KeyF') queue(event, ACTION_SHOOT);
    else if (event.code === 'KeyP' || event.code === 'Escape') queue(event, ACTION_PAUSE);
    else if (event.code === 'Space' || event.code === 'Enter') queue(event, ACTION_CONFIRM);
    else if (event.code === 'KeyQ') queue(event, ACTION_SAVE);
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Steering axes, each -1, 0 or 1. */
    axes() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** For scripted scenes: pretend these keys are held (used by shots). */
    setHeld(next) {
      held.up = !!next.up;
      held.down = !!next.down;
      held.left = !!next.left;
      held.right = !!next.right;
    },
  };
}
