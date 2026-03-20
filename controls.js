// Tickets:
// 4. Need auto detect for service id and char id
// 5. ***** handleData deprecate, to be replaced with global pid listener *****
//    - global pid listener will be called in bluetooth connection function instead of tempHandler
//    - global pid listener will include mode switch for pids/dtcs
//    - clean response processing will move to global pid listener
//    - global pid listener will also use master parse to process, and future display function to sent to frontpage
//    - Python backend will take pid list request, then cycle through large pid list 


const ELM327_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
let myChar = null;
let currentPIDInfo = null;
let globalListenerMode = "STREAMING";

const websocket = new WebSocket('wss:obd2-nwij.onrender.com');
websocket.onopen = function(event) {
            console.log('Connected to the WebSocket server.');
        };
websocket.addEventListener('message', async (event) => {
    try {
        const instruction = JSON.parse(event.data);
        // Example JSON: { "action": "request", "pid": "01 0C", "name": "RPM", "formula": "((A * 256) + B) / 4" }
        console.log('Message from server: ' + event.data);
        currentPIDInfo = instruction;
        // Below we are assessing the command sent by python backend, in the future, a frontpage selection
        // will determine what command python backend is sending to us. Function sendCommand tells the obd to give us
        // the data dictated by json pid
        if (instruction.action === "pidDisplay" && myChar) {
            await sendCommand(myChar, instruction.pid);
        }
    } catch (err) {
        console.error("Failed to parse JSON instruction", err);
    }
});
function sendMessage(message) {
            if (message) {
                websocket.send(message); // Send message to the Python server
            }
        }
websocket.onclose = function(event) {
            console.log('Disconnected from the WebSocket server.');
        };
websocket.onerror = function(error) {
            console.error('WebSocket error: ' + error.message);
        };

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
  
}

// requestRPM function will be deprecated
function requestRPM(){
  console.log('Function askForRPM working now...');
  sendCommand(myChar, '010C');
}

// handleData function may be the meat and potatoes of this script, for the foreseeable future it will be
// responsible for taking data from the obd and processing the data based on json instructions
//
function handleData(event, instruction) {// event is populated automatically when handleData function is called by eventlistener
  // 1. CAPTURE: Get the raw binary buffer from the 'event'
  const buffer = event.target.value; 

  // 2. DECODE: Convert the binary (1s and 0s) into a Text String
  const decoder = new TextDecoder();
  const textResponse = decoder.decode(buffer);

  // 3. CLEAN: Remove weird characters like > or \r
  const cleanResponse = textResponse.replace(/>|\r/g, '').trim();

  //console.log("The car just said:", cleanResponse);

  //RPM parse test
  // 1. Split the string into an array: ["41", "0C", "0F", "A0"]
  const parts = cleanResponse.split(' ');

  // 2. Identify the data bytes (usually at index 2 and 3)
  const A = parseInt(parts[2], 16);
  const B = parseInt(parts[3], 16);

  // 3. Do the math
  const rpm = ((A * 256) + B) / 4;
  
  console.log('RPMs: ', rpm); // 4000

  
  // Now you can send 'cleanResponse' to your React Dashboard!
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


  // Now 'myChar' is the active pipe.
  // You can pass it to other functions now:
  //setupListener(myChar);
  //askForRPM(myChar);
