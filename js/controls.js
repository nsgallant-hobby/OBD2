import { loadPidLibrary } from './LoadLibrary.js';
import { connectBluetooth, sendCommand } from './ConnectionManager.js';
import { renderPidList } from './RenderPids.js';
import { pidMap } from './PidMapStore.js';

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    
    // Attach the logic to the button ID
    document.getElementById('connectbutton').addEventListener('click', async () => {
        console.log("Connect clicked!");
        await connectBluetooth();
    });

    document.getElementById('LoadPidList').addEventListener('click', async () => {
        await loadPidLibrary();
        renderPidList();
        startSmartStreaming();
    });
});

let schedulerInterval = null;

export function startSmartStreaming() {
    
    if (schedulerInterval) clearInterval(schedulerInterval);

    // We run the 'manager' very fast (e.g., every 10ms) 
    // to check if any PIDs are "due" for an update
    schedulerInterval = setInterval(async () => {
        const now = Date.now();

        for (const [id, pid] of pidMap) {
            // Calculate how long it's been since this specific PID was updated
            const timeSinceLastUpdate = now - (pid.lastRequested || 0);

            // If enough time has passed based on its custom refreshRate
            if (timeSinceLastUpdate >= (pid.refreshRate || 500)) {
                
                // 1. Mark the time we sent the request
                pid.lastRequested = now;

                // 2. Send the command
                await sendCommand(id);

                // 3. Tiny breather so commands don't collide on the wire
                await new Promise(r => setTimeout(r, 20));
            }
        }
    }, 10); 
}

export function stopSmartStreaming() {
    clearInterval(liveInterval);
    liveInterval = null;
    console.log("Stream stopped.");
}

