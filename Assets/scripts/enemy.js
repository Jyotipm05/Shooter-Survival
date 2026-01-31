// Enemy.js
// Component script to attach to each enemy SceneObject.
// Controls chasing the player up to `followDistance` and switching between chase (walk) and attack animations.

// @input SceneObject enemyObject
// @input SceneObject enemyModel
// @input float followDistance = 10.0 {"hint":"Maximum distance to follow the player"}
// @input float attackDistance = 1.5 {"hint":"Distance to switch to attack"}
// @input float stopDistance = 0.8 {"hint":"Minimum distance to keep from player while chasing"}
// @input float moveSpeed = 2.0
// @input float rotationSpeed = 6.0
// @input bool useLocalTransform = false {"hint":"Write transforms to local instead of world"}
// @input bool enableAnimationSwitching = true

// Simple hysteresis to avoid jitter when player is near a boundary
var attackExitOffset = 0.25;

// Resolve target object (the object whose transform we control)
var targetObject = script.enemyObject ? script.enemyObject : script.getSceneObject();
var enemyTransform = targetObject.getTransform();

// Resolve model used for child-based animation toggles
var modelObject = script.enemyModel ? script.enemyModel : script.getSceneObject();

var currentState = "idle"; // idle | chase | attack
var updateEvent = script.createEvent("UpdateEvent");

function applyAnimationState(state) {
	if (!script.enableAnimationSwitching || !modelObject) return;
	try {
		for (var i = 0; i < modelObject.getChildrenCount(); i++) {
			var child = modelObject.getChild(i);
			if (!child || !child.name) continue;
			var name = child.name.toLowerCase();

			var enable = false;
			if (state === "attack" && name.indexOf("attack") !== -1) enable = true;
			else if (state === "chase" && (name.indexOf("chase") !== -1 || name.indexOf("walk") !== -1 || name.indexOf("run") !== -1)) enable = true;
			else if (state === "idle" && name.indexOf("idle") !== -1) enable = true;

			child.enabled = enable;
		}
	} catch (e) {
		// ignore
	}
}

function lookAtRotation(direction) {
	// direction is a vec3 in world space pointing from enemy -> player
	return quat.lookAt(direction, vec3.up());
}

updateEvent.bind(function(eventData) {
	// gate by global controller if present
	if (global.gameRunning === false) {
		if (currentState !== "idle") {
			currentState = "idle";
			applyAnimationState(currentState);
		}
		return;
	}

	if (!global.playerWorldPosition || !enemyTransform) return;

	var playerPos = global.playerWorldPosition;
	var enemyPos = enemyTransform.getWorldPosition();
	var toPlayer = playerPos.sub(enemyPos);
	var distance = toPlayer.length;
	var dt = eventData.getDeltaTime ? eventData.getDeltaTime() : 1.0 / 60.0;

	// Determine desired state with simple hysteresis for attack
	var inAttack = (distance <= script.attackDistance);
	var exitAttackThreshold = script.attackDistance + attackExitOffset;
	if (currentState === "attack" && distance > exitAttackThreshold) {
		// player fled enough to exit attack
		inAttack = false;
	}

	var newState = "idle";
	if (distance <= script.followDistance) {
		newState = inAttack ? "attack" : "chase";
	}

	// Apply rotation to face player when chasing or attacking
	if (newState === "chase" || newState === "attack") {
		var dirNorm = toPlayer.normalize();
		var targetRot = lookAtRotation(dirNorm);
		var curRot = enemyTransform.getWorldRotation();
		var slerp = quat.slerp(curRot, targetRot, Math.min(1, script.rotationSpeed * dt));
		if (script.useLocalTransform) enemyTransform.setLocalRotation(slerp); else enemyTransform.setWorldRotation(slerp);
	}

	// Movement: only move during chase, not while attacking or idle
	if (newState === "chase") {
		// Move toward player but don't get closer than stopDistance
		var dirNorm = toPlayer.normalize();
		var desiredMove = dirNorm.uniformScale(script.moveSpeed * dt);

		// If this move would bring us inside stopDistance, clamp to maintain stopDistance
		var distAfterMove = Math.max(0, distance - desiredMove.length);
		if (distAfterMove < script.stopDistance) {
			// Move to position that is exactly stopDistance away
			var targetPos = playerPos.sub(dirNorm.uniformScale(script.stopDistance));
			if (script.useLocalTransform) {
				var localPos = enemyTransform.getLocalPosition();
				var worldDelta = targetPos.sub(enemyPos);
				enemyTransform.setLocalPosition(localPos.add(worldDelta));
			} else {
				enemyTransform.setWorldPosition(targetPos);
			}
		} else {
			var newPos = enemyPos.add(desiredMove);
			if (script.useLocalTransform) {
				var localPos = enemyTransform.getLocalPosition();
				var worldDelta = newPos.sub(enemyPos);
				enemyTransform.setLocalPosition(localPos.add(worldDelta));
			} else {
				enemyTransform.setWorldPosition(newPos);
			}
		}
	}

	// Update animation state if changed
	if (newState !== currentState) {
		currentState = newState;
		applyAnimationState(currentState);
	}
});

