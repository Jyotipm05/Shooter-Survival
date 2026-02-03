// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent scoreText
//@input Component.ScriptComponent map3d


try {

// 3D Platformer: coins, hazards, moving platforms, finish. Animations + scoring + win/lose.

// State
var score = 0;
var totalCoins = 0;
var finished = false; // gates input/handlers when run is over

// Utility: UI text update (anchored HUD)
function setHUD(text) {
    // Keep score/message readable and on-screen as it changes
    script.scoreText.forceSafeRegion(true);
    script.scoreText.text = text;
}

// Count coins at runtime (type '1' are coins/platf.)
function countCoins() {
    // Only collect/hide coin-like items. Platforms with anim:1 should not be hidden if they are structural.
    // Design note: In this map, type '1' are both platforms and collectibles.
    // We'll treat only those not used as moving platforms as coins by index mapping derived from designer notes:
    // The map has type '1' entries at indices (among type '1' only): 0,1,2,3(anim),4,5,6,7(anim)
    // We'll consider static type '1' as coins: indices [0,1,2,4,5,6] and moving ones (3,7) as platforms to not hide.
    var ones = script.map3d.findElements('1');
    var coinIndices = getCoinIndices(ones.length);
    return coinIndices.length;
}

// Determine which '1' elements are animated platforms based on designer notes order
function getAnimatedPlatformIndicesForType1() {
    // From designer_notes mapString, '1' with anim:1 are the 4th and 8th '1' entries → indices 3 and 7 (0-based within type '1' list)
    return [3, 7];
}

function getCoinIndices(type1Count) {
    // All type '1' indices except the animated platform indices are coins
    var animated = getAnimatedPlatformIndicesForType1();
    var coins = [];
    for (var i = 0; i < type1Count; i = i + 1) {
        var isAnimated = false;
        for (var j = 0; j < animated.length; j = j + 1) {
            if (i === animated[j]) {
                isAnimated = true;
                break;
            }
        }
        if (isAnimated === false) {
            coins.push(i);
        }
    }
    return coins;
}

// Animations
function oscillateVertical(element, range, duration) {
    var start = element.mapPosition;
    (function loop(up) {
        if (finished) { return; }
        var targetY = up ? start.y + range : start.y - range;
        script.map3d.moveToGrid(element, start.x, start.z, targetY, duration, function() {
            if (finished) { return; }
            loop(up === false);
        });
    })(true);
}

function patrolHorizontal(element, range, duration) {
    var start = element.mapPosition;
    (function loop(dir) {
        if (finished) { return; }
        var targetX = start.x + (dir * range);
        script.map3d.moveToGrid(element, targetX, start.z, start.y, duration, function() {
            if (finished) { return; }
            loop(dir * -1);
        });
    })(1);
}

function setupAnimations() {
    // Animate type '1' with anim:1 -> float up/down
    var ones = script.map3d.findElements('1');
    var animated1 = getAnimatedPlatformIndicesForType1();
    for (var i = 0; i < animated1.length; i = i + 1) {
        var idx = animated1[i];
        if (idx < ones.length) {
            oscillateVertical(ones[idx], 1, 1.6);
        }
    }

    // Animate type '2' with anim:1 -> patrol horizontally
    // From designer map: hazards include one with anim:1 at position (4,1,3)
    var hazards = script.map3d.findElements('2');
    // Assume first hazard in list is animated (based on map order): index 0 has anim:1, index 1 static
    if (hazards.length > 0) {
        patrolHorizontal(hazards[0], 2, 1.4);
    }
}

// Restart logic
function startRun() {
    finished = false;
    score = 0;

    totalCoins = countCoins();
    setHUD("Collect coins: " + score + "/" + totalCoins + "\nReach the goal!");

    // Start game and re-init animations
    script.map3d.startGame();
    setupAnimations();
}

// Safe restart after fail
function scheduleRestart(delaySec) {
    finished = true; // stop anim loops
    var d = script.createEvent("DelayedCallbackEvent");
    d.bind(function() {
        script.map3d.restartGame();
        startRun();
    });
    d.reset(delaySec);
}

// Event handling
script.map3d.onObjectEvent.add(function(element, player, phase) {
    if (finished) { return; }
    if (phase !== 'enter') { return; }

    // Coins (type '1') collection: only collect static coins, not animated platforms
    if (element.type === '1') {
        var ones = script.map3d.findElements('1');
        // Identify index of this element among type '1'
        var index = -1;
        for (var i = 0; i < ones.length; i = i + 1) {
            if (ones[i] === element) {
                index = i;
                break;
            }
        }
        var animated = getAnimatedPlatformIndicesForType1();
        var isAnimated = false;
        for (var j = 0; j < animated.length; j = j + 1) {
            if (index === animated[j]) {
                isAnimated = true;
                break;
            }
        }
        if (isAnimated === false) {
            element.hide(); // collect coin
            score = score + 1;
            setHUD("Collect coins: " + score + "/" + totalCoins + "\nReach the goal!");
        }
        return;
    }

    // Hazard (type '2') hit -> Game Over
    if (element.type === '2') {
        setHUD("Game Over!\nRestarting...");
        scheduleRestart(1.0);
        return;
    }

    // Finish (type '3') -> Win
    if (element.type === '3') {
        finished = true;
        setHUD("You win!\nScore: " + score + "/" + totalCoins);
        // Optionally pause to let message show; don't auto-restart
        return;
    }
});

// Player out of bounds -> fail and restart
script.map3d.onPlayerOutOfBounds.add(function() {
    if (finished) { return; }
    setHUD("You fell!\nRestarting...");
    scheduleRestart(1.0);
});

// Small QoL: Pulse the HUD score every time it changes (subtle)
// Implemented by updating text only; no animated position to keep safe region valid

// Kick off on start
var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    startRun();
});

} catch(e) {
  print("error in controller");
  print(e);
}
