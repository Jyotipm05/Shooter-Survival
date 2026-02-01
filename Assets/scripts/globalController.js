// GlobalController.js
// Simple global start/stop controller for the game.
// Attach to a central scene object (e.g., World Object Controller).

// @input bool startOnAwake = false
// @input SceneObject triggers
// @input SceneObject startBtn
// @input SceneObject RestartBtn
// @input Component.UIButton startButton
// @input Component.UIButton restartButton

// Initialize global flag
if (global.gameRunning === undefined) {
    global.gameRunning = !!script.startOnAwake;
}

// Control functions
function startGame() {
    script.triggers.enabled = global.gameRunning = true;
    script.startBtn.enabled = false;
    script.RestartBtn.enabled = false;
}
function stopGame() {
    script.triggers.enabled = global.gameRunning = false;
    script.RestartBtn.enabled = true;
}
function toggleGame() {
    global.gameRunning = !global.gameRunning;
    script.triggers.enabled = global.gameRunning;
    script.RestartBtn.enabled = !global.gameRunning;
}

script.startButton.onClick = function() {
    startGame();
}
script.restartButton.onClick = function() {
    startGame();
}

// Optional: expose a way to start via a tap on this object if it has an InteractionComponent
if (script.getSceneObject().getComponent("Component.InteractionComponent")) {
    var interaction = script.getSceneObject().getComponent("Component.InteractionComponent");
    interaction.onTap = function() {
        global.toggleGame();
    };
}
