
import { connectBluetooth, sendCommand } from './ConnectionManager.js';

let currentPIDInfo = null;
let pidMap = new Map(); // Global storage for your PIDs
let globalListenerMode = null;





// function loadPidLibrary will obviously load a json pid list as per a frontpage selection, 
// based on the vehicle being worked on. In the future it will require a fall back to the global
// pid list should it fail to find a manufacturer specific one




// connectButton is where myChar goes from null to having obd receiving pipeline assigned to it
// This will be handled by a simple frontpage button for the foreseeable future
async function connectbutton (){
  myChar = await connectBluetooth();
  console.log('Bluetooth connected...');
  globalListenerMode = "STREAMING";
  console.log('Streaming mode is now active...');
}

// requestRPM function will be deprecated
async function LoadPidList(){
  //console.log('Function askForRPM working now...');
  //sendCommand(myChar, '010C');
  await loadPidLibrary();
  renderLiveDashboard();
}



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

