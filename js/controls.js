// Tickets:
// 1. Need auto detect for service id and char id

import { connectBluetooth, sendCommand } from './ConnectionManager.js';

let currentPIDInfo = null;
let pidMap = new Map(); // Global storage for your PIDs
let globalListenerMode = null;



function globalListener(characteristic) {
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
        // const raw = event.target.value;
        // const hex = new TextDecoder().decode(raw);
        // 1. CAPTURE: Get the raw binary buffer from the 'event'
        const buffer = event.target.value; 

        // 2. DECODE: Convert the binary (1s and 0s) into a Text String
        const decoder = new TextDecoder();
        const textResponse = decoder.decode(buffer);

        // 3. CLEAN: Remove weird characters like > or \r
        const cleanResponse = textResponse.replace(/>|\r/g, '').trim();

        // Safety check: ensure we know what we just asked for
        if (globalListenerMode === "STREAMING" && currentPIDInfo) {
            // Fast math for RPM, Speed, etc.
            const result = masterParse(cleanResponse, currentPIDInfo.formula);
            console.log('RPMs: ', result); 
            // updateGauges(result); 
            // ****************************************** 
            // This is where PID update will be sent to front page
            // The speed of PID update will be determined in python backend
        } 
        else if (globalListenerMode === "DIAGNOSTIC") {
            // Buffer and decode fault codes (e.g., 43 01 03 00 -> P0103)
            // processDTCBuffer(hex);
        }
    });
}

// function loadPidLibrary will obviously load a json pid list as per a frontpage selection, 
// based on the vehicle being worked on. In the future it will require a fall back to the global
// pid list should it fail to find a manufacturer specific one
async function loadPidLibrary() {
    // Replace this URL with your actual GitHub Pages URL later
    //const url = 'https://raw.githubusercontent.com/username/repo/main/pids/generic.json';

    try {
        const response = await fetch('pids/globalpids.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Convert the Array to a Map for O(1) lookup speed
        // This lets you find a PID instantly using: pidMap.get("010C")
        pidMap = new Map(data.map(obj => [obj.id, obj]));

        console.log("OBD-II Library Loaded:", pidMap.size, "PIDs ready.");
        
        currentPIDInfo = pidMap.get("010C");

        // Trigger your UI render once data is in
        //renderPidList();

    } catch (error) {
        console.error("Failed to load PID library:", error);
    }
}




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

function masterParse(cleanResponse, formula) {
    const parts = cleanResponse.split(' ');
    
    // OBD-II responses usually start at index 2 (41 0C [A] [B] ...)
    const A = parseInt(parts[2], 16);
    const B = parseInt(parts[3], 16)||0;
    const C = parseInt(parts[4], 16)||0;
    const D = parseInt(parts[5], 16)||0;

    // Create a simple math environment
    // We replace the letters in the string with our actual numbers
    const finalFormula = formula
        .replace(/A/g, A)
        .replace(/B/g, B)
        .replace(/C/g, C)
        .replace(/D/g, D);

    // Use Function constructor instead of eval() for slightly better safety/speed
    try {
        return new Function(`return ${finalFormula}`)();
    } catch (e) {
        console.error("Formula error:", e);
        return null;
    }
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

