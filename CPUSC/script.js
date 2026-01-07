/* ========================================
   CPU Scheduling Algorithm Simulator v2.2
   ======================================== */

// Global Variables
let processes = [];
let processCounter = 1;
let simulationResults = null;
let isSimulationRunning = false;
let isPaused = false;
let currentTimeUnit = 0;
let simulationInterval = null;
let ganttChart = [];
let currentVisualBlock = null;

// Process Colors
const processColors = [
    '#00f3ff', // Cyan
    '#bc13fe', // Purple
    '#0aff0a', // Green
    '#ff003c', // Red
    '#ff9e00', // Orange
    '#ffe600', // Yellow
    '#ff0099', // Pink
    '#00ccff'  // Light Blue
];

// ========================================
// DOM Elements
// ========================================
const processIdInput = document.getElementById('processId');
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const priorityInput = document.getElementById('priority');
const addProcessBtn = document.getElementById('addProcessBtn');
const loadDefaultBtn = document.getElementById('loadDefaultBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const processTableBody = document.getElementById('processTableBody');
const algorithmSelect = document.getElementById('algorithmSelect');
const timeQuantumInput = document.getElementById('timeQuantum');
const quantumRow = document.getElementById('quantumRow');
const runSimulationBtn = document.getElementById('runSimulationBtn');
const executionControls = document.getElementById('executionControls');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');
const currentTimeDisplay = document.getElementById('currentTime');
const ganttChartDiv = document.getElementById('ganttChart');
const readyQueueDiv = document.getElementById('readyQueueVisual');
const avgWTDisplay = document.getElementById('avgWT');
const avgTATDisplay = document.getElementById('avgTAT');

// CPU Elements
const cpuChip = document.getElementById('cpuChip');
const cpuProcessDisplay = document.getElementById('cpuProcessDisplay');
const cpuLoadBar = document.getElementById('cpuLoadBar');

// ========================================
// Initial Setup
// ========================================

if (addProcessBtn) addProcessBtn.addEventListener('click', addProcess);
if (loadDefaultBtn) loadDefaultBtn.addEventListener('click', loadSampleProcesses);
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllProcesses);
if (runSimulationBtn) runSimulationBtn.addEventListener('click', runSimulation);
if (startBtn) startBtn.addEventListener('click', startExecution);
if (pauseBtn) pauseBtn.addEventListener('click', pauseExecution);
if (stepBtn) stepBtn.addEventListener('click', stepExecution);
if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

if (algorithmSelect) {
    algorithmSelect.addEventListener('change', function () {
        if (this.value === 'rr') {
            quantumRow.style.display = 'block';
        } else {
            quantumRow.style.display = 'none';
        }
    });
}

// Clear Initial State
processes = [];
processCounter = 1;
if (processIdInput) { processIdInput.value = ''; processIdInput.placeholder = 'P1'; }
if (arrivalTimeInput) { arrivalTimeInput.value = ''; arrivalTimeInput.placeholder = '0'; }
if (burstTimeInput) { burstTimeInput.value = ''; burstTimeInput.placeholder = '5'; }
updateProcessTable();
resetSimulation();


// ========================================
// Process Management
// ========================================

function addProcess() {
    let pid = processIdInput.value.trim();
    if (!pid) pid = processIdInput.placeholder;

    let at = arrivalTimeInput.value;
    if (at === '') at = 0; else at = parseInt(at);

    let bt = burstTimeInput.value;
    if (bt === '') bt = 5; else bt = parseInt(bt);

    let prio = priorityInput.value;
    if (prio === '') prio = 1; else prio = parseInt(prio);

    if (isNaN(at) || isNaN(bt) || isNaN(prio)) return;
    if (processes.find(p => p.pid === pid)) { alert("Duplicate PID"); return; }

    const process = {
        pid, arrivalTime: at, burstTime: bt, priority: prio,
        initialBurst: bt,
        remainingTime: bt,
        status: 'WAITING',
        colorIndex: (processes.length) % processColors.length
    };

    processes.push(process);
    updateProcessTable();

    // Reset Inputs
    if (pid.startsWith('P')) {
        let num = parseInt(pid.substring(1));
        if (!isNaN(num)) processCounter = num + 1;
    } else processCounter++;

    processIdInput.value = '';
    processIdInput.placeholder = `P${processCounter}`;
}

function loadSampleProcesses() {
    processes = [
        { pid: 'P1', arrivalTime: 0, burstTime: 8, initialBurst: 8, remainingTime: 8, priority: 2, status: 'WAITING', colorIndex: 0 },
        { pid: 'P2', arrivalTime: 1, burstTime: 4, initialBurst: 4, remainingTime: 4, priority: 1, status: 'WAITING', colorIndex: 1 },
        { pid: 'P3', arrivalTime: 2, burstTime: 9, initialBurst: 9, remainingTime: 9, priority: 3, status: 'WAITING', colorIndex: 2 }
    ];
    processCounter = 4;
    processIdInput.placeholder = 'P4';
    updateProcessTable();
}

function clearAllProcesses() {
    processes = [];
    processCounter = 1;
    processIdInput.placeholder = 'P1';
    processIdInput.value = '';
    updateProcessTable();
    resetSimulation();
}

function updateProcessTable() {
    if (!processTableBody) return;
    processTableBody.innerHTML = '';

    if (processes.length === 0) {
        processTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#555;">NO DATA</td></tr>';
        return;
    }

    processes.forEach(p => {
        const tr = document.createElement('tr');
        let statusColor = '#777';
        if (p.status === 'RUNNING') statusColor = '#0aff0a';
        if (p.status === 'READY') statusColor = '#00f3ff';
        if (p.status === 'DONE') statusColor = '#555';

        tr.innerHTML = `
            <td style="color:${processColors[p.colorIndex]}">${p.pid}</td>
            <td>${p.arrivalTime}</td>
            <td>${p.initialBurst}</td>
            <td>${p.priority}</td>
            <td style="color:#ff9e00; font-weight:bold;">${p.remainingTime}</td>
            <td style="color:${statusColor}">${p.status}</td>
        `;
        processTableBody.appendChild(tr);
    });
}


// ========================================
// Logic Engine
// ========================================

function runSimulation() {
    if (processes.length === 0) return;
    resetSimulation();

    processes.forEach(p => {
        p.remainingTime = p.initialBurst;
        p.status = 'WAITING';
    });
    updateProcessTable();

    const inputProc = JSON.parse(JSON.stringify(processes.map(p => ({ ...p, burstTime: p.initialBurst }))));
    const algo = algorithmSelect.value;
    const quantum = parseInt(timeQuantumInput.value);

    if (algo === 'fcfs') simulationResults = scheduleFCFS(inputProc);
    else if (algo === 'sjf') simulationResults = scheduleSJF(inputProc);
    else if (algo === 'srtf') simulationResults = scheduleSRTF(inputProc);
    else if (algo === 'priority') simulationResults = schedulePriority(inputProc);
    else if (algo === 'rr') simulationResults = scheduleRoundRobin(inputProc, quantum);

    ganttChart = simulationResults.gantt;
    // Do NOT render yet. Render happens dynamically in startExecution.

    updateStatsUI(simulationResults.results);
    executionControls.style.display = 'flex';
    cpuProcessDisplay.innerText = "READY";
}

// Scheduling Functions (Same logic as before)
function scheduleFCFS(proc) {
    let time = 0; let queue = [...proc].sort((a, b) => a.arrivalTime - b.arrivalTime); let gantt = []; let done = [];
    queue.forEach(p => {
        if (time < p.arrivalTime) { gantt.push({ pid: 'IDLE', start: time, end: p.arrivalTime }); time = p.arrivalTime; }
        gantt.push({ pid: p.pid, start: time, end: time + p.burstTime });
        p.completionTime = time + p.burstTime; p.turnaroundTime = p.completionTime - p.arrivalTime; p.waitingTime = p.turnaroundTime - p.burstTime; done.push(p); time += p.burstTime;
    }); return { results: done, gantt };
}
function scheduleSJF(procs) {
    let p = procs.map(x => ({ ...x, done: false })); let time = 0; let completed = 0; let gantt = [];
    while (completed < p.length) {
        let avail = p.filter(x => x.arrivalTime <= time && !x.done);
        if (avail.length === 0) { let next = Math.min(...p.filter(x => !x.done).map(x => x.arrivalTime)); gantt.push({ pid: 'IDLE', start: time, end: next }); time = next; continue; }
        let best = avail.reduce((min, cur) => cur.burstTime < min.burstTime ? cur : min);
        gantt.push({ pid: best.pid, start: time, end: time + best.burstTime }); time += best.burstTime; best.completionTime = time; best.done = true; completed++;
    } p.forEach(x => { x.turnaroundTime = x.completionTime - x.arrivalTime; x.waitingTime = x.turnaroundTime - x.burstTime; }); return { results: p, gantt };
}
function scheduleSRTF(procs) {
    let p = procs.map(x => ({ ...x, rem: x.burstTime })); let time = 0; let completed = 0; let gantt = [];
    while (completed < p.length) {
        let avail = p.filter(x => x.arrivalTime <= time && x.rem > 0);
        if (avail.length === 0) { let next = Math.min(...p.filter(x => x.rem > 0).map(x => x.arrivalTime)); if (next > time) { gantt.push({ pid: 'IDLE', start: time, end: next }); time = next; } continue; }
        let best = avail.reduce((min, cur) => cur.rem < min.rem ? cur : min);
        if (gantt.length > 0 && gantt[gantt.length - 1].pid === best.pid && gantt[gantt.length - 1].end === time) { gantt[gantt.length - 1].end++; } else { gantt.push({ pid: best.pid, start: time, end: time + 1 }); }
        best.rem--; time++; if (best.rem === 0) { best.completionTime = time; completed++; }
    } p.forEach(x => { x.turnaroundTime = x.completionTime - x.arrivalTime; x.waitingTime = x.turnaroundTime - x.burstTime; }); return { results: p, gantt };
}
function schedulePriority(procs) {
    let p = procs.map(x => ({ ...x, done: false })); let time = 0; let completed = 0; let gantt = [];
    while (completed < p.length) {
        let avail = p.filter(x => x.arrivalTime <= time && !x.done);
        if (avail.length === 0) { let next = Math.min(...p.filter(x => !x.done).map(x => x.arrivalTime)); gantt.push({ pid: 'IDLE', start: time, end: next }); time = next; continue; }
        let best = avail.reduce((min, cur) => cur.priority < min.priority ? cur : min);
        gantt.push({ pid: best.pid, start: time, end: time + best.burstTime }); time += best.burstTime; best.completionTime = time; best.done = true; completed++;
    } p.forEach(x => { x.turnaroundTime = x.completionTime - x.arrivalTime; x.waitingTime = x.turnaroundTime - x.burstTime; }); return { results: p, gantt };
}
function scheduleRoundRobin(procs, quantum) {
    let p = procs.map(x => ({ ...x, rem: x.burstTime })); let time = 0; let queue = []; let gantt = []; let completed = 0; let pIdx = 0;
    let sorted = [...p].sort((a, b) => a.arrivalTime - b.arrivalTime);
    while (pIdx < sorted.length && sorted[pIdx].arrivalTime <= time) { queue.push(sorted[pIdx]); pIdx++; }
    while (completed < p.length) {
        if (queue.length === 0) { if (pIdx < sorted.length) { let next = sorted[pIdx].arrivalTime; gantt.push({ pid: 'IDLE', start: time, end: next }); time = next; while (pIdx < sorted.length && sorted[pIdx].arrivalTime <= time) { queue.push(sorted[pIdx]); pIdx++; } } continue; }
        let curr = queue.shift(); let run = Math.min(quantum, curr.rem); gantt.push({ pid: curr.pid, start: time, end: time + run }); time += run; curr.rem -= run;
        while (pIdx < sorted.length && sorted[pIdx].arrivalTime <= time) { queue.push(sorted[pIdx]); pIdx++; }
        if (curr.rem > 0) queue.push(curr); else { curr.completionTime = time; completed++; }
    } p.forEach(x => { x.turnaroundTime = x.completionTime - x.arrivalTime; x.waitingTime = x.turnaroundTime - x.burstTime; }); return { results: p, gantt };
}


// ========================================
// Dynamic Playback Engine (Auto-Scaling)
// ========================================

function startExecution() {
    if (!simulationResults) return;
    if (isSimulationRunning) return;

    isSimulationRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    cpuChip.classList.add('active');

    simulationInterval = setInterval(() => {
        if (isPaused) return;

        let maxTime = ganttChart[ganttChart.length - 1].end;
        if (currentTimeUnit >= maxTime) {
            finishSimulation();
            return;
        }

        // 1. Advance Timer
        currentTimeUnit++;
        updateTimeUI();

        // 2. Identify Block
        let currentBlock = ganttChart.find(b => currentTimeUnit > b.start && currentTimeUnit <= b.end);
        let pid = currentBlock ? currentBlock.pid : 'IDLE';

        // 3. Updates
        updateCPUVisuals(pid);
        updateProcessStateAndTable(pid);

        // 4. Gantt Auto-Scaling Update
        renderGanttScaled();

    }, 1000);
}

function renderGanttScaled() {
    // We completely redraw and compress (scale) the gantt chart into the visible track
    const containerWidth = ganttChartDiv.clientWidth - 20;
    let maxT = Math.max(10, currentTimeUnit);

    let baseScale = 60; // 1s = 60px
    let requiredWidth = maxT * baseScale;
    let currentScale = baseScale;

    // Auto-Compress if needed
    if (requiredWidth > containerWidth) {
        currentScale = containerWidth / maxT;
    }

    // Filter active events
    let activeBlocks = ganttChart.filter(b => b.start < currentTimeUnit);

    ganttChartDiv.innerHTML = '';

    activeBlocks.forEach(b => {
        let div = document.createElement('div');
        div.className = 'gantt-block';

        let effectiveEnd = Math.min(b.end, currentTimeUnit);
        let duration = effectiveEnd - b.start;
        let widthPx = duration * currentScale;

        let p = processes.find(x => x.pid === b.pid);
        let color = p ? processColors[p.colorIndex] : '#333';

        if (b.pid === 'IDLE') {
            div.style.background = 'repeating-linear-gradient(45deg, #111, #111 10px, #222 10px, #222 20px)';
        } else {
            div.style.background = `linear-gradient(to bottom, #111, ${color} 150%)`;
            div.style.borderTop = `3px solid ${color}`;
            if (widthPx > 30) {
                div.innerText = b.pid;
            }
        }

        div.style.width = `${widthPx}px`;
        div.style.flex = 'none';

        ganttChartDiv.appendChild(div);
    });
}

function pauseExecution() {
    isSimulationRunning = false;
    isPaused = true;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    cpuChip.classList.remove('active');
}

function stepExecution() {
    if (!isSimulationRunning) {
        let maxTime = ganttChart[ganttChart.length - 1].end;
        if (currentTimeUnit >= maxTime) return;

        currentTimeUnit++;

        let currentBlock = ganttChart.find(b => currentTimeUnit > b.start && currentTimeUnit <= b.end);
        let pid = currentBlock ? currentBlock.pid : 'IDLE';

        updateTimeUI();
        updateCPUVisuals(pid);
        updateProcessStateAndTable(pid);
        renderGanttScaled();
    }
}

function finishSimulation() {
    pauseExecution();
    cpuChip.classList.remove('active');
    cpuProcessDisplay.innerText = "DONE";
    cpuProcessDisplay.style.color = "#888";
    cpuLoadBar.style.width = "0%";

    processes.forEach(p => {
        p.remainingTime = 0;
        p.status = 'DONE';
    });
    updateProcessTable();
}

function updateProcessStateAndTable(runningPid) {
    let readyQueue = [];

    processes.forEach(p => {
        if (p.arrivalTime > currentTimeUnit) {
            p.status = 'WAITING';
            return;
        }

        if (p.pid === runningPid) {
            p.status = 'RUNNING';
            if (p.remainingTime > 0) p.remainingTime--;
        }
        else if (p.remainingTime === 0) {
            p.status = 'DONE';
        }
        else {
            p.status = 'READY';
            readyQueue.push(p);
        }
    });

    updateProcessTable();
    updateReadyQueueVisuals(readyQueue);
}


function updateReadyQueueVisuals(queue) {
    readyQueueDiv.innerHTML = '';
    if (queue.length === 0) {
        readyQueueDiv.innerHTML = '<div class="empty-msg">BUFFER EMPTY</div>';
        return;
    }
    queue.forEach(p => {
        let div = document.createElement('div');
        div.className = 'queue-item';
        div.innerText = p.pid;
        div.style.borderColor = processColors[p.colorIndex];
        div.style.boxShadow = `0 0 10px ${processColors[p.colorIndex]}`;
        readyQueueDiv.appendChild(div);
    });
}

function updateTimeUI() { currentTimeDisplay.innerText = currentTimeUnit; }

function updateCPUVisuals(pid) {
    if (pid === 'IDLE') {
        cpuProcessDisplay.innerText = "IDLE";
        cpuProcessDisplay.style.color = "#555";
        cpuChip.classList.remove('active');
        cpuLoadBar.style.width = "0%";
    } else {
        let p = processes.find(x => x.pid === pid);
        let color = p ? processColors[p.colorIndex] : '#fff';
        cpuProcessDisplay.innerText = pid;
        cpuProcessDisplay.style.color = color;
        cpuProcessDisplay.style.textShadow = `0 0 20px ${color}`;
        cpuChip.classList.add('active');
        cpuChip.style.borderColor = color;
        cpuChip.style.boxShadow = `0 0 30px ${color}, inset 0 0 20px rgba(0,0,0,0.5)`;
        cpuLoadBar.style.backgroundColor = color;
        cpuLoadBar.style.width = "100%";
    }
}

function updateStatsUI(results) {
    let totalWT = 0, totalTAT = 0;
    results.forEach(r => { totalWT += r.waitingTime; totalTAT += r.turnaroundTime; });
    avgWTDisplay.innerText = (totalWT / results.length).toFixed(2);
    avgTATDisplay.innerText = (totalTAT / results.length).toFixed(2);
}

function resetSimulation() {
    clearInterval(simulationInterval);
    isSimulationRunning = false;
    isPaused = false;
    currentTimeUnit = 0;
    currentVisualBlock = null;

    cpuChip.classList.remove('active');
    cpuProcessDisplay.innerText = "IDLE";
    cpuProcessDisplay.style.color = "#333";
    cpuLoadBar.style.width = "0%";

    ganttChartDiv.innerHTML = '<div class="empty-msg">AWAITING SEQUENCE...</div>';
    readyQueueDiv.innerHTML = '<div class="empty-msg">BUFFER EMPTY</div>';
    updateTimeUI();
    executionControls.style.display = 'none';

    processes.forEach(p => {
        if (p.initialBurst) p.remainingTime = p.initialBurst;
        p.status = 'WAITING';
    });
    updateProcessTable();
}
