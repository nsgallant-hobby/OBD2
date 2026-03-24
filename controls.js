// Tickets:
// 1. Need auto detect for service id and char id

const ELM327_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
let myChar = null;
let currentPIDInfo = null;
let pidMap = new Map(); // Global storage for your PIDs
let globalListenerMode = null;

async function connectBluetooth() {
  try {
    console.log('Searching for devices...')
    const device = await navigator.bluetooth.requestDevice({
        filters: [{namePrefix: 'vLinker MC-IOS'}],
        optionalServices: [ELM327_SERVICE_UUID]

    });

    console.log('Connecting to GATT Server...');
    const server = await device.gatt.connect();
    console.log('Connected:', device.name);

    const service = await server.getPrimaryService(ELM327_SERVICE_UUID);
    const characteristic = await service.getCharacteristic('bef8d6c9-9c21-4c9e-b632-bd58c1009f9f');
    // The following code is for detecting all available service uuids obviously
    //const characteristics = await service.getCharacteristics();
    //characteristics.forEach(c => {
    //    console.log('Found characteristic UUID:', c.uuid);
    //});

    // Below we are opening the listening pipeline to recieve data from the OBD device. 
    // Function handleData will handle data lol, based on json instruction
    // 
    // This listening pipeline gets passed to variable myChar
    //
    // const tempHandler = (event) => handleData(event, instruction);
    // characteristic.addEventListener('characteristicvaluechanged', tempHandler);
    globalListener(characteristic);
    await characteristic.startNotifications();
    
    return characteristic;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

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
        const response = await fetch('globalpids.json');
        
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


// sendCommand is a send-instructions-to-the-obd function.
// Remember we already have a obd listener(myChar) set up in bluetooth connection function
async function sendCommand(characteristic, command) {
  const encoder = new TextEncoder();
  // Commands must end with \r for the ELM327 to process them
  const data = encoder.encode(command + '\r');
  await characteristic.writeValue(data);
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
function requestRPM(){
  //console.log('Function askForRPM working now...');
  //sendCommand(myChar, '010C');
  loadPidLibrary();
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


