import { CalibrationWindow, CalibrationWindowHeader, CalibrationSection, CalibrationLink } from './calibration-window.js';

function VideoSizeSetup(onCompleted) {
    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Camera Setup");

    let widthDiv = CalibrationSection();

    let widthLabel = document.createElement("label");
    widthLabel.innerText = "Width";

    let widthInput = document.createElement("input");
    widthInput.type = "numeric";
    widthInput.style.marginLeft = "8px";
    widthInput.value = 1920;

    widthDiv.append(widthLabel, widthInput);

    let heightDiv = CalibrationSection();

    let heightLabel = document.createElement("label");
    heightLabel.innerText = "Height";

    let heightInput = document.createElement("input");
    heightInput.type = "numeric";
    heightInput.style.marginLeft = "8px";
    heightInput.value = 1080;

    heightDiv.append(heightLabel, heightInput);

    let linkDiv = CalibrationLink("Continue", function() {
        const videoWidth = parseInt(widthInput.value);
        const videoHeight = parseInt(heightInput.value);

        if (isNaN(videoWidth) || isNaN(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
            return false;
        }

        onCompleted(calibrationWindow, videoWidth, videoHeight);
    });

    calibrationWindow.append(
        header,
        widthDiv,
        heightDiv,
        linkDiv
    );

    return calibrationWindow;
}

export { VideoSizeSetup };
