// Coral Keys — traffic cars and pedestrians.
// Traffic cars drive loops along the road grid. Pedestrians are 3D figures
// (cylinder body, sphere head, box legs) walking on sidewalks. On gunfire
// nearby they panic and run away.
var CK = window.CK || {};
CK.traffic = (function () {
  var cfg = CK.config;
  var cars = [];
  var peds = [];
  var scene = null;

  function roadLoop(startLine) {
    // A rectangular loop around the city on two road lines.
    var a = startLine;
    var b = startLine + 80;
    if (b > 160) b = -160;
    return [
      { x: a, z: -160 }, { x: a, z: 160 },
      { x: b, z: 160 }, { x: b, z: -160 }
    ];
  }

  function spawnTrafficCar(line) {
    var route = roadLoop(line);
    var car = CK.vehicles.createCar(route[0].x, route[0].z, 0, { driver: 'traffic', route: route });
    cars.push(car);
    return car;
  }

  function buildPedMesh(shirt, pants, skin) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.85, 8),
      new THREE.MeshLambertMaterial({ color: shirt }));
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshLambertMaterial({ color: skin }));
    head.position.y = 1.68;
    head.castShadow = true;
    g.add(head);
    var legMat = new THREE.MeshLambertMaterial({ color: pants });
    [-0.14, 0.14].forEach(function (x) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), legMat);
      leg.position.set(x, 0.3, 0);
      g.add(leg);
    });
    var armMat = new THREE.MeshLambertMaterial({ color: skin });
    [-0.36, 0.36].forEach(function (x) {
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), armMat);
      arm.position.set(x, 1.05, 0);
      g.add(arm);
    });
    return g;
  }

  var shirts = [0xd2e8f0, 0xf0d2d2, 0xd2f0d2, 0xf0e6c8, 0xe0c8f0, 0xffffff];
  var skins = [0xe8b88a, 0xc98d5f, 0x8a5a34, 0xf0c8a0];

  function spawnPed(x, z) {
    var mesh = buildPedMesh(
      shirts[Math.floor(Math.random() * shirts.length)],
      [0x2e3a4a, 0x4a2e2e, 0x2e4a2e][Math.floor(Math.random() * 3)],
      skins[Math.floor(Math.random() * skins.length)]
    );
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    var ped = {
      mesh: mesh,
      pos: new THREE.Vector3(x, 0, z),
      yaw: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 0.8,
      panic: 0,
      walkPhase: Math.random() * 10,
      target: null
    };
    peds.push(ped);
    return ped;
  }

  function init(s, world) {
    scene = s;
    [-160, -80, 0, 80].forEach(function (line) { spawnTrafficCar(line); });
    world.pedSpawns.forEach(function (p) { spawnPed(p.x, p.z); });
  }

  function updateTraffic(dt, world) {
    cars.forEach(function (car) {
      if (!car.route) return;
      var target = car.route[car.routeIndex];
      var dx = target.x - car.pos.x;
      var dz = target.z - car.pos.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 3) {
        car.routeIndex = (car.routeIndex + 1) % car.route.length;
        return;
      }
      var wantYaw = Math.atan2(-dx, -dz);
      var diff = wantYaw - car.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.yaw += Math.max(-1.4 * dt, Math.min(1.4 * dt, diff));
      car.speed = 9;
      car.pos.x -= Math.sin(car.yaw) * car.speed * dt;
      car.pos.z -= Math.cos(car.yaw) * car.speed * dt;
      CK.vehicles.syncMesh(car);
    });
  }

  function updatePeds(dt, world, playerPos, gunshotAt) {
    peds.forEach(function (ped) {
      if (gunshotAt) {
        var gd = Math.hypot(ped.pos.x - gunshotAt.x, ped.pos.z - gunshotAt.z);
        if (gd < 30) ped.panic = 4;
      }
      if (ped.panic > 0) {
        ped.panic -= dt;
        ped.speed = 5.5;
        // Run away from the player.
        var dx = ped.pos.x - playerPos.x;
        var dz = ped.pos.z - playerPos.z;
        var d = Math.hypot(dx, dz) || 1;
        ped.yaw = Math.atan2(-dx / d, -dz / d);
      } else {
        ped.speed = 1.4;
        if (!ped.target || Math.hypot(ped.target.x - ped.pos.x, ped.target.z - ped.pos.z) < 2) {
          // Wander to a nearby sidewalk point.
          var lines = CK.config.roadLines;
          var line = lines[Math.floor(Math.random() * lines.length)];
          ped.target = {
            x: line + 11 + (Math.random() < 0.5 ? 0 : 0),
            z: -180 + Math.random() * 360
          };
          if (Math.random() < 0.5) {
            ped.target = { x: -180 + Math.random() * 360, z: line + 11 };
          }
        }
        var tx = ped.target.x - ped.pos.x;
        var tz = ped.target.z - ped.pos.z;
        var td = Math.hypot(tx, tz) || 1;
        ped.yaw = Math.atan2(-tx / td, -tz / td);
      }
      ped.pos.x -= Math.sin(ped.yaw) * ped.speed * dt;
      ped.pos.z -= Math.cos(ped.yaw) * ped.speed * dt;
      var cl = world.clampToCity(ped.pos.x, ped.pos.z);
      ped.pos.x = cl.x; ped.pos.z = cl.z;
      ped.walkPhase += dt * ped.speed * 2;
      ped.mesh.position.set(ped.pos.x, Math.abs(Math.sin(ped.walkPhase)) * 0.05, ped.pos.z);
      ped.mesh.rotation.y = ped.yaw;
    });
  }

  function update(dt, world, playerPos, gunshotAt) {
    updateTraffic(dt, world);
    updatePeds(dt, world, playerPos, gunshotAt);
  }

  function allPeds() { return peds; }
  function allCars() { return cars; }

  return {
    init: init,
    update: update,
    allPeds: allPeds,
    allCars: allCars,
    spawnPed: spawnPed
  };
})();
