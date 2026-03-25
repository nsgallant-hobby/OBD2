import { updateStore } from './PidMapStore.js';

let pidMap = new Map()

export async function loadPidLibrary() {
    // Replace this URL with your actual GitHub Pages URL later
    //const url = 'https://raw.githubusercontent.com/username/repo/main/pids/generic.json';

    try {
        const response = await fetch('./pids/globalpids.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Convert the Array to a Map for O(1) lookup speed
        // This lets you find a PID instantly using: pidMap.get("010C")
        pidMap = new Map(data.map(obj => [obj.id, obj]));
        updateStore(pidMap);

        console.log("OBD-II Library Loaded:", pidMap.size, "PIDs ready.");
        //return pidMap;
        // Trigger your UI render once data is in
        //renderPidList();

    } catch (error) {
        console.error("Failed to load PID library:", error);
    }
}


