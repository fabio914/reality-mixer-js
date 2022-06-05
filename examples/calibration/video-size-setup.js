import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';

function VideoSizeSetup(onCompleted) {
    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Camera Setup");

    let widthDiv = document.createElement("div");
    widthDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let widthLabel = document.createElement("label");
    widthLabel.innerText = "Width";

    let widthInput = document.createElement("input");
    widthInput.type = "numeric";
    widthInput.style.marginLeft = "8px";
    widthInput.value = 1920;

    widthDiv.appendChild(widthLabel);
    widthDiv.appendChild(widthInput);

    let heightDiv = document.createElement("div");
    heightDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let heightLabel = document.createElement("label");
    heightLabel.innerText = "Height";

    let heightInput = document.createElement("input");
    heightInput.type = "numeric";
    heightInput.style.marginLeft = "8px";
    heightInput.value = 1080;

    heightDiv.appendChild(heightLabel);
    heightDiv.appendChild(heightInput);

    let linkDiv = document.createElement("div");
    linkDiv.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let link = document.createElement("a");
    link.innerText = "Continue";
    link.href = "#";
    link.style.color = "#EFEFEF";

    link.onclick = function() {
        const videoWidth = parseInt(widthInput.value);
        const videoHeight = parseInt(heightInput.value);

        if (isNaN(videoWidth) || isNaN(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
            return false;
        }

        onCompleted(calibrationWindow, videoWidth, videoHeight);
        return false;
    }

    linkDiv.appendChild(link);

    calibrationWindow.appendChild(header);
    calibrationWindow.appendChild(widthDiv);
    calibrationWindow.appendChild(heightDiv);
    calibrationWindow.appendChild(linkDiv);

    return calibrationWindow;
}

export { VideoSizeSetup };
