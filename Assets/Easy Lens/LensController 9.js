// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent cube3d_spawner


try {

// AR Arena Shooter with stationary 3D enemies (cubes as placeholders) and raycast shooting in AR

// State
var enemies = [];
var score = 0;

// Config
var enemyCount = 8;
var ringRadiusMeters = 2.0; // distance from camera in AR space (meters)
var enemyUniformScale = 0.35; // scale for cube enemies
var shootCooldown = 0.25; // seconds
var lastShotTime = 0;
var aimYaw = 0; // radians, around Y axis

// Math utils
function vec3Add(a, b) { return new vec3(a.x + b.x, a.y + b.y, a.z + b.z); }
function vec3Sub(a, b) { return new vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
function vec3Dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function vec3Len(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }
function vec3Scale(a, s) { return new vec3(a.x * s, a.y * s, a.z * s); }
function vec3Norm(a) { var l = vec3Len(a); if (l === 0) { return new vec3(0, 0, 0); } return new vec3(a.x / l, a.y / l, a.z / l); }

// 3D Ray vs AABB intersection (returns distance t, or null)
function rayAABB3D(origin, dir, minB, maxB) {
    var tmin = -9999999;
    var tmax = 9999999;

    // X slab
    if (dir.x !== 0) {
        var tx1 = (minB.x - origin.x) / dir.x;
        var tx2 = (maxB.x - origin.x) / dir.x;
        var tminX = Math.min(tx1, tx2);
        var tmaxX = Math.max(tx1, tx2);
        if (tminX > tmin) { tmin = tminX; }
        if (tmaxX < tmax) { tmax = tmaxX; }
    } else {
        if (origin.x < minB.x || origin.x > maxB.x) { return null; }
    }

    // Y slab
    if (dir.y !== 0) {
        var ty1 = (minB.y - origin.y) / dir.y;
        var ty2 = (maxB.y - origin.y) / dir.y;
        var tminY = Math.min(ty1, ty2);
        var tmaxY = Math.max(ty1, ty2);
        if (tminY > tmin) { tmin = tminY; }
        if (tmaxY < tmax) { tmax = tmaxY; }
    } else {
        if (origin.y < minB.y || origin.y > maxB.y) { return null; }
    }

    // Z slab
    if (dir.z !== 0) {
        var tz1 = (minB.z - origin.z) / dir.z;
        var tz2 = (maxB.z - origin.z) / dir.z;
        var tminZ = Math.min(tz1, tz2);
        var tmaxZ = Math.max(tz1, tz2);
        if (tminZ > tmin) { tmin = tminZ; }
        if (tmaxZ < tmax) { tmax = tmaxZ; }
    } else {
        if (origin.z < minB.z || origin.z > maxB.z) { return null; }
    }

    if (tmax >= Math.max(0, tmin)) {
        if (tmax < 0) { return null; }
        var tHit = tmin;
        if (tHit < 0) { tHit = tmax; }
        return tHit;
    }
    return null;
}

function spawnEnemiesInRadius(center, radius, count) {
    // Clear previous
    script.cube3d_spawner.clear();
    enemies = [];

    // Spawn enemies on a horizontal ring around the given center at radius distance
    for (var i = 0; i < count; i = i + 1) {
        var angle = (i / count) * Math.PI * 2;
        var dirXZ = new vec3(Math.cos(angle), 0, Math.sin(angle));
        var offset = vec3Scale(dirXZ, radius);
        var pos = new vec3(center.x + offset.x, center.y + offset.y, center.z + offset.z);

        var color = new vec4(0.85, 0.2, 0.2, 1.0);
        var rot = new vec3(0, angle + Math.PI, 0);
        var scale = new vec3(enemyUniformScale, enemyUniformScale, enemyUniformScale);

        var cube = script.cube3d_spawner.spawnCube(pos, color, rot, scale);
        script.cube3d_spawner.enableCube(cube);

        enemies.push({
            cube: cube,
            alive: true,
            // Local AABB in cube space at unit scale, scaled uniformly later
            halfExtent: enemyUniformScale * 0.5 // treating cube of size 1, uniform scale
        });
    }
}

function tryShootRayFromCamera(center) {
    var now = new Date().getTime() * 0.001;
    if (now - lastShotTime < shootCooldown) { return; }
    lastShotTime = now;

    // Camera is at origin looking down -Z. Build direction from current aimYaw around Y.
    var dir = new vec3(Math.sin(aimYaw), 0, -Math.cos(aimYaw));
    dir = vec3Norm(dir);
    var origin = new vec3(center.x, center.y, center.z);

    var closestT = 9999999;
    var hitIndex = -1;

    for (var i = 0; i < enemies.length; i = i + 1) {
        var e = enemies[i];
        if (!e.alive) { continue; }

        // Retrieve cube transform via stored spawn parameters is not available from the block.
        // We will maintain positions by re-deriving from spawn ring using index ordering.
        var angle = (i / enemyCount) * Math.PI * 2;
        var dirXZ = new vec3(Math.cos(angle), 0, Math.sin(angle));
        var pos = vec3Scale(dirXZ, ringRadiusMeters);

        var h = e.halfExtent;
        var minB = new vec3(pos.x - h, pos.y - h, pos.z - h);
        var maxB = new vec3(pos.x + h, pos.y + h, pos.z + h);

        var t = rayAABB3D(origin, dir, minB, maxB);
        if (t !== null) {
            if (t >= 0 && t < closestT) {
                closestT = t;
                hitIndex = i;
            }
        }
    }

    if (hitIndex !== -1) {
        enemies[hitIndex].alive = false;
        script.cube3d_spawner.disableCube(enemies[hitIndex].cube);
        score = score + 1;
    }
}

function setupAimAndInteraction(center) {
    var updateEvt = script.createEvent("UpdateEvent");
    updateEvt.bind(function() {
        // Auto scan aim left-right
        var t = new Date().getTime() * 0.001;
        aimYaw = Math.sin(t * 0.6) * 0.8;

        // Face-player: rotate each enemy cube to look at the camera at 'center' (camera assumed looking -Z)
        for (var i = 0; i < enemies.length; i = i + 1) {
            var e = enemies[i];
            if (!e.alive) { continue; }
            // Recompute spawned position on ring (kept static)
            var angle = (i / enemyCount) * Math.PI * 2;
            var dirXZ = new vec3(Math.cos(angle), 0, Math.sin(angle));
            var offset = vec3Scale(dirXZ, ringRadiusMeters);
            var pos = new vec3(center.x + offset.x, center.y + offset.y, center.z + offset.z);

            // Direction from enemy to camera at origin
            var toCam = new vec3(center.x - pos.x, center.y - pos.y, center.z - pos.z);
            // Compute yaw angle to face camera in XZ plane
            var yaw = Math.atan2(toCam.x, -toCam.z);
            // Keep cube upright: only Y rotation
            script.cube3d_spawner.setRotation(e.cube, new vec3(0, yaw, 0));
        }
    });

    // Auto-fire loop to demonstrate interaction; replace with face/tap input when available
    function loopFire() {
        tryShootRayFromCamera(center);
        var evt = script.createEvent("DelayedCallbackEvent");
        evt.bind(function() { loopFire(); });
        evt.reset(shootCooldown);
    }
    loopFire();
}

// Init
script.createEvent("OnStartEvent").bind(function() {
    // Ensure spawner is enabled
    script.cube3d_spawner.enabled = true;

    var center = new vec3(0, 0, 0);
    spawnEnemiesInRadius(center, ringRadiusMeters, enemyCount);
    setupAimAndInteraction(center);
});

} catch(e) {
  print("error in controller");
  print(e);
}
