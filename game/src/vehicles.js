// Coral Keys — cars.
// Every car is a 3D model built from boxes and cylinders: body, cabin,
// wheels, headlights. No image textures. Driving is first-person from the
// driver's seat; the camera looks out through the windshield.
var CK = window.CK || {};
CK.vehicles = (function () {
  var cfg = CK.config;
  var pal = cfg.palette;
  var cars = [];

  function buildCarMesh(color, isPolice) {
    var g = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color });
    var glass = new THREE.MeshLambertMaterial({ color: 0x1c2b33 });
    var dark = new THREE.MeshLambertMaterial({ color: 0x181818 });

    var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
    cabin.position.set(0, 1.1, -0.2);
    cabin.castShadow = true;
    g.add(cabin);
    var hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.0), paint);
    hood.position.set(0, 0.9, 1.6);
    g.add(hood);
    // Wheels: 3D cylinders rotated to face sideways.
    var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
    [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(p[0], 0.36, p[1]);
      w.castShadow = true;
      g.add(w);
    });
    // Headlights: small emissive 3D spheres at the front.
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    [-0.6, 0.6].forEach(function (x) {
      var l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lightMat);
      l.position.set(x, 0.62, 2.22);
      g.add(l);
    });
    if (isPolice) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x222222 }));
      bar.position.set(0, 1.45, -0.2);
      g.add(bar);
      var red = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      red.position.set(-0.35, 1.58, -0.2);
      g.add(red);
      var blue = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
      blue.position.set(0.35, 1.58, -0.2);
      g.add(blue);
      g.userData.lightRed = red;
      g.userData.lightBlue = blue;
    }
    return g;
  }

  function createCar(x, z, yaw, opts) {
    opts = opts || {};
    var color = opts.color !== undefined ? opts.color : pal.carColors[Math.floor(Math.random() * pal.carColors.length)];
    var mesh = buildCarMesh(color, !!opts.police);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    var car = {
      mesh: mesh,
      pos: new THREE.Vector3(x, 0, z),
      yaw: yaw,
      speed: 0,
      steer: 0,
      color: color,
      police: !!opts.police,
      driver: opts.driver || null, // 'player' | 'traffic' | 'police' | null (parked)
      name: opts.name || 'sedan',
      route: opts.route || null,
      routeIndex: 0,
      stuck: 0
    };
    cars.push(car);
    return car;
  }

  function removeCar(car, scene) {
    var i = cars.indexOf(car);
    if (i >= 0) cars.splice(i, 1);
    if (scene) scene.remove(car.mesh);
  }

  function nearestCar(pos, maxDist) {
    var best = null, bestD = maxDist;
    cars.forEach(function (c) {
      var d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  // Player driving: arcade physics, first-person camera from the seat.
  function drive(dt, input, world, car) {
    var accel = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) accel = cfg.driveAccel;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) accel = -cfg.driveBrake;
    var steer = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer = 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer = -1;
    car.speed += accel * dt;
    // Drag + rolling resistance.
    car.speed -= car.speed * 0.55 * dt;
    if (Math.abs(car.speed) < 0.1 && accel === 0) car.speed = 0;
    car.speed = Math.max(-14, Math.min(cfg.driveMaxSpeed, car.speed));
    var turn = steer * cfg.driveTurn * dt * Math.min(1, Math.abs(car.speed) / 8);
    if (car.speed < 0) turn = -turn;
    car.yaw += turn;
    var nx = car.pos.x - Math.sin(car.yaw) * car.speed * dt;
    var nz = car.pos.z - Math.cos(car.yaw) * car.speed * dt;
    var hit = world.collideCircle(nx, nz, 2.0);
    if (!hit) {
      car.pos.x = nx; car.pos.z = nz;
    } else {
      car.speed *= -0.25; // bounce off the wall, slow down
    }
    var cl = world.clampToCity(car.pos.x, car.pos.z);
    car.pos.x = cl.x; car.pos.z = cl.z;
    car.mesh.position.set(car.pos.x, 0, car.pos.z);
    car.mesh.rotation.y = car.yaw;
  }

  function applyDriverCamera(camera, car) {
    // Eye position inside the cabin, near the windshield top, so the hood
    // only fills a thin strip at the bottom of the view.
    var fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
    camera.position.set(
      car.pos.x + fx * 0.85,
      1.72,
      car.pos.z + fz * 0.85
    );
    camera.rotation.order = 'YXZ';
    camera.rotation.y = car.yaw;
    camera.rotation.x = 0;
    camera.rotation.z = 0;
  }

  function syncMesh(car) {
    car.mesh.position.set(car.pos.x, 0, car.pos.z);
    car.mesh.rotation.y = car.yaw;
  }

  function all() { return cars; }
  function clear() { cars.length = 0; }

  return {
    createCar: createCar,
    removeCar: removeCar,
    nearestCar: nearestCar,
    drive: drive,
    applyDriverCamera: applyDriverCamera,
    syncMesh: syncMesh,
    all: all,
    clear: clear
  };
})();
