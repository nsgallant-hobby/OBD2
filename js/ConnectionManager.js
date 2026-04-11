import { globalListener } from './CommunicationManager.js';

const ELM327_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';
const nameDisplay = document.getElementById('device-name');
const statusDisplay = document.getElementById('connection-status');

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
    onConnect(device);

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
    onDisconnect();
  }
}

export async function getPipeline() {
    if (!characteristic || !characteristic.service.device.gatt.connected) {
        console.warn("Attempted to access pipeline before connection!");
        return null;
    }
    return characteristic;
}

async function onConnect(device) {
    // 1. Update the Name
    // Some dongles don't broadcast a name, so we provide a fallback
    nameDisplay.innerText = device.name || "Generic OBD Device";

    // 2. Update the Status UI
    statusDisplay.innerText = "● Connected";
    statusDisplay.style.color = "#00ff00"; // Green

    // 3. Listen for unexpected disconnects (e.g., walking away from the car)
    device.addEventListener('gattserverdisconnected', onDisconnect);
}

function onDisconnect() {
    // Reset the UI when the connection drops
    nameDisplay.innerText = "Not Connected";
    statusDisplay.innerText = "● Disconnected";
    statusDisplay.style.color = "red";
    
    // Clear any active PID expectations in the manager
}


