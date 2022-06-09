import * as THREE from 'three';
import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';
import { VRButton } from 'https://unpkg.com/three@0.140.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.140.0/examples/jsm/webxr/XRControllerModelFactory.js';
import { BoxLineGeometry } from 'https://unpkg.com/three@0.140.0/examples/jsm/geometries/BoxLineGeometry.js';

function computeCalibration(
    videoWidth,
    videoHeight,
    cameraPosition,
    cameraTopLeftPosition,
    cameraBottomRightPosition
) {
    const topLeft = new THREE.Vector3().copy(cameraTopLeftPosition).sub(cameraPosition);
    const bottomRight = new THREE.Vector3().copy(cameraBottomRightPosition).sub(cameraPosition);
  
    const measuredDiagonalDistanceInPixels = Math.sqrt((videoWidth/2.0) * (videoWidth/2.0) + (videoHeight/2.0) * (videoHeight/2.0));
    const measuredDiagonalAngle = topLeft.angleTo(bottomRight);
  
    const focalDistanceInPixels = measuredDiagonalDistanceInPixels/(2.0 * Math.tan(0.5 * measuredDiagonalAngle));
    const verticalFov = 2.0 * Math.atan2(videoHeight * 0.5, focalDistanceInPixels);

    const center = new THREE.Vector3().copy(topLeft).add(bottomRight);
    const lookAtMatrix = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), center, new THREE.Vector3(0, 1, 0));
    const orientation = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);

    return {
        verticalFov: verticalFov * (180.0/Math.PI),
        position: cameraPosition,
        orientation: orientation
    };
}

function CameraPoseSetup(
    videoWidth, 
    videoHeight, 
    onCompleted
) {
    let sceneBackground = document.createElement("div");

    sceneBackground.style = `
        position:fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: black;
    `

    let targetImage = new Image();
    targetImage.src = "./images/target.png";

    let webcam = document.createElement("video");

    let constraints = { audio: false, video: { width: videoWidth, height: videoHeight } };

    if (navigator.mediaDevices == undefined) {
        alert("Unable to access camera, use HTTPS or localhost.");
        return;
    }

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (mediaStream) {
            webcam.srcObject = mediaStream;
            webcam.onloadedmetadata = function (e) {
                webcam.setAttribute('autoplay', 'true');
                webcam.setAttribute('playsinline', 'true');
                webcam.play();
            };
        })
        .catch(function (err) {
            alert(err.name + ': ' + err.message)
        });

    let webcamCanvas = document.createElement('canvas');
    webcamCanvas.width = videoWidth;
    webcamCanvas.height = videoHeight;

    let canvasCtx = webcamCanvas.getContext('2d');
    canvasCtx.fillStyle = '#000000';
    canvasCtx.fillRect(0, 0, webcamCanvas.width, webcamCanvas.height);

    let canvasTexture = new THREE.Texture(webcamCanvas);
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;

    let camera, scene, renderer;
    let controller1, controller2;
    let controllerGrip1, controllerGrip2;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x505050 );

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
    camera.position.set( 0, 1.6, 0 );

    let spectator = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    sceneBackground.appendChild( renderer.domElement );

    sceneBackground.appendChild( VRButton.createButton( renderer ) );

    // Controllers

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

    }

    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller1 );

    controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    scene.add( controller2 );

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );

    controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    scene.add( controllerGrip2 );

    // Canvas output

    let canvasGeometry;
    const canvasMeshSize = 3.0;

    if (videoWidth > videoHeight) {
        canvasGeometry = new THREE.PlaneGeometry( canvasMeshSize, (videoHeight/videoWidth) * canvasMeshSize );
    } else {
        canvasGeometry = new THREE.PlaneGeometry( (videoWidth/videoHeight) * canvasMeshSize, canvasMeshSize );
    }

    const canvasMaterial = new THREE.MeshBasicMaterial({ map: canvasTexture });

    let frontCanvasMesh = new THREE.Mesh( canvasGeometry, canvasMaterial );
    frontCanvasMesh.position.y = canvasMeshSize/2.0 + 0.5;
    frontCanvasMesh.position.z = -2.99;
    scene.add( frontCanvasMesh );

    let leftCanvasMesh = new THREE.Mesh( canvasGeometry, canvasMaterial );
    leftCanvasMesh.position.y = canvasMeshSize/2.0 + 0.5;
    leftCanvasMesh.position.x = -2.99;
    leftCanvasMesh.rotation.y = Math.PI/2.0;
    scene.add( leftCanvasMesh );

    let rightCanvasMesh = new THREE.Mesh( canvasGeometry, canvasMaterial );
    rightCanvasMesh.position.y = canvasMeshSize/2.0 + 0.5;
    rightCanvasMesh.position.x = 2.99;
    rightCanvasMesh.rotation.y = -Math.PI/2.0;
    scene.add( rightCanvasMesh );

    let backCanvasMesh = new THREE.Mesh( canvasGeometry, canvasMaterial );
    backCanvasMesh.position.y = canvasMeshSize/2.0 + 0.5;
    backCanvasMesh.position.z = 2.99;
    backCanvasMesh.rotation.y = -Math.PI;
    scene.add( backCanvasMesh );

    // Room

    let room = new THREE.LineSegments(
        new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ),
        new THREE.LineBasicMaterial( { color: 0x808080 } )
    );
    room.geometry.translate( 0, 3, 0 );
    scene.add( room );

    scene.add( new THREE.HemisphereLight() );

    // TODO: Observe window resize

    // State

    let cameraPosition = null;
    let cameraTopLeftPosition = null;
    let cameraBottomRightPosition = null;

    function addSphere(position) {
        const geometry = new THREE.IcosahedronGeometry(0.05, 3);
        const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial( { color: 0xffff00 } ));
        object.position.copy(position);
        scene.add( object );
    }

    function controllerUpdate() {
        if (controller2.userData.isSelecting) {

            const minimumDistance = 1.5;

            if (cameraPosition == null) {
                // First step
                addSphere(controller2.position);
                cameraPosition = new THREE.Vector3().copy(controller2.position);
                cameraTopLeftPosition = null;
                cameraBottomRightPosition = null;
            } else if (cameraTopLeftPosition == null) {
                // Second step

                if (cameraPosition.distanceTo(controller2.position) > minimumDistance) {
                    addSphere(controller2.position);
                    cameraTopLeftPosition = new THREE.Vector3().copy(controller2.position);
                    cameraBottomRightPosition = null;
                }
            } else if (cameraBottomRightPosition == null) {
                // Third step

                if (cameraPosition.distanceTo(controller2.position) > minimumDistance) {
                    addSphere(controller2.position);
                    cameraBottomRightPosition = new THREE.Vector3().copy(controller2.position);
                }
            } else {
                // Completed!

                // TODO: Add step to adjust delay and confirm calibration before returning

                const result = computeCalibration(
                    videoWidth,
                    videoHeight,
                    cameraPosition,
                    cameraTopLeftPosition,
                    cameraBottomRightPosition
                );

                console.log("Calibration result:");
                console.log(result);

                // Stop WebXR rendering
                renderer.setAnimationLoop(null);
                renderer.xr.enabled = false;
                renderer.xr.getSession().end();

                onCompleted(
                    sceneBackground,
                    result.verticalFov,
                    result.position.toArray(),
                    result.orientation.toArray()
                );
            }

            controller2.userData.isSelecting = false;
        }
    }

    function canvasUpdate() {
        canvasCtx.drawImage(webcam, 0, 0, webcamCanvas.width, webcamCanvas.height);

        if (cameraPosition == null) {
            // First step

            const targetSize = 0.75 * Math.min(videoWidth, videoHeight);

            canvasCtx.drawImage(
                targetImage, 
                (videoWidth - targetSize)/2.0, 
                (videoHeight - targetSize)/2.0, 
                targetSize, 
                targetSize
            );

        } else if (cameraTopLeftPosition == null) {
            // Second step

            const targetSize = 0.1 * Math.min(videoWidth, videoHeight);

            canvasCtx.drawImage(
                targetImage, 
                (0.25 * videoWidth) - (targetSize/2.0), 
                (0.25 * videoHeight) - (targetSize/2.0), 
                targetSize, 
                targetSize
            );

        } else if (cameraBottomRightPosition == null) {
            // Third step

            const targetSize = 0.1 * Math.min(videoWidth, videoHeight);

            canvasCtx.drawImage(
                targetImage, 
                (0.75 * videoWidth) - (targetSize/2.0), 
                (0.75 * videoHeight) - (targetSize/2.0), 
                targetSize, 
                targetSize
            );
        } else {
            // Completed!
        }

        if (canvasTexture) 
            canvasTexture.needsUpdate = true;
    }

    function renderSpectator() {
        if (!renderer.xr.isPresenting) { return }

        const xrCam = renderer.xr.getCamera();
        spectator.position.copy(xrCam.position);
        spectator.quaternion.copy(xrCam.quaternion);

        const currentRenderTarget = renderer.getRenderTarget();

        renderer.xr.isPresenting = false;

        renderer.setRenderTarget(null);
        renderer.render(scene, spectator);

        renderer.setRenderTarget(currentRenderTarget);
        renderer.xr.isPresenting = true;
    }

    function render() {
        controllerUpdate();
        canvasUpdate();
        renderer.render( scene, camera );
        renderSpectator();
    }

    renderer.setAnimationLoop( render );
    return sceneBackground;
}

export { CameraPoseSetup };
