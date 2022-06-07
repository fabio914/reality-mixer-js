import { Calibration } from 'reality-mixer';
import { CalibrationWindow, CalibrationWindowHeader } from './calibration-window.js';

const exampleCalibrationJSON = `
{ 
    "schemaVersion": 1, 
    "camera": { 
        "width": 1920, 
        "height": 1080, 
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
`

function CalibrationInput(
    onCompleted,
    initialCalibrationJSON = null
) {
    let initialJSON;

    if (initialCalibrationJSON == null) {
        let persistedJSON = localStorage.getItem("calibration-v1");

        if (persistedJSON == null) {
            initialJSON = exampleCalibrationJSON;
        } else {
            initialJSON = persistedJSON;
        }
    } else {
        initialJSON = initialCalibrationJSON;
    }

    let calibrationWindow = CalibrationWindow();

    let header = CalibrationWindowHeader("Calibration Input");

    let titleDiv = document.createElement("div");

    titleDiv.style = "background-color: #50565E; padding: 8px";
    titleDiv.innerText = "Paste or drag and drop your Mixed Reality calibration below:";

    let resultDiv = document.createElement("div");

    resultDiv.style = "padding: 8px; white-space: pre-wrap; background-color: green;";

    let editor = document.createElement("textarea");

    editor.style = `
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        border: none;
        box-shadow: none;
        outline: none;
        background-color: #303841;
        color: #EFEFEF;
        resize: none;
        margin: 0px;
    `

    editor.rows = 20;
    editor.cols = 80;
    editor.spellcheck = false;
    editor.value = initialJSON;

    function validateCalibration() {
        const maybeJson = editor.value;

        try {
            const json = JSON.parse(maybeJson);
            const calibration = Calibration.fromData(json);

            resultDiv.style.backgroundColor = "green";
            resultDiv.innerHTML = "";

            let link = document.createElement("a");
            link.innerText = "Click here to continue...";
            link.href = "#";
            link.style.color = "#EFEFEF";

            link.onclick = function() {
                localStorage.setItem("calibration-v1", maybeJson);
                onCompleted(calibrationWindow, calibration);
                return false;
            }

            resultDiv.appendChild(link);
        } catch (error) {
            resultDiv.innerText = error;
            resultDiv.style.backgroundColor = "red";
        }
    }

    editor.oninput = validateCalibration;
    validateCalibration();

    calibrationWindow.appendChild(header);
    calibrationWindow.appendChild(titleDiv);
    calibrationWindow.appendChild(editor);
    calibrationWindow.appendChild(resultDiv);

    calibrationWindow.ondrop = function(e) {
        e.preventDefault();

        let file = e.dataTransfer.files[0],
            reader = new FileReader();

        reader.onload = function(event) {
            editor.value = event.target.result;
            validateCalibration();
        };

        reader.readAsText(file);
        return false;
    }

    return calibrationWindow;
}

export { CalibrationInput };
