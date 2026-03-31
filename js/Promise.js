export let unblock_sendcommand = false;

export const waitUntil = async (conditionCheck, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const timeWas = new Date();
    const interval = setInterval(() => {
      if (conditionCheck()) {
        clearInterval(interval);
        resolve();
      } else if (new Date() - timeWas > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Timeout waiting for condition"));
      }
    }, 50); // Check every 50 milliseconds
  });
};

export function toggle_send_command_blocker() {
  unblock_sendcommand = !unblock_sendcommand;
}

export function get_scb_value(){
  return unblock_sendcommand;
}