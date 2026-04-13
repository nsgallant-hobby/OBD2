// =============================================================================================
// Communication Manager
// =====================
// This module handles obd dongle-to-vehicle communication with sendCommand, and obd vehicle-to-
// dongle listening with globalListener.
// - getPipeline holds the active bluetooth communication pipeline with the obd device
// =============================================================================================

import { getPipeline } from "./ConnectionManager.js";
import { pidMap } from "./PidMapStore.js";
import { getCurrentMode } from "./ScannerMode.js";
import { masterParse } from "./MasterParser.js";
import { updatePidValue } from "./RenderPids.js";
import { toggle_send_command_blocker } from "./Promise.js";

export async function sendCommand(command) {
    const pipe = await getPipeline();
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
        // check for end of data ">" before deleting
        // orignally line looked like this
        // ...textResponse.replace(/>|\r/g, '')...
        
        let cleanResponse = textResponse.replace(/|\r/g, '').trim();
        if(cleanResponse.includes(">")) toggle_send_command_blocker();
        console.log("Clean response = ", cleanResponse);
         
        const fourtyOneIndex = cleanResponse.indexOf("41");
        console.log("Instance of 41 at position: ", fourtyOneIndex);

        const count = cleanResponse.split("41");//.length - 1;
        const isRepeated = count > 2;
        console.log("count = ", count, ", isRepeated = ", isRepeated);
        //const landmark = "41 " + pidInfo.slice(-2);
        //console.log("landmark = ", landmark);
        //const landmarkIndex = cleanResponse.indexOf(landmark);
        //console.log("landmarkIndex = ", landmarkIndex);
        
        //const count = cleanResponse.split(landmark).length - 1;
        //const isRepeated = count > 1; 
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
        if (getCurrentMode() === MODES.STREAMING_PIDS) {
            // Fast math for RPM, Speed, etc.
            //const result = masterParse(cleanResponse, currentPIDInfo.formula);
            //console.log('RPMs: ', result); 
            //updatePidValue() 
            const pidId = payload.substring(3, 5); // e.g., "010C"
            const loadedPid = pidMap.get(pidId);
            const result = loadedPid.calc(...bytes);
            //const result = masterParse(payload, loadedPid.formula);
            console.log("Master parse result: payload = ", payload, ", masterparse result = ", result);
            if (!Number.isNaN(result)){
                console.log('Value: ', result, ', pidId: ', pidId); 
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
