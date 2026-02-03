// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent canvasUI
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent spriteStore
//@input Component.ScriptComponent timerText
//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent killCountText
//@input Component.ScriptComponent healthText
//@input Component.ScriptComponent startButton
//@input Component.ScriptComponent restartButton
//@input Asset.SceneObject[] EnemyList
//@input float radius = 1.0
//@input Component.DeviceTracking cam
//@input Component.SceneObject enemyContainer
//@input Component.SceneObject spawnPos


try {

    // Shooter AR game using SpriteManager sprites as enemies and Text blocks for HUD/button UI.
    // Note: 3D raycast is not available in provided blocks; use tap hit-test via SpriteManager. Face/touch alternatives can be wired if available.

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
    // @input string enemyPrefabName = "enemy3d" // optional: name to pick different enemy visual from Sprite Store if swapping assets

    // Internal state
    let screenSize;
    let gameRunning = false;
    let gameStarted = false;

    var rayStart = script.cam.getTransform().getWorldPosition();
    var rayDir = script.cam.forward;
    var posn = script.spawnPos.getTransform().getWorldPosition();
    var elist = script.EnemyList;

    let timeRemaining = 0;
    let health = 0;
    let kills = 0;

    let enemies = [];
    let enemiesSpawned = 0;

    let spawnTimer = 0;
    let centerTapCooldown = 0;

    let uiUpdateEvent;
    let gameUpdateEvent;

    // Cached button bounds in pixel space for simple hit tests on Text blocks
    let startBtnBounds = null;
    let restartBtnBounds = null;

    // Simple coroutine system
    function startCoroutine(generatorFunction, ...args) {
        const generator = generatorFunction(...args);
        
        function runNext(value) {
            const result = generator.next(value);
            if (!result.done) {
                if (result.value && result.value.delay) {
                    // Wait for specified delay
                    const delayEvent = script.createEvent("DelayedCallbackEvent");
                    delayEvent.bind(function() {
                        runNext();
                    });
                    delayEvent.reset(result.value.delay);
                } else {
                    // Continue immediately next frame
                    const updateEvent = script.createEvent("UpdateEvent");
                    const onUpdate = function() {
                        updateEvent.enabled = false;
                        runNext();
                    };
                    updateEvent.bind(onUpdate);
                }
            }
        }
        
        runNext();
    }

    // Helper function for coroutine delays
    function waitForSeconds(seconds) {
        return { delay: seconds };
    }

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

        // Reset enemy pool - return all active enemies back to pool
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i] && enemies[i].enabled) {
                enemies[i].enabled = false;
                elist.push(enemies[i]);
            }
        }
        
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
        
        // Check if we have enemies left in the pool
        print("Enemy list length:", elist.length);
        if (elist.length === 0) {
            print("ERROR: No more enemies in pool!");
            return;
        }
        
        const newObj = elist.pop();
        print("work 1 - newObj:", newObj);
        
        // Check if newObj is valid
        if (!newObj) {
            print("ERROR: newObj is null/undefined!");
            return;
        }
        
        print("newObj type:", typeof newObj);
        print("newObj enabled before:", newObj.enabled);
        
        try {
            newObj.enabled = true;
            print("newObj enabled after:", newObj.enabled);
        } catch (error) {
            print("ERROR setting enabled:", error);
            return;
        }
        
        enemies.push(newObj);
        enemiesSpawned = enemiesSpawned + 1;
        print("work 2 - Successfully spawned enemy");
        
        // Start enemy behavior coroutine
        startCoroutine(enemyBehavior, newObj);
    }

    // Enemy behavior coroutine
    function* enemyBehavior(enemyObj) {
        try {
            var transform = enemyObj.getTransform();
            var startPos = transform.getWorldPosition();
            var camTransform = script.cam.getTransform();
            
            // Make enemy move towards camera slowly
            var time = 0;
            var moveSpeed = 0.5; // units per second
            
            while (enemyObj && enemyObj.enabled && time < 10.0) {
                // Move towards camera
                var camPos = camTransform.getWorldPosition();
                var direction = camPos.sub(startPos).normalize();
                var newPos = startPos.add(direction.uniformScale(moveSpeed * time));
                
                transform.setWorldPosition(newPos);
                
                time += 0.1;
                yield waitForSeconds(0.1); // Wait 0.1 seconds before next update
            }
            
            // Enemy reached end of life or was destroyed
            if (enemyObj && enemyObj.enabled) {
                // Remove from enemies array if still active
                var index = enemies.indexOf(enemyObj);
                if (index >= 0) {
                    removeEnemyAtIndex(index);
                }
            }
        } catch (error) {
            print("Error in enemy behavior:", error);
        }
    }

    function removeEnemyAtIndex(idx) {
        const enemy = enemies[idx];
        if (enemy) {
            enemy.enabled = false; // Disable instead of destroy
            elist.push(enemy); // Return to pool for reuse
        }
        enemies.splice(idx, 1);
    }

    function tryShootAtPixel(pixelX, pixelY) {
        if (!gameRunning) {
            return;
        }
        if (centerTapCooldown > 0) {
            return;
        }
        centerTapCooldown = 0.1;

        // Since scene.raycast is not available, we'll use a different approach
        // Check if we can hit enemies by proximity to screen center tap
        var camTransform = script.cam.getTransform();
        var rayStart = camTransform.getWorldPosition();
        var rayDir = camTransform.forward;
        
        // Simple hit detection - check enemies in front of camera
        for (let e = enemies.length - 1; e >= 0; e--) {
            var enemy = enemies[e];
            var enemyPos = enemy.getTransform().getWorldPosition();
            var toEnemy = enemyPos.sub(rayStart);
            
            // Check if enemy is roughly in the direction we're looking
            var distance = toEnemy.length;
            var dotProduct = toEnemy.normalize().dot(rayDir);
            
            // If enemy is close to our look direction and within reasonable range
            if (dotProduct > 0.8 && distance < 5.0) {
                removeEnemyAtIndex(e);
                kills = kills + 1;
                updateHUD();
                return;
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

        // Cleanup enemies that drift too far from camera
        var camPos = script.cam.getTransform().getWorldPosition();
        for (let i = enemies.length - 1; i >= 0; i--) {
            var enemyPos = enemies[i].getTransform().getWorldPosition();
            var distance = enemyPos.sub(camPos).length;
            if (distance > 10.0) { // Remove enemies that are too far away
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

    // Handle touches via Touch Events block
    function handleTap(unitX, unitY) {
        const pixel = script.spriteManager.unitToPixel(new vec2(unitX, unitY));

        // If not started, check start button hit region; fallback: any tap starts
        if (!gameStarted) {
            startGame();
            return;
        }

        // If game ended, restart on tap
        if (!gameRunning) {
            resetGameState();
            startGame();
            return;
        }

        // Shoot at tap position
        tryShootAtPixel(pixel.x, pixel.y);
    }

    // Bind update loops and start
    script.createEvent("OnStartEvent").bind(function () {
        screenSize = script.spriteManager.getScreenSize();

        resetGameState();

        // Main update
        gameUpdateEvent = script.createEvent("UpdateEvent");
        gameUpdateEvent.bind(function () {
            const dt = getDeltaTime();
            updateGame(dt);
        });

        // Touch handlers
        script.touchEvents.onTap.add(function (x, y) {
            handleTap(x, y);
        });
        script.touchEvents.onTouchDown.add(function (id, x, y) {
            handleTap(x, y);
        });
    });

} catch (e) {
    print("error in controller");
    print(e);
}