import { loadPidLibrary } from './LoadLibrary.js';
import { connectBluetooth } from './ConnectionManager.js';
import { sendCommand } from './CommunicationManager.js';
import { renderPidList } from './RenderPids.js';
import { scanner } from './RenderPids.js';
import { toggle_send_command_blocker, get_scb_value } from './Promise.js';
import { startSmartStreaming, stopSmartStreaming } from './SmartStreaming.js';

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    
    // Attach the logic to the button ID
    document.getElementById('connectbutton').addEventListener('click', async () => {
        console.log("Connect clicked!");
        await connectBluetooth();
        console.log('Bluetooth connected...');
        await sendCommand("ATE0"); // turns on command echos, 
        // in streaming mode, will want command echo sent to global listener
        
        await sendCommand("ATH1"); // Turns on headers
    });

    document.getElementById('LoadPidList').addEventListener('click', async () => {
        await loadPidLibrary(); 
        renderPidList();
        //console.log(scanner.activeQueue);
        //console.log("unblock send command is:", unblock_sendcommand);
        if(!get_scb_value()) toggle_send_command_blocker(); //if false, switch unblock to true
       // console.log("==============================================");
       // console.log("unblock send command is:", unblock_sendcommand);
       // console.log("Scanner mode = ", getCurrentMode());
       // console.log("ECM Header = ", get_header("ecm"));
       // console.log("==============================================");
       await sendCommand("010C");
        //startSmartStreaming();
    });
});


