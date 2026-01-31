// PlayerTracker.js
// Attach this to a scene object (for example the World Object Controller).
// In the Inspector assign the scene's active Camera to `playerCamera`.

// @input Component.Camera playerCamera
// @input Component.WorldTracking worldTrackingComponent

// Publishes the player's camera world position to `global.playerWorldPosition` so multiple enemies
// can access it without searching for the camera component.

function updatePlayerPosition(eventData) {
    // If a global gameRunning flag exists and is false, do nothing
    if (global.gameRunning === false) {
        return;
    }

    if (!script.playerCamera) {
        return;
    }

    var camTransform = script.playerCamera.getSceneObject().getTransform();
    global.playerWorldPosition = camTransform.getWorldPosition();

    // Optional: expose whether world tracking is active
    if (script.worldTrackingComponent) {
        global.playerIsTracking = script.worldTrackingComponent.isTracking;
    } else {
        global.playerIsTracking = true;
    }
}

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(updatePlayerPosition);
