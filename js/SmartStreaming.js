import { waitUntil, unblock_sendcommand, toggle_send_command_blocker, get_scb_value } from './Promise.js';
import { sendCommand } from './CommunicationManager.js';
import { pidMap } from './PidMapStore.js';
import { scanner } from './RenderPids.js';

let schedulerInterval = null;

export async function startSmartStreaming() {
    
    if (schedulerInterval) clearInterval(schedulerInterval);

    // We run the 'manager' very fast (e.g., every 10ms) 
    // to check if any PIDs are "due" for an update
    schedulerInterval = setInterval(async () => {
        const now = Date.now();
        
        for (const hex of scanner.activeQueue) {
            const pid = pidMap.get(hex);
            
            console.log(`Would send pid - ${pid.service}${pid.id}`);
            //console.log("For loop is running...")
            await waitUntil(() => unblock_sendcommand);
            //console.log("unblock send command is:", unblock_sendcommand);
            // Calculate how long it's been since this specific PID was updated
            const timeSinceLastUpdate = now - (pid.lastRequested || 0);

            // If enough time has passed based on its custom refreshRate
            if (timeSinceLastUpdate >= (pid.refreshRate || 500)) {
                // 1. Mark the time we sent the request
                pid.lastRequested = now;
                //await new Promise(r => setTimeout(r, 50));
                // 2. Send the command
                try {
                if(get_scb_value()) toggle_send_command_blocker();//if true, switch unblocker to false
                //console.log("unblock send command should be false, but is:", unblock_sendcommand);
                //console.log("Sending command ", id);
                await sendCommand(id);
               
                } catch(error) {
                    console.log("Error caught", error);
                    if (error.message.includes("GATT")) {
                    // Just move to the next PID in the loop; 
                    // this one will try again on the next cycle.
                    continue; 
                    }
                }
            }
        }
    }, 10); 
}

export function stopSmartStreaming() {
    clearInterval(liveInterval);
    liveInterval = null;
    console.log("Stream stopped.");
}
