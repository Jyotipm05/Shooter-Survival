//@input Asset.ObjectPrefab objectPrefab
//@input float spawnInterval = 5.0

var timeSinceLast = 0;

function onUpdate(eventData) {
    timeSinceLast += getDeltaTime();
    if (timeSinceLast >= script.spawnInterval) {
        // Spawn the prefab
        var newObj = script.objectPrefab.instantiate(script.getSceneObject().getParent());
        // Position or move the new object here
        timeSinceLast = 0;
    }
}
script.createEvent("UpdateEvent").bind(onUpdate);
