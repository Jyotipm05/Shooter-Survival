// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent scoreUI
//@input Component.ScriptComponent enemy1
//@input Component.ScriptComponent enemy2
//@input Component.ScriptComponent enemy3
//@input Component.ScriptComponent enemy4


try {

// Game state
var enemies = [script.enemy1, script.enemy2, script.enemy3, script.enemy4];
var currentIndex = 0;
var playing = false;

// Utility: enable only the current enemy
function showOnly(index) {
    for (var i = 0; i < enemies.length; i = i + 1) {
        enemies[i].enabled = i === index;
    }
}

// Start/restart the run
function startRun() {
    script.scoreUI.clearScore();
    script.scoreUI.startScoring();
    currentIndex = 0;
    playing = true;
    showOnly(currentIndex);
}

// Advance to next enemy or end
function killCurrentAndAdvance() {
    if (playing === false) {
        return;
    }
    // Award point
    script.scoreUI.increaseScore(1);

    // Disable current enemy
    enemies[currentIndex].enabled = false;

    // Next enemy
    currentIndex = currentIndex + 1;

    if (currentIndex < enemies.length) {
        showOnly(currentIndex);
    } else {
        // Finished wave
        playing = false;
        script.scoreUI.endScoring(function() {
            // Auto-restart after short pause using DelayedCallbackEvent
            var delay = script.createEvent("DelayedCallbackEvent");
            delay.bind(function() {
                startRun();
            });
            delay.reset(1);
        });
    }
}

// Simulated "kill" trigger via smile/frown/mouth-open pattern on a timer
// Note: Without dedicated face/touch blocks, we simulate cadence using DelayedCallbackEvent.
function scheduleAutoKill() {
    var spawnDelay = script.createEvent("DelayedCallbackEvent");
    spawnDelay.bind(function() {
        killCurrentAndAdvance();
        if (playing) {
            scheduleAutoKill();
        }
    });
    // Randomized small delay to feel interactive
    var delaySeconds = 0.8 + Math.random() * 0.8;
    spawnDelay.reset(delaySeconds);
}

// Optional: react to score changes (e.g., could animate or chain logic)
script.scoreUI.onScoreChanged.add(function(score) {});

// Kick off the game on start
var onStart = script.createEvent("OnStartEvent");
onStart.bind(function() {
    startRun();
    scheduleAutoKill();
});

} catch(e) {
  print("error in controller");
  print(e);
}
