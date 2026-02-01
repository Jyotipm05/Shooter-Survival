// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent timerText
//@input Component.ScriptComponent healthText
//@input Component.ScriptComponent killText
//@input Component.ScriptComponent startButton
//@input Component.ScriptComponent restartButton
//@input Component.ScriptComponent shootBtnLeft
//@input Component.ScriptComponent shootBtnRight


try {

// Game state variables
let isRunning = false;
let isEnded = false;
// @input float timeLimitSec = 180.0
let timeRemaining = script.timeLimitSec; // seconds
let health = 100;
let score = 0;

// Inputs for AR spawner configuration (set these on the spawner under '#3D Foreground Camera')
// @input bool hasARSpawner = false

let updateEvent = null;

// Enemy management (Note: actual 3D spawning and animation components must exist in the AR scene. This script tracks logical enemies only.)
// Each enemy tracked as: { id, alive, distanceToPlayer }
let enemies = [];
let spawnDelaySec = 2.0;
let spawnerEvent = null;

function clearEnemies() {
    for (let i = 0; i < enemies.length; i = i + 1) {
        enemies[i].alive = false;
    }
    enemies = [];
}

function spawnEnemy() {
    // Must have AR spawner active to create enemies
    if (!script.hasARSpawner) {
        return;
    }
    const enemy = { id: Math.floor(Math.random() * 1000000), alive: true, distanceToPlayer: 5.0 };
    enemies.push(enemy);
}


function scheduleNextSpawn() {
    if (!spawnerEvent) {
        spawnerEvent = script.createEvent("DelayedCallbackEvent");
        spawnerEvent.bind(function() {
            if (!isRunning) {
                return;
            }
            spawnEnemy();
            scheduleNextSpawn();
        });
    }
    const interval = 1.5 + Math.random() * 2.5; // between 1.5s and 4s
    spawnerEvent.reset(interval);
}


// Safe-region for UI texts that change
if (script.startButton && script.startButton.forceSafeRegion) {
    script.startButton.forceSafeRegion(true);
}
if (script.restartButton && script.restartButton.forceSafeRegion) {
    script.restartButton.forceSafeRegion(true);
}
if (script.timerText && script.timerText.forceSafeRegion) {
    script.timerText.forceSafeRegion(true);
}
if (script.healthText && script.healthText.forceSafeRegion) {
    script.healthText.forceSafeRegion(true);
}
if (script.killText && script.killText.forceSafeRegion) {
    script.killText.forceSafeRegion(true);
}
if (script.shootBtnLeft && script.shootBtnLeft.forceSafeRegion) {
    script.shootBtnLeft.forceSafeRegion(true);
}
if (script.shootBtnRight && script.shootBtnRight.forceSafeRegion) {
    script.shootBtnRight.forceSafeRegion(true);
}

// Helper: update Stats UI (timer/health/score)
// NOTE: Stats text blocks must exist in the 'Stats' screen region and be linked as start/restart buttons here only if reused visually.
// Because only startButton and restartButton are available in this context, we will multiplex their text to show stats when running.
// If you have dedicated Stats text blocks, wire them here instead of overloading button texts.
function refreshUI() {
    // Update dedicated Stats texts if available
    if (script.timerText) {
        const secs = Math.ceil(timeRemaining);
        script.timerText.text = "Time: " + secs + "s";
    }
    if (script.healthText) {
        const hp = Math.floor(health);
        script.healthText.text = "Health: " + hp;
    }
    if (script.killText) {
        script.killText.text = "Kills: " + score;
    }

    // Keep button labels static
    if (!isRunning) {
        if (script.startButton) {
            script.startButton.text = "Start Game";
        }
        if (script.restartButton) {
            script.restartButton.text = "Restart Game";
        }
    }

    // Style shoot buttons as semi-transparent and label
    if (script.shootBtnLeft) {
        script.shootBtnLeft.text = "Shoot";
        script.shootBtnLeft.backgroundEnabled = true;
        script.shootBtnLeft.backgroundColor = new vec4(1.0, 1.0, 1.0, 0.25);
    }
    if (script.shootBtnRight) {
        script.shootBtnRight.text = "Shoot";
        script.shootBtnRight.backgroundEnabled = true;
        script.shootBtnRight.backgroundColor = new vec4(1.0, 1.0, 1.0, 0.25);
    }
}

// Start game logic
function startGame() {
    if (isRunning) {
        return;
    }
    isRunning = true;
    isEnded = false;

    // Initialize gameplay values on start
    timeRemaining = script.timeLimitSec;
    health = 100;
    score = 0;

    // Disable start button during gameplay
    if (script.startButton) {
        script.startButton.enabled = false;
    }
    // Restart button should be disabled during gameplay (optional UX)
    if (script.restartButton) {
        script.restartButton.enabled = false;
    }

    // Show shoot buttons during gameplay
    if (script.shootBtnLeft) {
        script.shootBtnLeft.enabled = true;
    }
    if (script.shootBtnRight) {
        script.shootBtnRight.enabled = true;
    }

    // Start spawning enemies
    scheduleNextSpawn();

    refreshUI();

    // Start update loop
    if (!updateEvent) {
        updateEvent = script.createEvent("UpdateEvent");
        updateEvent.bind(onUpdate);
    } else {
        updateEvent.enabled = true;
    }
}

// End game logic
function endGame() {
    isRunning = false;
    isEnded = true;

    // Re-enable buttons appropriately
    if (script.startButton) {
        script.startButton.enabled = true;
    }
    if (script.restartButton) {
        script.restartButton.enabled = true;
    }

    // Hide shoot buttons at end
    if (script.shootBtnLeft) {
        script.shootBtnLeft.enabled = false;
    }
    if (script.shootBtnRight) {
        script.shootBtnRight.enabled = false;
    }

    refreshUI();

    if (updateEvent) {
        updateEvent.enabled = false;
    }

    // Stop future spawns and clear enemies list
    clearEnemies();
}

// Restart game logic
function restartGame() {
    // Allow restart from ended state or mid-game to hard reset
    isRunning = false;
    isEnded = false;

    // Immediately start a fresh game
    startGame();
}

// Update loop
function onUpdate() {
    if (!isRunning) {
        return;
    }

    // Timer countdown
    timeRemaining = timeRemaining - getDeltaTime();
    if (timeRemaining < 0) {
        timeRemaining = 0;
    }

    // If no visible AR spawner is connected, pause enemy logic to avoid phantom damage.
    const arSpawnerActive = !!script.hasARSpawner;

    // Enemy proximity damages player only when AR spawns are active and enemies exist
    if (arSpawnerActive && enemies.length > 0) {
        // Simulate chase by reducing their distance-to-player over time.
        for (let i = 0; i < enemies.length; i = i + 1) {
            if (!enemies[i].alive) {
                continue;
            }
            enemies[i].distanceToPlayer = enemies[i].distanceToPlayer - getDeltaTime() * 0.7; // approach speed
            if (enemies[i].distanceToPlayer <= 0.5) {
                // Enemy reached player: deal damage and mark as not alive (consumed)
                health = health - 10;
                enemies[i].alive = false;
            }
        }
    }

    if (health < 0) {
        health = 0;
    }

    // Cull dead enemies from list
    let aliveList = [];
    for (let j = 0; j < enemies.length; j = j + 1) {
        if (enemies[j].alive) {
            aliveList.push(enemies[j]);
        }
    }
    enemies = aliveList;

    // Check end conditions
    if (timeRemaining <= 0 || health <= 0) {
        endGame();
        return;
    }

    // Update UI each frame to reflect progress
    refreshUI();
}


// Simple hit-test for button text blocks based on their screen-space bounds
// This uses a rough bounding box assumption around the text center; tune the hit size as needed.
function isTouchOverTextBlock(block, x, y) {
    if (!block) {
        return false;
    }
    // Approximate half-size bounds; increase for larger tap area
    const halfW = 0.15;
    const halfH = 0.06;
    const pos = block.position ? block.position : new vec2(0.5, 0.5);
    const minX = pos.x - halfW;
    const maxX = pos.x + halfW;
    const minY = pos.y - halfH;
    const maxY = pos.y + halfH;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
    }
    return false;
}

// Configure touch behavior to prevent camera switching during gameplay
if (script.touchEvents) {
    // Block default touches to keep gameplay control; allowDoubleTap true so Snapchat will not switch camera when blocked
    script.touchEvents.blockDefaultTouches = true;
    script.touchEvents.allowDoubleTap = true;
}

// Touch handling: tap to press buttons and shoot when tapping the left/right shoot buttons
if (script.touchEvents && script.touchEvents.onTap) {
    script.touchEvents.onTap.add(function(tapX, tapY) {
        // If Start button is enabled and tapped
        if (script.startButton && script.startButton.enabled) {
            if (isTouchOverTextBlock(script.startButton, tapX, tapY)) {
                startGame();
                return;
            }
        }
        // If Restart button is enabled and tapped
        if (script.restartButton && script.restartButton.enabled) {
            if (isTouchOverTextBlock(script.restartButton, tapX, tapY)) {
                restartGame();
                return;
            }
        }
        // Shooting buttons
        let shot = false;
        if (isRunning) {
            if (script.shootBtnLeft && script.shootBtnLeft.enabled) {
                if (isTouchOverTextBlock(script.shootBtnLeft, tapX, tapY)) {
                    shot = true;
                }
            }
            if (script.shootBtnRight && script.shootBtnRight.enabled) {
                if (isTouchOverTextBlock(script.shootBtnRight, tapX, tapY)) {
                    shot = true;
                }
            }
            if (shot) {
                // Only allow a hit when AR spawner is active and we actually have enemies
                if (!script.hasARSpawner || enemies.length === 0) {
                    return;
                }
                // Simulate crosshair-aligned kill by picking closest enemy.
                let closestIndex = -1;
                let closestDist = 9999;
                for (let i = 0; i < enemies.length; i = i + 1) {
                    if (!enemies[i].alive) {
                        continue;
                    }
                    if (enemies[i].distanceToPlayer < closestDist) {
                        closestDist = enemies[i].distanceToPlayer;
                        closestIndex = i;
                    }
                }
                if (closestIndex >= 0) {
                    enemies[closestIndex].alive = false;
                    score = score + 1;
                    refreshUI();
                }
                return;
            }
        }
    });
}


// Listen for double tap so it does nothing during gameplay (prevents camera swap)
if (script.touchEvents && script.touchEvents.onDoubleTap) {
    script.touchEvents.onDoubleTap.add(function() {
        // Intentionally empty to swallow the gesture while playing
    });
}

// Initialize buttons state
function init() {
    // Anchor Stats layout: timer/health left, kills right
    if (script.timerText) {
        // top-left corner
        script.timerText.position = new vec2(0.03, 0.04);
        script.timerText.alignment = 0; // Left
    }
    if (script.healthText) {
        // below timer on left
        script.healthText.position = new vec2(0.03, 0.10);
        script.healthText.alignment = 0; // Left
    }
    if (script.killText) {
        // top-right corner
        script.killText.position = new vec2(0.97, 0.04);
        script.killText.alignment = 2; // Right
    }

    // Center buttons on screen: Start centered, Restart slightly below
    if (script.startButton) {
        script.startButton.enabled = true;
        script.startButton.text = "Start Game";
        script.startButton.position = new vec2(0.5, 0.5);
        script.startButton.alignment = 1; // Center
    }
    if (script.restartButton) {
        script.restartButton.enabled = false;
        script.restartButton.text = "Restart Game";
        script.restartButton.position = new vec2(0.5, 0.62);
        script.restartButton.alignment = 1; // Center
    }

    // Place semi-transparent shoot buttons bottom-left and bottom-right
    if (script.shootBtnLeft) {
        script.shootBtnLeft.enabled = false; // hidden until game starts
        script.shootBtnLeft.position = new vec2(0.15, 0.85);
        script.shootBtnLeft.size = 0.7;
        script.shootBtnLeft.alignment = 1;
        script.shootBtnLeft.backgroundEnabled = true;
        script.shootBtnLeft.backgroundColor = new vec4(1.0, 1.0, 1.0, 0.25);
        script.shootBtnLeft.backgroundScale = 0.6;
        script.shootBtnLeft.backgroundRoundness = 1.0;
        script.shootBtnLeft.shadowEnabled = false;
    }
    if (script.shootBtnRight) {
        script.shootBtnRight.enabled = false; // hidden until game starts
        script.shootBtnRight.position = new vec2(0.85, 0.85);
        script.shootBtnRight.size = 0.7;
        script.shootBtnRight.alignment = 1;
        script.shootBtnRight.backgroundEnabled = true;
        script.shootBtnRight.backgroundColor = new vec4(1.0, 1.0, 1.0, 0.25);
        script.shootBtnRight.backgroundScale = 0.6;
        script.shootBtnRight.backgroundRoundness = 1.0;
        script.shootBtnRight.shadowEnabled = false;
    }
    refreshUI();
}

// Run init on start
const onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    // If you wired an AR spawner under '#3D Foreground Camera', expose a flag via script.hasARSpawner = true from that spawner script.
    // This prevents phantom logical enemies and unwanted health decay when no enemies are visible.
    if (!script.hasARSpawner) {
        // Default to false; set to true from your AR spawner when ready.
        script.hasARSpawner = false;
    }
    // Ensure time limit is valid (fallback to 180s if not set or invalid)
    if (!script.timeLimitSec || script.timeLimitSec <= 0) {
        script.timeLimitSec = 180.0;
    }
    timeRemaining = script.timeLimitSec;
    init();
});

} catch(e) {
  print("error in controller");
  print(e);
}
