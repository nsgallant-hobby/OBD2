import { pidMap } from './PidMapStore.js';

export const scanner = {
    activeQueue: new Set(), // The PIDs currently on screen
};

export function renderPidList() {
    const displayArea = document.getElementById('pid-list-container');
    let htmlContent = "";
    
    pidMap.forEach((dataLine, id) => {
        htmlContent += `
            <div class="pid-box" data-pid="${id}" style="border: 1px solid #444; margin: 5px; padding: 10px;">
                <strong style="color: #ff8c00;">${dataLine.name}</strong><br>
                <span style="font-size: 1.5em;" id="val-${id}">--</span> ${dataLine.unit}
            </div>
            <hr>
        `;
    });
    displayArea.innerHTML = htmlContent;

    setupVisibilityTracker();
}

export function updatePidValue(pidId, newValue) {
    console.log("updatePidValue is attempting to run...");
    // This finds the <span id="val-010C"> we created during render
    const element = document.getElementById(`val-${pidId}`);
    if (element) {
        element.innerText = newValue;
        
        // Visual flair: Flash green on update
        element.style.color = "#00ff00";
        setTimeout(() => { element.style.color = "black"; }, 100);
    }
    console.log("Update PID success!");
}

function setupVisibilityTracker() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const pid = entry.target.dataset.pid;
            //console.log(pid)
            if (entry.isIntersecting) {
                // Tell the Smart Streamer to start caring about this PID
                scanner.activeQueue.add(pid);
                entry.target.classList.add('is-visible'); 
                console.log(scanner.activeQueue);
            } else {
                // Tell the Smart Streamer to ignore this PID
                scanner.activeQueue.delete(pid);
                entry.target.classList.remove('is-visible');
                console.log(scanner.activeQueue);
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the card is on screen

    // Tell the guard to watch every gauge card we just rendered
    document.querySelectorAll('.pid-box').forEach(card => observer.observe(card));
}