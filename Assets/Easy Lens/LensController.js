// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent timerText
//@input Component.ScriptComponent healthText
//@input Component.ScriptComponent killText
//@input Component.ScriptComponent startButton
//@input Component.ScriptComponent restartButton


try {

// Game state variables
let isRunning = false;
let isEnded = false;
let timeRemaining = 60; // seconds
let health = 100;
let score = 0;

let updateEvent = null;

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
}

// Start game logic
function startGame() {
    if (isRunning) {
        return;
    }
    isRunning = true;
    isEnded = false;

    // Initialize gameplay values on start
    timeRemaining = 60;
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

    refreshUI();

    if (updateEvent) {
        updateEvent.enabled = false;
    }
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

    // Example: passive health drain over time (tunable)
    health = health - getDeltaTime() * 2;
    if (health < 0) {
        health = 0;
    }

    // Score updating would normally happen on gameplay events (e.g., kills)
    // Placeholder: no automatic increment here

    // Check end conditions
    if (timeRemaining <= 0 || health <= 0) {
        endGame();
        return;
    }

    // Update UI each frame to reflect progress (Stats region texts should be updated by their own blocks)
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

// Touch handling: tap to press buttons and simulate a kill when tapping elsewhere
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
        // If game is running and tap is not on a button, count a kill
        if (isRunning) {
            score = score + 1;
            refreshUI();
        }
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

    // Show Start enabled initially, Restart disabled until end
    if (script.startButton) {
        script.startButton.enabled = true;
        script.startButton.text = "Start Game";
    }
    if (script.restartButton) {
        script.restartButton.enabled = false;
        script.restartButton.text = "Restart Game";
    }
    refreshUI();
}

// Run init on start
const onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    init();
});

} catch(e) {
  print("error in controller");
  print(e);
}
