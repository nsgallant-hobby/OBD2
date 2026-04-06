import { setScannerMode, getCurrentMode, MODES } from './ScannerMode.js';
import { pidMap } from './PidMapStore.js';
import { updatePidValue } from './RenderPids.js';
import { masterParse } from './MasterParser.js';
import { toggle_send_command_blocker } from './Promise.js';
import { get_header, register_header, HEADERS } from './Headers.js';

const ELM327_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
let characteristic = null;
//let ECMHeader = null;
let pidInfo = null;

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
    console.log("Sending command:", command);
    await pipe.writeValue(data);
}

export async function globalListener(characteristic) {
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
         // 1. CAPTURE: Get the raw binary buffer from the 'event'
        const buffer = event.target.value; 
    
        // 2. DECODE: Convert the binary (1s and 0s) into a Text String
        const decoder = new TextDecoder();
        const textResponse = decoder.decode(buffer);

        // 3. CLEAN: Remove weird characters like > or \r
        // want to keep > for now, to signal end of multiline response from obd
        // orignally line looked like this
        // ...textResponse.replace(/>|\r/g, '')...
        let cleanResponse = textResponse.replace(/|\r/g, '').trim();
        console.log("Clean response = ", cleanResponse);
        if(cleanResponse === ">") toggle_send_command_blocker(); 
        if(cleanResponse.length === 4 && !(cleanResponse === "SEAR")) {
            pidInfo = cleanResponse;
            console.log("Pid id = ", pidInfo);
        }
        console.log("pidInfo = ", pidInfo);
        const landmark = "41 " + pidInfo.slice(-2);
        console.log("landmark = ", landmark);
        const landmarkIndex = cleanResponse.indexOf(landmark);
        console.log("landmarkIndex = ", landmarkIndex);
        
        const count = cleanResponse.split(landmark).length - 1;
        const isRepeated = count > 1; 
        if(isRepeated){
            const halfLength = Math.floor(cleanResponse.length / 2);
            const firstHalf = cleanResponse.substring(0, halfLength);
            if(firstHalf) cleanResponse = firstHalf;
        }
        //if (landmarkIndex !== -1) {
            // 1. Everything BEFORE the landmark (minus the 1-byte PCI length) is the Header
            // We subtract 2 hex characters to remove the '04' or '03' length byte
            const header = cleanResponse.substring(0, landmarkIndex - 1);
            // 2. Everything FROM the landmark forward is your Data
            const payload = cleanResponse.substring(landmarkIndex);
            console.log(`📡 Header: ${header} | Data: ${payload}`);
        // }
        //const result = masterParse(cleanResponse, currentPIDInfo.formula);
        //console.log('RPMs: ', result); 
        // Safety check: ensure we know what we just asked for
        if (getCurrentMode() === MODES.STREAMING_PIDS && header === get_header("ecm")) {
            // Fast math for RPM, Speed, etc.
            //const result = masterParse(cleanResponse, currentPIDInfo.formula);
            //console.log('RPMs: ', result); 
            //updatePidValue() 
            const pidId = "01" + payload.substring(3, 5); // e.g., "010C"
            const loadedPid = pidMap.get(pidInfo);
            const result = masterParse(payload, loadedPid.formula);
            if (!Number.isNaN(result)){
                console.log('RPMs: ', result, ', pidId: ', pidId); 
                updatePidValue(pidId, result);
            }
        } 

        else if (getCurrentMode() === MODES.GET_ECM_HEADER) {
            console.log("ECM header mode is working...");
            console.log("Scanner mode = ", getCurrentMode());
            // Need to add rpm check to above if statement for github version, 
            // so other pids cant set ecm header
            register_header("ecm", header);
            console.log("ECM header registered as: ", get_header("ecm"));
            if(get_header("ecm") && !(header === ">")){
                console.log("Get ecm header complete, switching to streaming mode...");
                setScannerMode(MODES.STREAMING_PIDS);
            }
            // Buffer and decode fault codes (e.g., 43 01 03 00 -> P0103)
            // processDTCBuffer(hex);
        }

        else if (MODES.READING_DTC) {
            // Buffer and decode fault codes (e.g., 43 01 03 00 -> P0103)
            // processDTCBuffer(hex);
        }
    });
}

export async function ping_RPM_for_header(){
    console.log("Running ping rpm function...");
    while(!(get_header("ecm"))){
        console.log("========================================");
        console.log("ECM Header = ", get_header("ecm"));
        console.log("Sending command 010C...");
        console.log("Gloabl listener mode = ", getCurrentMode());
        console.log("========================================");
        await sendCommand("010C");
    }
    //return ECMHeader;
}