// GlobalController.js
// Simple global start/stop controller for the game.
// Attach to a central scene object (e.g., World Object Controller).

// @input bool startOnAwake = false

// Initialize global flag
if (global.gameRunning === undefined) {
    global.gameRunning = !!script.startOnAwake;
}

// Control functions
global.startGame = function() {
    global.gameRunning = true;
};

global.stopGame = function() {
    global.gameRunning = false;
};

global.toggleGame = function() {
    global.gameRunning = !global.gameRunning;
};

// Optional: expose a way to start via a tap on this object if it has an InteractionComponent
if (script.getSceneObject().getComponent("Component.InteractionComponent")) {
    var interaction = script.getSceneObject().getComponent("Component.InteractionComponent");
    interaction.onTap = function() {
        global.toggleGame();
    };
}
