import { Calibration } from 'reality-mixer';
import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';
import { CalibrationInput } from './calibration-input.js';

function VideoSizeSetup(onCompleted) {
    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Camera Setup");

    let widthDiv = document.createElement("div");
    widthDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let widthLabel = document.createElement("label");
    widthLabel.innerText = "Width";

    let widthInput = document.createElement("input");
    widthInput.type = "number";
    widthInput.value = 1920;

    widthDiv.appendChild(widthLabel);
    widthDiv.appendChild(widthInput);

    let heightDiv = document.createElement("div");
    heightDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let heightLabel = document.createElement("label");
    heightLabel.innerText = "Height";

    let heightInput = document.createElement("input");
    heightInput.type = "number";
    heightInput.value = 1080;

    heightDiv.appendChild(heightLabel);
    heightDiv.appendChild(heightInput);

    // TODO Validate input

    let linkDiv = document.createElement("div");
    linkDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let link = document.createElement("a");
    link.innerText = "Continue";
    link.href = "#";
    link.style.color = "#EFEFEF";

    link.onclick = function() {
        onCompleted(calibrationWindow, widthInput.value, heightInput.value);
        return false;
    }

    linkDiv.appendChild(link);

    calibrationWindow.appendChild(header);
    calibrationWindow.appendChild(widthDiv);
    calibrationWindow.appendChild(heightDiv);
    calibrationWindow.appendChild(linkDiv);

    return calibrationWindow;
}

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

    let newCalibrationDiv = document.createElement("div");
    newCalibrationDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let createNewLink = document.createElement("a");
    createNewLink.innerText = "Create new calibration";
    createNewLink.href = "#";
    createNewLink.style.color = "#EFEFEF";

    createNewLink.onclick = function() {
        calibrationBackground.removeChild(calibrationWindow);

        let sizeInput = VideoSizeSetup(function(editor, width, height) {
            calibrationBackground.removeChild(sizeInput);
            console.log("Width: " + width + " Height: " + height);
            // TODO: Next step
        });

        calibrationBackground.appendChild(sizeInput);
        return false;
    }

    newCalibrationDiv.appendChild(createNewLink);

    let loadCalibrationDiv = document.createElement("div");
    loadCalibrationDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let loadCalibrationLink = document.createElement("a");
    loadCalibrationLink.innerText = "Load existing calibration";
    loadCalibrationLink.href = "#";
    loadCalibrationLink.style.color = "#EFEFEF";

    loadCalibrationLink.onclick = function() {
        calibrationBackground.removeChild(calibrationWindow);

        let calibrationInput = CalibrationInput(function(editor, calibration) {
            onCompleted(calibrationBackground, calibration);
        });

        calibrationBackground.appendChild(calibrationInput);
        return false;
    }

    loadCalibrationDiv.appendChild(loadCalibrationLink);

    calibrationWindow.appendChild(header);
    calibrationWindow.appendChild(newCalibrationDiv);
    calibrationWindow.appendChild(loadCalibrationDiv);

    calibrationBackground.appendChild(calibrationWindow);

    return calibrationBackground;
}

export { CalibrationSetup };
