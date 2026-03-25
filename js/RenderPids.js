import { pidMap } from './PidMapStore.js';

export function renderPidList() {
    const displayArea = document.getElementById('pid-list-container');
    let htmlContent = "";
    
    pidMap.forEach((dataLine, id) => {
        htmlContent += `
            <div class="pid-box" style="border: 1px solid #444; margin: 5px; padding: 10px;">
                <strong style="color: #ff8c00;">${dataLine.name}</strong><br>
                <span style="font-size: 1.5em;" id="val-${id}">--</span> ${dataLine.unit}
            </div>
            <hr>
        `;
    });
    displayArea.innerHTML = htmlContent;
}

export function updatePidValue(pidId, newValue) {
    // This finds the <span id="val-010C"> we created during render
    const element = document.getElementById(`val-${pidId}`);
    if (element) {
        element.innerText = newValue;
        
        // Visual flair: Flash green on update
        element.style.color = "#00ff00";
        setTimeout(() => { element.style.color = "white"; }, 100);
    }
}