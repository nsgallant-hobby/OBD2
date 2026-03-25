// This is the single source of truth for your PIDs
export const pidMap = new Map();

export function updateStore(newPids) {
    pidMap.clear();
    newPids.forEach((value, key) => {
        pidMap.set(key, value);
    });
    console.log("Store: PID Map updated with", pidMap.size, "items.");
}