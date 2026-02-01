// LipsController.js
// Version: 1.1.0
// Event: On Awake
// Description: Provides controls for lips

// @input Asset.Texture mouthClosedMask
// @input bool advanced = false
// @input Component.FaceMaskVisual faceMask {"showIf":"advanced"}

const BOUND_EPS = 0.02;
const DELTA = 0.005;
var faceIndex = 0;
var faceMaskPass;

var faceMask = script.faceMask;
if (!faceMask) {
    faceMask = script.getSceneObject().getComponent("Component.FaceMaskVisual");
}

var mouthClosedMask = script.mouthClosedMask;
var mouthOpenedMask;

var head = script.getSceneObject().createComponent("Component.Head"); 

var onLandmarksUpdateEventHandler = function(landmarks) {
    if(landmarks.length ==  0){
        return;
    }
    var upperLip = landmarks[62];
    var lowerLip = landmarks[66];
    var headUp = landmarks[71];
    var chin = landmarks[8];

    var dist = upperLip.distance(lowerLip) / Math.abs(headUp.distance(chin));

    if (faceMaskPass) {
        if (dist < BOUND_EPS - DELTA) {
            faceMaskPass.opacityTex = mouthClosedMask;
        } else if (dist > BOUND_EPS + DELTA) {
            faceMaskPass.opacityTex = mouthOpenedMask;
        }
    }
}


function initialize() {
    if (script.mouthClosedMask) {
        mouthClosedMask = script.mouthClosedMask;
    } else {
        print("[LipsController] ERROR: Please set Mask texture that coresponds to closed mouth state in Advanced section");        
        return;
    }
    
    if (faceMask) {
        setFaceIndex(faceMask.faceIndex);
        
        if (faceMask.mainPass) {
            faceMaskPass = faceMask.mainPass;
            mouthOpenedMask = faceMaskPass.opacityTex;
            
        } else {
            print("[LipsController] ERROR: Material is not set for " + script.faceMask.getSceneObject().name);
        }
    } else {
        print("[LipsController] ERROR: Please set FaceMask in Advanced section");
    }
    head.onLandmarksUpdate.add(onLandmarksUpdateEventHandler);
}

function setFaceIndex(index) {
    faceIndex = index;
    head.faceIndex = faceIndex;
}



initialize();