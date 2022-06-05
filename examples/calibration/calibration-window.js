
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

export { CalibrationWindow, CalibrationWindowHeader };