# Reality Mixer JS

This is a small Mixed Reality Capture module for [WebXR](https://immersiveweb.dev) + [Three.js](https://threejs.org).

You can use this module to allow users to record your WebXR experiences in Mixed Reality. 

Unlike the original [Reality Mixer](https://github.com/fabio914/RealityMixer) or [LIV](https://www.liv.tv), the Mixed Reality composition is happening on the browser itself. However, users will need another external application to record their browser (e.g. [OBS](https://obsproject.com)).

Keep in mind that this is still just a prototype and that I'm not a frontend developer. Feel free to open PRs and contribute to the project.

[YouTube video](https://youtu.be/t0TmLT84J_0)

## Requirements

 - PC VR headset that's compatible with [WebXR](https://immersiveweb.dev) (e.g. Oculus Rift S).

 - Google Chrome.

 - Webcam and a green screen. Alternatively, you can use your iPhone/iPad as a camera (without a green screen) with the [LIV Camera app](https://apps.apple.com/us/app/liv-camera/id1482671526) and [NDI Webcam Input](https://www.ndi.tv/tools/).

## Examples

 - Use the links below to launch one of the examples in your browser. 

 - You'll need to follow [these instructions](#how-to-calibrate) to complete a calibration first.

 - Your browser will ask for permission to access your camera, and it'll ask for permission to use your VR headset once you click on the "Enter VR" button.

| Example | Screenshot |
|---------|---------------|
| [webxr_vr_ballshooter](https://fabio914.github.io/reality-mixer-js/examples/webxr_vr_ballshooter.html) | <img src="screenshots/webxr_vr_ballshooter.jpg" width="300" /> |
| [webxr_vr_dragging](https://fabio914.github.io/reality-mixer-js/examples/webxr_vr_dragging.html) | <img src="screenshots/webxr_vr_dragging.gif" width="300" /> | 
| [webxr_vr_paint](https://fabio914.github.io/reality-mixer-js/examples/webxr_vr_paint.html) | <img src="screenshots/webxr_vr_paint.jpg" width="300" /> | 

## How to calibrate

The calibration process has four steps:

 - First, you'll need to input the image resolution of your webcam (e.g. 1920 x 1080).

 - Second, you'll need to configure your chroma key. You can use the color picker to pick the color of your green screen, and then adjust the values of smoothness and similarity to make it become transparent. You can also click on "More options" to reveal other controls that allow you to crop out areas of the image outside of your green screen.

 - The last step happens in VR, put your VR headset on and click on "Enter VR" when you're ready. First, you'll need to bring your right controller very close to the camera (so that it's aligned with the target on the image) and then press the trigger button. Now move away from the camera, position the right controller behind the target (make sure that the controller is at least 1.5m away from the camera), and then press the trigger button again. Repeat that for the third target, and then press the trigger button one last time to leave VR.

- You should now see a window with a JSON text with your calibration. You can make some adjustments if you'd like. For example, you can change the "delay" value in case you notice that the video from the VR scene and the video from the Webcam are out of sync. Finally, you can click on the continue link and then on "Enter VR".

You'll need to recalibrate whenever you change your guardian boundary / play area, change the position and orientation of your camera, or change your green screen. 

## How to test these examples locally

 - Clone this repository.
 
 - Run `npm ci` to download the dependencies.
 
 - Run `http-server` to start the HTTP server (that can be downloaded by running `npm install -g http-server`).

 - WebXR and `navigator.mediaDevices` require HTTPS (unless you're accessing it via `localhost`). You could use a tool like [localtunnel](https://github.com/localtunnel/localtunnel) for testing. You can run `npm install -g localtunnel` to download it and then you can run `lt --port 8080 --subdomin 127.0.0.1` in a separate terminal.
 
 - Open your browser and navigate to `https://{your HTTPS domain}/examples/webxr_vr_ballshooter.html` (or `https://127.0.0.1:8080/examples/webxr_vr_ballshooter.html`)

 ## API
 
 ```javascript
 
import * as THREE from 'three';
import * as MRC from 'reality-mixer';
 
let mixedRealityCapture;
let scene, renderer, camera;

// ...
 
const cameraCalibration = new MRC.CameraCalibration(
    1920, // width of the video
    1080, // height of the video
    38, // vertical field of view in degrees
    [0, 1.5, 0], // vector with the position of the camera in scene coordinates
    [0, 0, 0, 1] // quaternion with the orientation of the camera
);

const chromaKey = new MRC.ChromaKey(
    [0, 1, 0], // chroma key color (red, green, blue values from 0 to 1)
    0.25, // similarity (0 to 1)
    0, // smoothness (0 to 1)
    [0, 0, 0, 0] // crop (left, right, bottom, top values from 0 to 1)
);
 
const calibration = new MRC.Calibration(
    cameraCalibration,
    chromaKey,
    4, // Delay (in number of frames) between the real camera and the virtual camera
);

// ... Initialize your Three.js scene and renderer here ...

// Hide your renderer when you want to display the Mixed Reality output
renderer.domElement.style.display = "none";

// Create a new Mixed Reality Capture session
mixedRealityCapture = new MRC.MixedRealityCapture( calibration );

// Add the Mixed Reality Output to the document
document.body.appendChild( mixedRealityCapture.domElement );

// ...

// You should call this whenever the window resizes
mixedRealityCapture.onWindowResize();

// ...

// Render the Mixed Reality composition after rendering your scene

renderer.render( scene, camera );

mixedRealityCapture.render( renderer.xr, scene );

```

Alternatively, you can instantiate the calibration with a JSON provided by the user:

```javascript

// ...

const json = `
{ 
    "schemaVersion": 1, 
    "camera": { 
        "width": 1280, 
        "height": 720, 
        "fov": 38, 
        "position": [0, 1.5, 0], 
        "orientation": [0, 0, 0, 1] 
    }, 
    "chromaKey": {
        "color": [0, 1, 0],
        "similarity": 0.25,
        "smoothness": 0,
        "crop": [0, 0, 0, 0]
    },
    "delay": 4
}
`;

const calibrationData = JSON.parse( json );

const calibration = MRC.Calibration.fromData( calibrationData );

// ...

mixedRealityCapture = new MRC.MixedRealityCapture( calibration );

// ...

```

## TO-DOs

 - Continue iterating on the Calibration (fixes, delay, adustments, etc).
