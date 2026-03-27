import { getCurrentMode, MODES } from './ScannerMode.js';
import { pidMap } from './PidMapStore.js';
import { updatePidValue } from './RenderPids.js';
import { masterParse } from './MasterParser.js';

const ELM327_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
let characteristic = null;


export async function connectBluetooth() {
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
    characteristic = await service.getCharacteristic('bef8d6c9-9c21-4c9e-b632-bd58c1009f9f');
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

export async function getPipeline() {
    if (!characteristic || !characteristic.service.device.gatt.connected) {
        console.warn("Attempted to access pipeline before connection!");
        return null;
    }
    return characteristic;
}

// sendCommand is a send-instructions-to-the-obd function.
// Remember we already have a obd listener(myChar) set up in bluetooth connection function
export async function sendCommand(command) {
    const pipe = await getPipeline();
    //console.log("Pipe object:", pipe);
    const encoder = new TextEncoder();
    // Commands must end with \r for the ELM327 to process them
    const data = encoder.encode(command + '\r');
    await pipe.writeValue(data);
}

export async function globalListener(characteristic) {
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
        console.log("Clean response = ", cleanResponse);
        // Safety check: ensure we know what we just asked for
        if (getCurrentMode === MODES.STREAMING_PIDS) {
            // Fast math for RPM, Speed, etc.
            //const result = masterParse(cleanResponse, currentPIDInfo.formula);
            //console.log('RPMs: ', result); 
            //updatePidValue() 
            if (raw.startsWith("41")) {
                const pidId = "01" + cleanResponse.substring(2, 4); // e.g., "010C"
                const pidInfo = pidMap.get(id);

                if (pidInfo) {
                    // Call the Master Parser (Brain)
                    const processedValue = masterParse(cleanResponse, pidInfo.formula);

                    // 3. UI UPDATE (Face)
                    updatePidValue(pidId, processedValue);
                }
            }
        } 

        else if (getCurrentMode === MODES.READING_DTC) {
            // Buffer and decode fault codes (e.g., 43 01 03 00 -> P0103)
            // processDTCBuffer(hex);
        }
    });
}