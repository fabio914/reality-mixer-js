import { CameraCalibration, ChromaKey, Calibration } from 'reality-mixer';
import { CalibrationWindow, CalibrationWindowHeader, CalibrationLink } from './calibration-window.js';
import { CalibrationInput } from './calibration-input.js';
import { VideoSizeSetup } from './video-size-setup.js';
import { ChromaKeySetup } from './chroma-key-setup.js';
import { CameraPoseSetup } from './camera-pose-setup.js';

function CalibrationSetup(onCompleted) {
    let initialJSON;

    let calibrationBackground = document.createElement("div");

    calibrationBackground.style = `
        position:fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: black;
    `

    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Mixed Reality Capture Setup");

    let newCalibrationDiv = CalibrationLink("Create new calibration", function() {
        calibrationBackground.removeChild(calibrationWindow);

        let sizeSetup = VideoSizeSetup(
            function(editor, videoWidth, videoHeight) {
                calibrationBackground.removeChild(sizeSetup);

                let cKeySetup = ChromaKeySetup(videoWidth, videoHeight, 
                    function(editor, chromaKeyColor, chromaKeySimilarity, chromaKeySmoothness, crop) {
                        calibrationBackground.removeChild(cKeySetup);

                        let poseSetup = CameraPoseSetup(videoWidth, videoHeight, 
                            function(editor, cameraFov, cameraPosition, cameraOrientation) {
                                calibrationBackground.removeChild(poseSetup);

                                const delay = 4;

                                const calibrationJSON = {
                                    schemaVersion: 1,
                                    camera: {
                                        width: videoWidth,
                                        height: videoHeight,
                                        fov: cameraFov,
                                        position: cameraPosition,
                                        orientation: cameraOrientation
                                    },
                                    chromaKey: {
                                        color: chromaKeyColor,
                                        similarity: chromaKeySimilarity,
                                        smoothness: chromaKeySmoothness,
                                        crop: crop
                                    },
                                    delay: delay
                                };

                                const calibrationJSONString = JSON.stringify(calibrationJSON, null, 4);

                                let calibrationInput = CalibrationInput(function(editor, calibration) {
                                    calibrationBackground.removeChild(calibrationInput);
                                    onCompleted(calibrationBackground, calibration);
                                }, calibrationJSONString);

                                calibrationBackground.appendChild(calibrationInput);
                            }
                        );

                        calibrationBackground.appendChild(poseSetup);
                    }
                );

                calibrationBackground.appendChild(cKeySetup);
            }
        );

        calibrationBackground.appendChild(sizeSetup);
    });

    let loadCalibrationDiv = CalibrationLink("Load existing calibration", function() {
        calibrationBackground.removeChild(calibrationWindow);

        let calibrationInput = CalibrationInput(function(editor, calibration) {
            calibrationBackground.removeChild(calibrationInput);
            onCompleted(calibrationBackground, calibration);
        });

        calibrationBackground.appendChild(calibrationInput);
    });

    calibrationWindow.append(header, newCalibrationDiv, loadCalibrationDiv);
    calibrationBackground.appendChild(calibrationWindow);

    return calibrationBackground;
}

export { CalibrationSetup };
