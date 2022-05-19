import * as THREE from 'three';
import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';

function ChromaKeySetup(videoWidth, videoHeight, onCompleted) {
    let chromaKeyColor = [0, 1, 0];
    let chromaKeySimilarity = 0.1;
    let chromaKeySmoothness = 0;

    const vertexShader = `
        varying vec2 vUv;
        void main( void ) {     
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `

    const fragmentShader = `
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        varying vec2 vUv;
        uniform sampler2D map;

        void main() {
            vec4 videoColor = texture2D(map, vUv);
     
            float Y1 = 0.299 * keyColor.r + 0.587 * keyColor.g + 0.114 * keyColor.b;
            float Cr1 = keyColor.r - Y1;
            float Cb1 = keyColor.b - Y1;
            
            float Y2 = 0.299 * videoColor.r + 0.587 * videoColor.g + 0.114 * videoColor.b;
            float Cr2 = videoColor.r - Y2; 
            float Cb2 = videoColor.b - Y2; 
            
            float blend = smoothstep(similarity, similarity + smoothness, distance(vec2(Cr2, Cb2), vec2(Cr1, Cb1)));
            gl_FragColor = vec4(videoColor.rgb, videoColor.a * blend); 
        }
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
    webcamCanvas.width = 1024;
    webcamCanvas.height = 1024;

    let canvasCtx = webcamCanvas.getContext('2d');
    canvasCtx.fillStyle = '#000000';
    canvasCtx.fillRect(0, 0, webcamCanvas.width, webcamCanvas.height);

    let webcamTexture = new THREE.Texture(webcamCanvas);
    webcamTexture.minFilter = THREE.LinearFilter;
    webcamTexture.magFilter = THREE.LinearFilter;

    let outputCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
    let outputScene = new THREE.Scene();

    const middleGeometry = new THREE.PlaneGeometry( videoWidth, videoHeight );
    const middleMaterial = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            map: { value: webcamTexture },
            keyColor: { value: chromaKeyColor },
            similarity: { value: chromaKeySimilarity },
            smoothness: { value: chromaKeySmoothness }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    })

    let middleLayerMesh = new THREE.Mesh( middleGeometry, middleMaterial );
    middleLayerMesh.position.z = - 20;
    outputScene.add( middleLayerMesh );

    let renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;

    function animateChromaSetup() {
        requestAnimationFrame( animateChromaSetup );

        middleMaterial.uniforms.keyColor.value = chromaKeyColor;
        middleMaterial.uniforms.similarity.value = chromaKeySimilarity;
        middleMaterial.uniforms.smoothness.value = chromaKeySmoothness;

        canvasCtx.drawImage(webcam, 0, 0, webcamCanvas.width, webcamCanvas.height);

        if (webcamTexture) 
            webcamTexture.needsUpdate = true;

        renderer.render( outputScene, outputCamera );
    }

    let chromaKeyBackground = document.createElement("div");

    chromaKeyBackground.style = `
        position:fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px;
        background-color: white;
    `

    chromaKeyBackground.appendChild( renderer.domElement );
    animateChromaSetup();

    // TODO: Observe resize

    // TODO: Add window with input

    // TODO: Call callback with result

    const hexToRgb = hex =>
        hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i ,(m, r, g, b) => '#' + r + r + g + g + b + b)
            .substring(1)
            .match(/.{2}/g)
            .map(x => parseInt(x, 16)/255.0)

    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Chroma Key Setup");

    let colorDiv = document.createElement("div");
    colorDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let colorLabel = document.createElement("label");
    colorLabel.innerText = "Chroma Key Color ";

    let colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = "#00FF00";

    colorInput.oninput = function() {
        chromaKeyColor = hexToRgb(this.value);
    }

    colorDiv.appendChild(colorLabel);
    colorDiv.appendChild(colorInput);

    // TODO: Add sliders for similarity and smoothness

    calibrationWindow.appendChild(header);
    calibrationWindow.appendChild(colorDiv);

    chromaKeyBackground.appendChild(calibrationWindow);
    return chromaKeyBackground;
}

export { ChromaKeySetup };
