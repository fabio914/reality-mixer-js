import * as THREE from 'three';
import validate from './validate-schema.js';

class CameraCalibration {
    width;
    height;
    fov; // degrees
    position; // Vector3 x y z
    orientation; // Unit Quaternion x y z w

    constructor( 
        width = 1920.0,
        height = 1080.0,
        fov = 38,
        position = [0, 1.5, 0],
        orientation = [0, 0, 0, 1]
    ) {
        this.width = Math.max(width, 0);
        this.height = Math.max(height, 0);
        this.fov = Math.max(fov, 0);
        this.position = position;
        this.orientation = orientation;
    }
}

class ChromaKey {
    color; // r g b 0...1
    similarity; // 0...1
    smoothness; // 0...1
    crop; // left right bottom top 0...1
  
    constructor(
        color = [0.0, 1.0, 0.0],
        similarity = 0.25,
        smoothness = 0.0,
        crop = [0, 0, 0, 0]
    ) {
        this.color = color.map(x => Math.max(0, Math.min(1, x)));
        this.similarity = Math.max(0, Math.min(1, similarity));
        this.smoothness = Math.max(0, Math.min(1, smoothness));
        this.crop = crop.map(x => Math.max(0, Math.min(1, x)));
    }
}

class Calibration {
    camera;
    chromaKey;
    delayInFrames;

    constructor(
        camera = new CameraCalibration(),
        chromaKey = new ChromaKey(),
        delayInFrames = 2
    ) {
        this.camera = camera;
        this.chromaKey = chromaKey;
        this.delayInFrames = Math.max(0, delayInFrames);
    }

    static fromData(data) {
        // We're not checking if the orientation is a valid unit quaternion

        if (!validate(data)) {
            throw JSON.stringify(validate.errors, null, 2);
        }

        const cameraCalibration = new CameraCalibration(
            data.camera.width,
            data.camera.height,
            data.camera.fov,
            data.camera.position,
            data.camera.orientation
        )

        const chromaKey = new ChromaKey(
            data.chromaKey.color,
            data.chromaKey.similarity,
            data.chromaKey.smoothness,
            data.chromaKey.crop
        )

        const calibration = new Calibration(
            cameraCalibration,
            chromaKey,
            data.delay
        )

        return calibration;
    }
}

class MixedRealityCapture {
    #calibration; // Calibration
    #near;
    #far;

    #numberOfFrames;
    #currentDisplayFrameIndex;
    #currentRenderFrameIndex;

    #camera;
    #backgroundRenderTargets; 
    #foregroundRenderTargets;

    #outputCamera;
    #outputScene;
    #outputRenderer;

    #backgroundLayerMeshes;
    #middleLayerMesh;
    #foregroundLayerMeshes;

    #webcam; 
    #webcamTexture;

    constructor(
        calibration,
        near = 0.1,
        far = 10.0
    ) {
        this.#calibration = calibration;
        this.#near = Math.max(0.1, near);
        this.#far = Math.max(0.1, far);

        this.#numberOfFrames = (calibration.delayInFrames + 1);
        this.#currentDisplayFrameIndex = 0;
        this.#currentRenderFrameIndex = calibration.delayInFrames;

        // WebCam

        let webcam = document.createElement('video');
        this.#webcam = webcam;

        let constraints = { audio: false, video: { width: calibration.camera.width, height: calibration.camera.height } };

        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(function (mediaStream) {
                webcam.srcObject = mediaStream;
                webcam.play();
            })
            .catch(function (err) {
                alert(err.name + ': ' + err.message)
            });

        let webcamTexture = new THREE.VideoTexture(webcam);
        this.#webcamTexture = webcamTexture;

        // Creating Mixed Reality camera that will render to the foreground and background layers

        this.#camera = new THREE.PerspectiveCamera( calibration.camera.fov, calibration.camera.width / calibration.camera.height, this.#near, this.#far );
    
        this.#camera.position.fromArray( calibration.camera.position );
        this.#camera.quaternion.fromArray( calibration.camera.orientation );

        // Creating render targets for the foreground and background layers

        this.#backgroundRenderTargets = [];
        this.#foregroundRenderTargets = [];

        for (let i = 0; i < this.#numberOfFrames; i++) { 
            this.#backgroundRenderTargets[i] = new THREE.WebGLRenderTarget( calibration.camera.width, calibration.camera.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter });
            this.#foregroundRenderTargets[i] = new THREE.WebGLRenderTarget( calibration.camera.width, calibration.camera.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter });
        }

        // Creating Mixed Reality Composition camera and scene

        this.#outputCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
        this.#outputScene = new THREE.Scene();

        // Adding Background layer (everything between the player and the background)

        this.#backgroundLayerMeshes = [];

        for (let i = 0; i < this.#numberOfFrames; i++) {
            const backgroundGeometry = new THREE.PlaneGeometry( calibration.camera.width, calibration.camera.height );
            const backgroundMaterial = new THREE.MeshBasicMaterial({ map: this.#backgroundRenderTargets[i].texture });
            this.#backgroundLayerMeshes[i] = new THREE.Mesh( backgroundGeometry, backgroundMaterial );
            this.#backgroundLayerMeshes[i].position.z = - 30;
            this.#backgroundLayerMeshes[i].visible = false;
            this.#outputScene.add( this.#backgroundLayerMeshes[i] );
        }

        // Adding Middle layer (webcam)

        const middleGeometry = new THREE.PlaneGeometry( calibration.camera.width, calibration.camera.height );
        const middleMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                map: { value: webcamTexture },
                keyColor: { value: calibration.chromaKey.color },
                similarity: { value: calibration.chromaKey.similarity },
                smoothness: { value: calibration.chromaKey.smoothness },
                crop: { value: calibration.chromaKey.crop }
            },
            vertexShader: this.#vertexShader(),
            fragmentShader: this.#fragmentShader(),
        })
        this.#middleLayerMesh = new THREE.Mesh( middleGeometry, middleMaterial );
        this.#middleLayerMesh.position.z = - 20;
        this.#outputScene.add( this.#middleLayerMesh );

        // Adding Foreground layer (everything between the player and the mixed reality camera)

        this.#foregroundLayerMeshes = [];

        for (let i = 0; i < this.#numberOfFrames; i++) {
            const foregroundGeometry = new THREE.PlaneGeometry( calibration.camera.width, calibration.camera.height );
            const foregroundMaterial = new THREE.MeshBasicMaterial( { map: this.#foregroundRenderTargets[i].texture, transparent: true } );
            this.#foregroundLayerMeshes[i] = new THREE.Mesh( foregroundGeometry, foregroundMaterial );
            this.#foregroundLayerMeshes[i].position.z = - 10;
            this.#foregroundLayerMeshes[i].visible = false;
            this.#outputScene.add( this.#foregroundLayerMeshes[i] );
        }

        // Creating renderer

        this.#outputRenderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
        this.#outputRenderer.setPixelRatio( window.devicePixelRatio );
        this.#outputRenderer.setSize( window.innerWidth, window.innerHeight );
        this.#outputRenderer.outputEncoding = THREE.sRGBEncoding;
    }

    get domElement() {
        return this.#outputRenderer.domElement;
    }

    onWindowResize() {
        this.#outputCamera.left =  window.innerWidth / - 2;
        this.#outputCamera.right = window.innerWidth / 2;
        this.#outputCamera.top = window.innerHeight / 2;
        this.#outputCamera.bottom = window.innerHeight / - 2;
        this.#outputCamera.updateProjectionMatrix();
        this.#outputRenderer.setSize( window.innerWidth, window.innerHeight );
    }

    render(xr, scene) {

        if (!xr.isPresenting) 
            return;

        const vrCameraPosition = xr.getCamera().position;

        let cameraForward = new THREE.Vector3( 0, 0, 0 );
        this.#camera.getWorldDirection( cameraForward );

        const projectedDistance = Math.max(cameraForward.dot(vrCameraPosition.sub(this.#camera.position)), this.#near);

        // Disable WebXR rendering
        xr.isPresenting = false;

        // Update camera frustum (everything between the VR camera and the background)
        this.#camera.near = projectedDistance;
        this.#camera.far = this.#far;
        this.#camera.updateProjectionMatrix();

        // Render background layer to current render target
        this.#outputRenderer.setRenderTarget( this.#backgroundRenderTargets[this.#currentRenderFrameIndex] );
        this.#outputRenderer.render( scene, this.#camera );

        // Save scene background and clear background
        const originalBackgroundColor = scene.background;
        scene.background = null;

        // Update camera frustum (everything between the mixed reality camera and the VR camera)
        this.#camera.near = this.#near;
        this.#camera.far = projectedDistance;
        this.#camera.updateProjectionMatrix();

        // Render foreground layer to current render target
        this.#outputRenderer.setRenderTarget( this.#foregroundRenderTargets[this.#currentRenderFrameIndex] );
        this.#outputRenderer.render( scene, this.#camera );

        // Restore scene background
        scene.background = originalBackgroundColor;

        // FIXME: Colors are off.

        // Make foreground and background layers of the current display frame visible
        this.#backgroundLayerMeshes[this.#currentDisplayFrameIndex].visible = true;
        this.#foregroundLayerMeshes[this.#currentDisplayFrameIndex].visible = true;

        // Render composite output
        this.#outputRenderer.setRenderTarget( null );
        this.#outputRenderer.render( this.#outputScene, this.#outputCamera );

        // Hide foreground and background layers
        this.#backgroundLayerMeshes[this.#currentDisplayFrameIndex].visible = false;
        this.#foregroundLayerMeshes[this.#currentDisplayFrameIndex].visible = false;

        // Increment indices
        this.#currentDisplayFrameIndex = (this.#currentDisplayFrameIndex + 1) % this.#numberOfFrames;
        this.#currentRenderFrameIndex =  (this.#currentRenderFrameIndex  + 1) % this.#numberOfFrames;

        // Re-enable WebXR
        xr.isPresenting = true;
    }

    // Chroma Key Shaders

    #vertexShader() {
        return `
            varying vec2 vUv;
            void main( void ) {     
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
        `
    }

    #fragmentShader() {
        return `
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
    }
}

export { CameraCalibration, ChromaKey, Calibration, MixedRealityCapture };

