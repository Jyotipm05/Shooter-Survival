// GlobalController.js
// Simple global start/stop controller for the game.
// Attach to a central scene object (e.g., World Object Controller).

// @input bool startOnAwake = false
// @input SceneObject triggers
// @input SceneObject startBtn
// @input SceneObject RestartBtn

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

// Safe button lookup: attached value could be a Button component or a SceneObject
function getButtonFromField(field) {
    if (!field) return null;
    // If field is already a button-like component
    if (field.onClick && field.onClick.add) return field;
    // If field is a SceneObject, try to get a Button component from it
    if (typeof field.getComponent === 'function') {
        var btn = field.getComponent("Component.Button") || field.getComponent("Component.UIButton");
        if (btn && btn.onClick && btn.onClick.add) return btn;
    }
    return null;
}

var startBtnComp = getButtonFromField(script.startButton) || getButtonFromField(script.startBtn) || getButtonFromField(script.StartBtn);
if (startBtnComp) {
    startBtnComp.onClick.add(startGame);
}

var restartBtnComp = getButtonFromField(script.restartButton) || getButtonFromField(script.RestartBtn) || getButtonFromField(script.restartBtn);
if (restartBtnComp) {
    restartBtnComp.onClick.add(startGame);
}

// Optional tap interaction
var interaction = script.getSceneObject().getComponent("Component.InteractionComponent");
if (interaction) {
    interaction.onTap.add(toggleGame);
}
