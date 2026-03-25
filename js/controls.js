import { loadPidLibrary } from './LoadLibrary.js';
import { connectBluetooth, sendCommand } from './ConnectionManager.js';

let pidMap = new Map(); // Global storage for your PIDs

// connectButton is where myChar goes from null to having obd receiving pipeline assigned to it
// This will be handled by a simple frontpage button for the foreseeable future

//import { connectToDevice } from './connection.js';
//import { loadVehicleLibrary } from './loader.js';

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    
    // Attach the logic to the button ID
    document.getElementById('connectbutton').addEventListener('click', async () => {
        console.log("Connect clicked!");
        await connectBluetooth();
    });

    document.getElementById('LoadPidList').addEventListener('click', async () => {
        pidMap = await loadPidLibrary();
        renderLiveDashboard();
    });
});

function renderLiveDashboard() {
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

