// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent sprite_store
//@input Component.ScriptComponent canvas
//@input Component.ScriptComponent sprite_manager


try {

// AR Arena Shooter with stationary enemies and raycast shooting

// State
var screenSize;
var player;
var enemies = [];
var score = 0;

// Config
var enemyCount = 8;
var ringRadius; // pixels
var playerSize;
var enemySize;
var projectileFlashTime = 0.08; // seconds
var lastShotTime = 0;
var shootCooldown = 0.25; // seconds
var aimAngle = 0; // radians

// Visuals
var hudCanvas;
var hudSprite;
var muzzleCanvas;
var muzzleSprite;

// Utilities
function vec2Clamp(v, minX, minY, maxX, maxY) {
    var x = v.x;
    var y = v.y;
    if (x < minX) { x = minX; }
    if (y < minY) { y = minY; }
    if (x > maxX) { x = maxX; }
    if (y > maxY) { y = maxY; }
    return new vec2(x, y);
}

function normalize(v) {
    var len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) {
        return new vec2(0, 0);
    }
    return new vec2(v.x / len, v.y / len);
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function rayAABBIntersect(rayOrigin, rayDir, minPt, maxPt) {
    // Slab method for 2D AABB
    var tmin = -9999999;
    var tmax = 9999999;

    // X slab
    if (rayDir.x !== 0) {
        var tx1 = (minPt.x - rayOrigin.x) / rayDir.x;
        var tx2 = (maxPt.x - rayOrigin.x) / rayDir.x;
        var tminX = Math.min(tx1, tx2);
        var tmaxX = Math.max(tx1, tx2);
        if (tminX > tmin) { tmin = tminX; }
        if (tmaxX < tmax) { tmax = tmaxX; }
    } else {
        if (rayOrigin.x < minPt.x || rayOrigin.x > maxPt.x) {
            return null;
        }
    }

    // Y slab
    if (rayDir.y !== 0) {
        var ty1 = (minPt.y - rayOrigin.y) / rayDir.y;
        var ty2 = (maxPt.y - rayOrigin.y) / rayDir.y;
        var tminY = Math.min(ty1, ty2);
        var tmaxY = Math.max(ty1, ty2);
        if (tminY > tmin) { tmin = tminY; }
        if (tmaxY < tmax) { tmax = tmaxY; }
    } else {
        if (rayOrigin.y < minPt.y || rayOrigin.y > maxPt.y) {
            return null;
        }
    }

    if (tmax >= Math.max(0, tmin)) {
        if (tmax < 0) {
            return null;
        }
        var tHit = tmin;
        if (tHit < 0) {
            tHit = tmax;
        }
        return tHit;
    }

    return null;
}

function createPlayer() {
    player = script.sprite_manager.createSprite("Player");
    player.texture = script.sprite_store.getTexture("player");
    player.stretchMode = StretchMode.Fit;
    player.size = new vec2(playerSize, playerSize);
    player.position = new vec2(screenSize.x * 0.5, screenSize.y * 0.6);
    player.zIndex = 10;
}

function spawnEnemies() {
    // Spawn enemies on a ring around player
    var center = player.position;
    for (var i = 0; i < enemyCount; i = i + 1) {
        var angle = (i / enemyCount) * Math.PI * 2;
        var dir = new vec2(Math.cos(angle), Math.sin(angle));
        var pos = new vec2(center.x + dir.x * ringRadius, center.y + dir.y * ringRadius);

        var enemy = script.sprite_manager.createSprite("Enemy_" + i);
        enemy.texture = script.sprite_store.getTexture("enemy");
        enemy.stretchMode = StretchMode.Fit;
        enemy.size = new vec2(enemySize, enemySize);
        enemy.position = pos;
        enemy.zIndex = 5;
        enemy.data = {
            alive: true
        };
        enemies.push(enemy);
    }
}

function setupHUD() {
    // Simple HUD canvas for score
    hudCanvas = script.canvas.createCanvas(400, 100);
    hudCanvas.background(0, 0, 0, 0);
    hudCanvas.noStroke();
    hudCanvas.fill(255);
    hudCanvas.textSize(36);
    hudCanvas.textAlign('left', 'top');
    hudCanvas.text("Score: 0", 10, 10);

    hudSprite = script.sprite_manager.createSprite("HUD");
    hudSprite.texture = hudCanvas.getTexture();
    hudSprite.size = hudCanvas.getSize();
    hudSprite.position = new vec2(20 + hudCanvas.getWidth() * 0.5, 20 + hudCanvas.getHeight() * 0.5);
    hudSprite.zIndex = 100;
}

function updateHUD() {
    if (!hudCanvas) {
        return;
    }
    hudCanvas.background(0, 0, 0, 0);
    hudCanvas.noStroke();
    hudCanvas.fill(255);
    hudCanvas.textSize(36);
    hudCanvas.textAlign('left', 'top');
    hudCanvas.text("Score: " + String(score), 10, 10);
}

function setupMuzzleFlash() {
    muzzleCanvas = script.canvas.createCanvas(200, 200);
    muzzleCanvas.background(0, 0, 0, 0);
    var c = muzzleCanvas;
    c.noStroke();
    c.fill(255, 220, 80, 220);
    var cx = 100;
    var cy = 100;
    c.circle(cx, cy, 60);
    c.fill(255, 255, 255, 180);
    c.circle(cx, cy, 30);

    muzzleSprite = script.sprite_manager.createSprite("Muzzle");
    muzzleSprite.texture = muzzleCanvas.getTexture();
    muzzleSprite.size = muzzleCanvas.getSize();
    muzzleSprite.position = player.position;
    muzzleSprite.visible = false;
    muzzleSprite.zIndex = 20;
}

function showMuzzleFlash() {
    if (!muzzleSprite) {
        return;
    }
    muzzleSprite.visible = true;
    muzzleSprite.position = player.position;

    var evt = script.createEvent("DelayedCallbackEvent");
    evt.bind(function() {
        muzzleSprite.visible = false;
    });
    evt.reset(projectileFlashTime);
}

function tryShootRay() {
    var now = new Date().getTime() * 0.001;
    if (now - lastShotTime < shootCooldown) {
        return;
    }
    lastShotTime = now;

    var origin = player.position;
    var dir = new vec2(Math.cos(aimAngle), Math.sin(aimAngle));
    dir = normalize(dir);

    // Find closest enemy hit by ray
    var closestT = 9999999;
    var hitEnemyIndex = -1;

    for (var i = 0; i < enemies.length; i = i + 1) {
        var e = enemies[i];
        if (!e || !e.data || !e.data.alive) {
            continue;
        }
        // Axis-aligned bounds based on size and center position
        var halfW = e.size.x * 0.5;
        var halfH = e.size.y * 0.5;
        var minPt = new vec2(e.position.x - halfW, e.position.y - halfH);
        var maxPt = new vec2(e.position.x + halfW, e.position.y + halfH);

        var t = rayAABBIntersect(origin, dir, minPt, maxPt);
        if (t !== null) {
            if (t >= 0 && t < closestT) {
                closestT = t;
                hitEnemyIndex = i;
            }
        }
    }

    if (hitEnemyIndex !== -1) {
        var hit = enemies[hitEnemyIndex];
        if (hit && hit.data && hit.data.alive) {
            hit.data.alive = false;
            hit.visible = false;
            hit.destroy();
            enemies.splice(hitEnemyIndex, 1);
            score = score + 1;
            updateHUD();
            showHitEffectAlongRay(origin, dir, closestT);
        }
    } else {
        showShotLine(origin, dir);
        showMuzzleFlash();
    }
}

function showShotLine(origin, dir) {
    // Quick transient line via on-screen canvas drawn directly
    var lineCanvas = script.canvas.createOnScreenCanvas();
    var w = lineCanvas.getWidth();
    var h = lineCanvas.getHeight();
    lineCanvas.background(0, 0, 0, 0);
    lineCanvas.stroke(255, 255, 120, 220);
    lineCanvas.strokeWeight(4);

    // Convert origin and far point to screen pixels
    var far = 2000;
    var end = new vec2(origin.x + dir.x * far, origin.y + dir.y * far);
    var p0 = vec2Clamp(origin, 0, 0, screenSize.x, screenSize.y);
    var p1 = vec2Clamp(end, 0, 0, screenSize.x, screenSize.y);

    lineCanvas.line(p0.x, p0.y, p1.x, p1.y);

    var evt = script.createEvent("DelayedCallbackEvent");
    evt.bind(function() {
        lineCanvas.destroy();
    });
    evt.reset(0.08);
    showMuzzleFlash();
}

function showHitEffectAlongRay(origin, dir, t) {
    var impact = new vec2(origin.x + dir.x * t, origin.y + dir.y * t);

    var fxCanvas = script.canvas.createOnScreenCanvas();
    fxCanvas.background(0, 0, 0, 0);
    fxCanvas.noStroke();
    fxCanvas.fill(255, 80, 60, 230);
    fxCanvas.circle(impact.x, impact.y, 28);
    fxCanvas.fill(255, 255, 255, 200);
    fxCanvas.circle(impact.x, impact.y, 14);

    var evt = script.createEvent("DelayedCallbackEvent");
    evt.bind(function() {
        fxCanvas.destroy();
    });
    evt.reset(0.12);

    showMuzzleFlash();
}

function setupAimAndShootControls() {
    // Aim with face yaw proxy via head movement is not available in this context.
    // Implement simple auto-aim oscillation and mouth open to shoot.
    // Note: We do not have access to face expression events in provided blocks.
    // Fallback: Auto rotate aim; tap-to-shoot would require touchManager which is not provided.
    // To satisfy "triggered by user actions", use a timed shoot prompt and allow smiles/frowns if available would be ideal.
    // Since not available, we will auto-rotate aim and shoot on a cadence when the user smiles is not possible, so allow periodic cooldown via Update and require tap is not supported either.
    // Limitation noted above.

    var updateEvt = script.createEvent("UpdateEvent");
    updateEvt.bind(function() {
        // Auto-rotate aim slowly
        var t = new Date().getTime() * 0.001;
        aimAngle = t * 0.6;

        // Keep muzzle sprite at player
        if (muzzleSprite) {
            muzzleSprite.position = player.position;
        }
    });
}

// Game init
script.createEvent("OnStartEvent").bind(function() {
    screenSize = script.sprite_manager.getScreenSize();

    playerSize = Math.min(screenSize.x, screenSize.y) * 0.12;
    enemySize = Math.min(screenSize.x, screenSize.y) * 0.1;
    ringRadius = Math.min(screenSize.x, screenSize.y) * 0.35;

    // Scene setup
    createPlayer();
    spawnEnemies();
    setupHUD();
    setupMuzzleFlash();
    setupAimAndShootControls();

    // Fire on smile/frown/mouth if available: Not accessible from provided blocks.
    // Provide an auto-fire loop using DelayedCallbackEvent so user sees behavior.
    function autoFireLoop() {
        tryShootRay();
        var loopEvt = script.createEvent("DelayedCallbackEvent");
        loopEvt.bind(function() {
            autoFireLoop();
        });
        loopEvt.reset(shootCooldown);
    }
    autoFireLoop();
});

} catch(e) {
  print("error in controller");
  print(e);
}
