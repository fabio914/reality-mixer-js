
function CalibrationWindow() {
    let popupDiv = document.createElement("div");

    popupDiv.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #303841;
        border-radius: 4px;
        font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        color: #EFEFEF;
        overflow: hidden;
    `

    return popupDiv;
}

function CalibrationWindowHeader(title) {
    let headerDiv = document.createElement("div");
    headerDiv.style = "background-color: #2E3238; padding: 8px; text-align: center; font-size: 75%;";
    headerDiv.innerText = title;
    return headerDiv;
}

function CalibrationRangeInput(
    label,
    value,
    onValidInput,
    minValue = 0.0,
    maxValue = 1.0,
    step = 0.01
) {
    let divElement = document.createElement("div");
    divElement.style = "padding: 8px; white-space: pre-wrap; background-color: #50565E;";

    let labelElement = document.createElement("label");
    labelElement.innerText = label;

    let rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.style.width = "300px";
    rangeInput.style.marginLeft = "8px";
    rangeInput.min = minValue;
    rangeInput.max = maxValue;
    rangeInput.step = step;
    rangeInput.value = value;

    let textInput = document.createElement("input");
    textInput.type = "numeric";
    textInput.style.marginLeft = "8px";
    textInput.value = value;

    divElement.appendChild(labelElement);
    divElement.appendChild(rangeInput);
    divElement.appendChild(textInput);

    rangeInput.oninput = function() {
        const newValue = parseFloat(this.value);
        textInput.value = newValue;
        onValidInput(newValue);
    }

    textInput.oninput = function() {
        const floatValue = parseFloat(this.value);
        if(isNaN(floatValue) || floatValue < minValue || floatValue > maxValue) { return }
        rangeInput.value = floatValue;
        onValidInput(floatValue);
    }

    return divElement;
}

export { CalibrationWindow, CalibrationWindowHeader, CalibrationRangeInput };