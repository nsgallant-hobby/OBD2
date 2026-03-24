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

export function getPipeline() {
    if (!characteristic) {
        console.warn("Attempted to access pipeline before connection!");
        return null;
    }
    return characteristic;
}

// sendCommand is a send-instructions-to-the-obd function.
// Remember we already have a obd listener(myChar) set up in bluetooth connection function
export async function sendCommand(command) {
    const pipe = getPipeline();
    const encoder = new TextEncoder();
    // Commands must end with \r for the ELM327 to process them
    const data = encoder.encode(command + '\r');
    await pipe.writeValue(data);
}