import * as THREE from 'three';
import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';
import { VRButton } from '../../node_modules/three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from '../../node_modules/three/examples/jsm/webxr/XRControllerModelFactory.js';
import { BoxLineGeometry } from '../../node_modules/three/examples/jsm/geometries/BoxLineGeometry.js';

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

    let webcam = document.createElement('video');

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

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    sceneBackground.appendChild( renderer.domElement );

    sceneBackground.appendChild( VRButton.createButton( renderer ) );

    // Controllers

    function buildController( data ) {

        let geometry, material;

        switch ( data.targetRayMode ) {

            case 'tracked-pointer':

                geometry = new THREE.BufferGeometry();
                geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
                geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

                material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

                return new THREE.Line( geometry, material );

            case 'gaze':

                geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
                material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
                return new THREE.Mesh( geometry, material );

        }

    }

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

    }

    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    controller1.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller1.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
    scene.add( controller1 );

    controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    controller2.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller2.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
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

    // TODO: Observe window resize

    function render() {

        // Update webcam texture

        canvasCtx.drawImage(webcam, 0, 0, webcamCanvas.width, webcamCanvas.height);

        // TODO: Update target overlay (based on current target)

        if (canvasTexture) 
            canvasTexture.needsUpdate = true;
        
        renderer.render( scene, camera );
    }

    renderer.setAnimationLoop( render );

    // TODO: Call callback after finishing calibration

    return sceneBackground;
}

export { CameraPoseSetup };
