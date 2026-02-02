// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent spriteStore
//@input Component.ScriptComponent timerText
//@input Component.ScriptComponent canvasUI
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent killCountText
//@input Component.ScriptComponent healthText
//@input Component.ScriptComponent startButton
//@input Component.ScriptComponent restartButton


try {

// Shooter AR game using SpriteManager sprites as enemies and Text blocks for HUD/button UI.
// Note: 3D raycast is not available in provided blocks; we approximate "aim" by tapping the screen center and hit-testing closest enemy to center.

// @input Time and gameplay tuning
// @input int timeLimitSeconds = 180
// @input int initialHealth = 100
// @input int aliveEnemyThreshold = 5
// @input float damagePerSecond = 10.0
// @input float spawnIntervalSec = 1.5
// @input int maxConcurrentEnemies = 12
// @input int totalEnemiesToSpawn = 50
// @input float spawnerDistanceFactor = 0.35
// @input float spawnRadiusFactor = 0.25
// @input string enemySpriteName = "enemy"

// Internal state
let screenSize;
let gameRunning = false;
let gameStarted = false;

let timeRemaining = 0;
let health = 0;
let kills = 0;

let enemies = [];
let enemiesSpawned = 0;

let spawnTimer = 0;
let centerTapCooldown = 0;

let uiUpdateEvent;
let gameUpdateEvent;

// Cached UI helpers
function showStartUI() {
    script.startButton.enabled = true;
    script.restartButton.enabled = false;
    script.timerText.forceSafeRegion(true);
    script.killCountText.forceSafeRegion(true);
    script.healthText.forceSafeRegion(true);
}

function showGameUI() {
    script.startButton.enabled = false;
    script.restartButton.enabled = false;
    script.timerText.forceSafeRegion(true);
    script.killCountText.forceSafeRegion(true);
    script.healthText.forceSafeRegion(true);
}

function showRestartUI() {
    script.startButton.enabled = false;
    script.restartButton.enabled = true;
}

function resetGameState() {
    gameRunning = false;
    gameStarted = false;

    timeRemaining = script.timeLimitSeconds;
    health = script.initialHealth;
    kills = 0;

    enemies = [];
    enemiesSpawned = 0;

    spawnTimer = 0;
    centerTapCooldown = 0;

    script.spriteManager.removeAll();

    updateHUD();

    showStartUI();
}

function updateHUD() {
    script.timerText.text = "Time: " + Math.max(0, Math.floor(timeRemaining)) + "s";
    script.killCountText.text = "Kills: " + kills;
    script.healthText.text = "Health: " + Math.max(0, Math.floor(health));
}

function startGame() {
    if (gameRunning) {
        return;
    }
    gameStarted = true;
    gameRunning = true;
    showGameUI();
}

function endGame() {
    if (!gameRunning) {
        return;
    }
    gameRunning = false;
    showRestartUI();
    script.restartButton.text = "Game Over\nKills: " + kills + "\nTap to Restart";
}

function spawnEnemy() {
    if (enemiesSpawned >= script.totalEnemiesToSpawn) {
        return;
    }
    if (enemies.length >= script.maxConcurrentEnemies) {
        return;
    }

    const enemy = script.spriteManager.createSprite("Enemy_" + enemiesSpawned);

    // Use provided sprite name
    const tex = script.spriteStore.getTexture(script.enemySpriteName);
    if (tex) {
        enemy.texture = tex;
        enemy.stretchMode = StretchMode.Fit;
        const baseW = tex.getWidth();
        const baseH = tex.getHeight();
        const scale = screenSize.x * 0.12 / baseW;
        enemy.size = new vec2(baseW * scale, baseH * scale);
    } else {
        // Fall back to a default size if texture is missing
        enemy.size = new vec2(screenSize.x * 0.12, screenSize.x * 0.12);
    }

    // Compute spawner position in front of player (screen center offset upward)
    const spawnerPos = new vec2(screenSize.x * 0.5, screenSize.y * (0.5 - script.spawnerDistanceFactor));

    // Place enemy around spawner within radius
    const angle = Math.random() * Math.PI * 2;
    const radius = screenSize.x * script.spawnRadiusFactor * (0.5 + Math.random() * 0.5);
    const ex = spawnerPos.x + Math.cos(angle) * radius;
    const ey = spawnerPos.y + Math.sin(angle) * radius;

    enemy.position = new vec2(ex, ey);
    enemy.zIndex = 10;

    enemies.push(enemy);
    enemiesSpawned = enemiesSpawned + 1;
}

function removeEnemyAtIndex(idx) {
    const enemy = enemies[idx];
    if (enemy) {
        enemy.destroy();
    }
    enemies.splice(idx, 1);
}

function tryShoot() {
    if (!gameRunning) {
        return;
    }
    // Cooldown to avoid multi-fire within one frame burst
    if (centerTapCooldown > 0) {
        return;
    }
    centerTapCooldown = 0.1;

    // Simulate "aim" at screen center
    const center = new vec2(screenSize.x * 0.5, screenSize.y * 0.5);

    // Find closest enemy to center within aim tolerance
    let bestIdx = -1;
    let bestDist = 9999999;

    for (let i = 0; i < enemies.length; i++) {
        const spr = enemies[i];
        const pos = spr.toGlobalPosition(new vec2(0, 0));
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
            bestDist = d2;
            bestIdx = i;
        }
    }

    // Aim tolerance in pixels
    const aimTolerance = Math.min(screenSize.x, screenSize.y) * 0.12;
    if (bestIdx >= 0) {
        const pos = enemies[bestIdx].toGlobalPosition(new vec2(0, 0));
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= aimTolerance) {
            // One-shot kill
            removeEnemyAtIndex(bestIdx);
            kills = kills + 1;
            updateHUD();
        }
    }
}

function updateGame(dt) {
    if (!gameRunning) {
        return;
    }

    // Timer
    timeRemaining = timeRemaining - dt;
    if (timeRemaining <= 0) {
        timeRemaining = 0;
        updateHUD();
        endGame();
        return;
    }

    // Spawning
    spawnTimer = spawnTimer - dt;
    if (spawnTimer <= 0) {
        spawnEnemy();
        spawnTimer = script.spawnIntervalSec;
    }

    // Damage if enemies exceed threshold
    if (enemies.length > script.aliveEnemyThreshold) {
        health = health - script.damagePerSecond * dt;
        if (health < 0) {
            health = 0;
        }
    }

    // Cleanup enemies that drift off-screen (not moving here, but safety)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const p = enemies[i].toGlobalPosition(new vec2(0, 0));
        if (p.x < -screenSize.x * 0.5 || p.x > screenSize.x * 1.5 || p.y < -screenSize.y * 0.5 || p.y > screenSize.y * 1.5) {
            removeEnemyAtIndex(i);
        }
    }

    // End game on health zero
    if (health <= 0) {
        updateHUD();
        endGame();
        return;
    }

    // Reduce tap cooldown
    if (centerTapCooldown > 0) {
        centerTapCooldown = Math.max(0, centerTapCooldown - dt);
    }

    updateHUD();
}

// Handle "buttons" using Text blocks as touch targets via center-tap heuristic
function onTouchDown() {
    if (!gameStarted) {
        startGame();
        return;
    }
    if (!gameRunning) {
        // Restart
        resetGameState();
        startGame();
        return;
    }
    // Fire
    tryShoot();
}

// Bind update loops and start
script.createEvent("OnStartEvent").bind(function() {
    screenSize = script.spriteManager.getScreenSize();

    // Initialize HUD content but do not set static properties besides text/visibility dynamically.
    resetGameState();

    // Main update
    gameUpdateEvent = script.createEvent("UpdateEvent");
    gameUpdateEvent.bind(function() {
        const dt = getDeltaTime();
        updateGame(dt);
    });

    // Lightweight UI update if needed (currently HUD updates are event-driven)
    uiUpdateEvent = script.createEvent("UpdateEvent");
    uiUpdateEvent.bind(function() {
        // no-op placeholder for future animations
    });

    // Simple tap detection via center screen heuristic:
    // We don't have Touch Events block; simulate input by polling a "tap intent"
    // Limitation note: Without Touch Events block, we can't get actual touch coordinates.
    // As a workaround, we map any tap intent to calling onTouchDown via center tap below.

    // Create a full-screen onscreen canvas to detect a "frame tap" proxy using its texture changes if needed
    // Not required; instead, listen for smile to start/shoot as a user event alternative if needed.
});

// Optional: map face expression to Start/Shoot as user action if available in broader project
// Since no Face Events block is available in this context, we rely solely on screen taps proxy:
// Implement a minimal interval "auto fire" when game is running to allow testing without touch block.
let autofireTimer = 0;
const autoFireInterval = 1.0;
const secondaryUpdate = script.createEvent("UpdateEvent");
secondaryUpdate.bind(function() {
    const dt = getDeltaTime();
    if (!gameStarted) {
        return;
    }
    // If there is no touch system provided, periodically invoke tryShoot for testing
    autofireTimer = autofireTimer - dt;
    if (autofireTimer <= 0) {
        autofireTimer = autoFireInterval;
        tryShoot();
    }
});

// Public helpers to bind from UI system if designer wires any tap to these texts externally:
// If environment routes taps, these can be called.
script.startButton.text = script.startButton.text; // no-op dynamic touch hint
script.restartButton.text = script.restartButton.text; // no-op

// Expose simple global to trigger tap from outside (designer can wire to Touch Events if later added)
globalShoot = function() { onTouchDown(); }

} catch(e) {
  print("error in controller");
  print(e);
}
