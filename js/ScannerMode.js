import { sendCommand } from './connection.js';

export const MODES = {
    IDLE: 'IDLE',
    STREAMING_PIDS: 'STREAMING',
    READING_VIN: 'VIN',
    READING_DTC: 'DTC'
};

let currentMode = MODES.IDLE;

export function setScannerMode(newMode) {
    console.log(`Switching mode to: ${newMode}`);
    currentMode = newMode;
    
    // Logic to handle the switch
    if (newMode === MODES.READING_VIN) {
        sendCommand("0902"); // OBD-II command for VIN
    } else if (newMode === MODES.READING_DTC) {
        sendCommand("03");   // OBD-II command for stored codes
    }
}

export function getCurrentMode() {
    return currentMode;
}