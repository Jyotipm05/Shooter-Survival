// GlobalController.js
// Simple global start/stop controller for the game.
// Attach to a central scene object (e.g., World Object Controller).

// @input bool startOnAwake = false
// @input SceneObject triggers
// @input SceneObject startBtn
// @input SceneObject RestartBtn
// @input Component.Image startButton
// @input Component.Image restartButton

// Initialize global flag
if (global.gameRunning === undefined) {
    global.gameRunning = !!script.startOnAwake;
}

// Control functions
function startGame() {
    global.gameRunning = true;
    script.triggers.enabled = true;

    if (script.startBtn) script.startBtn.enabled = false;
    if (script.RestartBtn) script.RestartBtn.enabled = false;
}

global.startGame = startGame;
global.stopGame = stopGame;

function stopGame() {
    global.gameRunning = false;
    script.triggers.enabled = false;

    if (script.RestartBtn) script.RestartBtn.enabled = true;
}

function toggleGame() {
    global.gameRunning = !global.gameRunning;
    script.triggers.enabled = global.gameRunning;

    if (script.RestartBtn) {
        script.RestartBtn.enabled = !global.gameRunning;
    }
}
