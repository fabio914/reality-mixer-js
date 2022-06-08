import * as THREE from 'three';
import { 
    CalibrationWindow, CalibrationWindowHeader, CalibrationSection, CalibrationLink, CalibrationRangeInput 
} from './calibration-window.js';

function ChromaKeySetup(videoWidth, videoHeight, onCompleted) {
    let chromaKeyColor = [0, 1, 0];
    let chromaKeySimilarity = 0.1;
    let chromaKeySmoothness = 0;

    let cropLeft = 0;
    let cropRight = 0;
    let cropBottom = 0;
    let cropTop = 0;

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
        uniform vec4 crop; // left, right, bottom, top

        varying vec2 vUv;
        uniform sampler2D map;

        void main() {
            if (vUv.x < crop.x || vUv.x > (1.0 - crop.y) || vUv.y < crop.z || vUv.y > (1.0 - crop.w)) {
                gl_FragColor = vec4(1, 1, 1, 0);
                return;
            }

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
    webcamCanvas.width = videoWidth;
    webcamCanvas.height = videoHeight;

    let canvasCtx = webcamCanvas.getContext('2d');
    canvasCtx.fillStyle = '#000000';
    canvasCtx.fillRect(0, 0, webcamCanvas.width, webcamCanvas.height);

    let webcamTexture = new THREE.Texture(webcamCanvas);
    webcamTexture.minFilter = THREE.LinearFilter;
    webcamTexture.magFilter = THREE.LinearFilter;

    // FIXME: Fix video position when video aspect ratio doesn't match window aspect ratio
    let outputCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
    let outputScene = new THREE.Scene();

    const middleGeometry = new THREE.PlaneGeometry( videoWidth, videoHeight );
    const middleMaterial = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            map: { value: webcamTexture },
            keyColor: { value: chromaKeyColor },
            similarity: { value: chromaKeySimilarity },
            smoothness: { value: chromaKeySmoothness },
            crop: { value: [cropLeft, cropRight, cropBottom, cropTop] }
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
        middleMaterial.uniforms.crop.value = [cropLeft, cropRight, cropBottom, cropTop];

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

    const hexToRgb = hex =>
        hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i ,(m, r, g, b) => '#' + r + r + g + g + b + b)
            .substring(1)
            .match(/.{2}/g)
            .map(x => parseInt(x, 16)/255.0)

    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Chroma Key Setup");

    let colorDiv = CalibrationSection();

    let colorLabel = document.createElement("label");
    colorLabel.innerText = "Chroma Key Color";

    let colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.style.marginLeft = "8px";
    colorInput.value = "#00FF00";

    colorInput.oninput = function() {
        chromaKeyColor = hexToRgb(this.value);
    }

    colorDiv.append(colorLabel, colorInput);

    let similarityDiv = CalibrationRangeInput("Similarity ", chromaKeySimilarity, function(newValue) {
        chromaKeySimilarity = newValue;
    });

    let smoothnessDiv = CalibrationRangeInput("Smoothness ", chromaKeySmoothness, function(newValue) {
        chromaKeySmoothness = newValue;
    });

    let cropDiv = document.createElement("div");

    let cropTopDiv = CalibrationRangeInput("Crop Top   ", cropTop, function(newValue) {
        cropTop = newValue;
    });

    let cropBottomDiv = CalibrationRangeInput("Crop Bottom", cropBottom, function(newValue) {
        cropBottom = newValue;
    });

    let cropLeftDiv = CalibrationRangeInput("Crop Left  ", cropLeft, function(newValue) {
        cropLeft = newValue;
    });

    let cropRightDiv = CalibrationRangeInput("Crop Right ", cropRight, function(newValue) {
        cropRight = newValue;
    });

    cropDiv.append(cropTopDiv, cropBottomDiv, cropLeftDiv, cropRightDiv);
    cropDiv.style.display = "none";

    let showCropDiv = CalibrationLink("More options", function() {
        cropDiv.style.display = "block";
        showCropDiv.style.display = "none";
    });

    let linkDiv = CalibrationLink("Continue", function() {
        onCompleted(
            chromaKeyBackground, 
            chromaKeyColor, 
            chromaKeySimilarity, 
            chromaKeySmoothness,
            [cropLeft, cropRight, cropBottom, cropTop]
        );
    });

    calibrationWindow.append(
        header,
        colorDiv,
        similarityDiv,
        smoothnessDiv,
        showCropDiv,
        cropDiv,
        linkDiv
    );

    chromaKeyBackground.appendChild(calibrationWindow);
    return chromaKeyBackground;
}

export { ChromaKeySetup };
