// ========================================
// Thread Scheduling Visualizer
// Pthreads Demo
// ========================================

// Thread States
const ThreadState = {
    NEW: 'new',
    READY: 'ready',
    RUNNING: 'running',
    BLOCKED: 'blocked',
    TERMINATED: 'terminated'
};

// Global State
let threads = [];
let readyQueue = [];
let blockedQueue = [];
let currentThread = null;
let timeline = [];
let currentTime = 0;
let threadIdCounter = 1;
let isRunning = false;
let isPaused = false;
let simulationInterval = null;
let schedulingAlgorithm = 'fifo';
let timeQuantum = 3;
let quantumCounter = 0;

// Thread Colors
const threadColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    'linear-gradient(135deg, #ee5a6f 0%, #f29263 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
];

// ========================================
// DOM Elements
// ========================================
const threadNameInput = document.getElementById('threadName');
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const priorityInput = document.getElementById('priority');
const addThreadBtn = document.getElementById('addThreadBtn');
const clearThreadsBtn = document.getElementById('clearThreadsBtn');
const threadTableBody = document.getElementById('threadTableBody');

const schedulingAlgorithmSelect = document.getElementById('schedulingAlgorithm');
const timeQuantumInput = document.getElementById('timeQuantum');
const quantumGroup = document.getElementById('quantumGroup');
const simulationSpeedSelect = document.getElementById('simulationSpeed');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');

const currentTimeDisplay = document.getElementById('currentTime');
const cpuSlot = document.getElementById('cpuSlot');
const timelineCanvas = document.getElementById('timelineCanvas');
const progressContainer = document.getElementById('progressContainer');

const readyQueueContainer = document.getElementById('readyQueue');
const blockedQueueContainer = document.getElementById('blockedQueue');

const blockThreadBtn = document.getElementById('blockThreadBtn');
const wakeThreadBtn = document.getElementById('wakeThreadBtn');
const terminateThreadBtn = document.getElementById('terminateThreadBtn');

const eventLog = document.getElementById('eventLog');

// ========================================
// Event Listeners
// ========================================
addThreadBtn.addEventListener('click', addThread);
clearThreadsBtn.addEventListener('click', clearAllThreads);

schedulingAlgorithmSelect.addEventListener('change', handleAlgorithmChange);
timeQuantumInput.addEventListener('change', () => {
    timeQuantum = parseInt(timeQuantumInput.value);
});

startBtn.addEventListener('click', startSimulation);
pauseBtn.addEventListener('click', pauseSimulation);
stepBtn.addEventListener('click', stepSimulation);
resetBtn.addEventListener('click', resetSimulation);

blockThreadBtn.addEventListener('click', blockRunningThread);
wakeThreadBtn.addEventListener('click', wakeBlockedThread);
terminateThreadBtn.addEventListener('click', terminateRunningThread);

// ========================================
// Thread Management
// ========================================
function addThread() {
    const name = threadNameInput.value.trim() || `T${threadIdCounter}`;
    const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
    const burstTime = parseInt(burstTimeInput.value) || 5;
    const priority = parseInt(priorityInput.value) || 5;

    // Validation
    if (threads.find(t => t.name === name)) {
        alert('Thread name already exists!');
        return;
    }

    if (burstTime < 1) {
        alert('Burst time must be at least 1');
        return;
    }

    const thread = {
        id: threadIdCounter++,
        name: name,
        arrivalTime: arrivalTime,
        burstTime: burstTime,
        remainingTime: burstTime,
        priority: priority,
        state: ThreadState.NEW,
        startTime: -1,
        completionTime: -1,
        colorIndex: (threadIdCounter - 2) % threadColors.length
    };

    threads.push(thread);
    logEvent(`Thread ${thread.name} created`, 'created');

    updateThreadTable();
    updateProgressBars();

    // Auto-increment thread name
    threadNameInput.value = `T${threadIdCounter}`;
}

function deleteThread(threadId) {
    threads = threads.filter(t => t.id !== threadId);
    updateThreadTable();
    updateProgressBars();
}

function clearAllThreads() {
    if (isRunning) {
        alert('Stop simulation before clearing threads');
        return;
    }

    if (confirm('Clear all threads?')) {
        threads = [];
        threadIdCounter = 1;
        threadNameInput.value = 'T1';
        updateThreadTable();
        updateProgressBars();
        resetSimulation();
        logEvent('All threads cleared', 'initial');
    }
}

function updateThreadTable() {
    threadTableBody.innerHTML = '';

    if (threads.length === 0) {
        threadTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999; padding: 20px;">No threads added yet</td></tr>';
        return;
    }

    threads.forEach(thread => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${thread.name}</td>
            <td>${thread.arrivalTime}</td>
            <td>${thread.burstTime}</td>
            <td>${thread.priority}</td>
            <td><span class="thread-state state-${thread.state}">${thread.state.toUpperCase()}</span></td>
            <td><button class="delete-btn" onclick="deleteThread(${thread.id})" ${isRunning ? 'disabled' : ''}>❌</button></td>
        `;
        threadTableBody.appendChild(row);
    });
}

// ========================================
// Algorithm Selection
// ========================================
function handleAlgorithmChange() {
    schedulingAlgorithm = schedulingAlgorithmSelect.value;

    if (schedulingAlgorithm === 'roundrobin') {
        quantumGroup.style.display = 'flex';
    } else {
        quantumGroup.style.display = 'none';
    }

    logEvent(`Scheduling algorithm changed to ${schedulingAlgorithm.toUpperCase()}`, 'initial');
}

// ========================================
// Simulation Control
// ========================================
function startSimulation() {
    if (threads.length === 0) {
        alert('Add at least one thread before starting simulation');
        return;
    }

    if (isPaused) {
        isPaused = false;
        isRunning = true;
        logEvent('Simulation resumed', 'scheduled');
    } else {
        // Initialize simulation
        isRunning = true;
        currentTime = 0;
        timeline = [];

        // Reset all thread states
        threads.forEach(thread => {
            thread.state = ThreadState.NEW;
            thread.remainingTime = thread.burstTime;
            thread.startTime = -1;
            thread.completionTime = -1;
        });

        readyQueue = [];
        blockedQueue = [];
        currentThread = null;
        quantumCounter = 0;

        logEvent('Simulation started', 'scheduled');
        updateAllDisplays();
    }

    startBtn.disabled = true;
    pauseBtn.disabled = false;

    const speed = parseInt(simulationSpeedSelect.value);
    simulationInterval = setInterval(runTimeUnit, speed);
}

function pauseSimulation() {
    isPaused = true;
    isRunning = false;
    clearInterval(simulationInterval);

    startBtn.disabled = false;
    pauseBtn.disabled = true;

    logEvent('Simulation paused', 'blocked');
}

function stepSimulation() {
    if (!isRunning && !isPaused) {
        // Initialize if not started
        startSimulation();
        pauseSimulation();
    }

    runTimeUnit();
}

function resetSimulation() {
    clearInterval(simulationInterval);
    isRunning = false;
    isPaused = false;
    currentTime = 0;
    timeline = [];
    readyQueue = [];
    blockedQueue = [];
    currentThread = null;
    quantumCounter = 0;

    threads.forEach(thread => {
        thread.state = ThreadState.NEW;
        thread.remainingTime = thread.burstTime;
        thread.startTime = -1;
        thread.completionTime = -1;
    });

    startBtn.disabled = false;
    pauseBtn.disabled = true;

    updateAllDisplays();
    logEvent('Simulation reset', 'initial');
}

// ========================================
// Simulation Logic
// ========================================
function runTimeUnit() {
    // Check for newly arrived threads
    threads.forEach(thread => {
        if (thread.state === ThreadState.NEW && thread.arrivalTime === currentTime) {
            thread.state = ThreadState.READY;
            readyQueue.push(thread);
            logEvent(`Thread ${thread.name} arrived and moved to Ready Queue`, 'created');
        }
    });

    // Schedule thread based on algorithm
    if (currentThread === null) {
        scheduleNextThread();
    } else {
        // Execute current thread
        currentThread.remainingTime--;
        quantumCounter++;

        if (currentThread.startTime === -1) {
            currentThread.startTime = currentTime;
        }

        // Check if thread completed
        if (currentThread.remainingTime === 0) {
            currentThread.state = ThreadState.TERMINATED;
            currentThread.completionTime = currentTime + 1;
            logEvent(`Thread ${currentThread.name} completed execution`, 'completed');

            timeline.push({
                thread: currentThread.name,
                start: currentTime,
                end: currentTime + 1,
                color: threadColors[currentThread.colorIndex]
            });

            currentThread = null;
            quantumCounter = 0;
        }
        // Check for preemption (Round Robin)
        else if (schedulingAlgorithm === 'roundrobin' && quantumCounter >= timeQuantum) {
            logEvent(`Thread ${currentThread.name} quantum expired, moving to Ready Queue`, 'scheduled');

            timeline.push({
                thread: currentThread.name,
                start: currentTime - quantumCounter + 1,
                end: currentTime + 1,
                color: threadColors[currentThread.colorIndex]
            });

            currentThread.state = ThreadState.READY;
            readyQueue.push(currentThread);
            currentThread = null;
            quantumCounter = 0;
        }
    }

    currentTime++;
    updateAllDisplays();

    // Check if simulation is complete
    if (threads.every(t => t.state === ThreadState.TERMINATED) && currentThread === null) {
        pauseSimulation();
        logEvent('=== All threads completed ===', 'completed');
    }
}

function scheduleNextThread() {
    if (readyQueue.length === 0) {
        // Add idle time to timeline
        if (timeline.length === 0 || timeline[timeline.length - 1].thread !== 'IDLE') {
            timeline.push({
                thread: 'IDLE',
                start: currentTime,
                end: currentTime + 1,
                color: '#e9ecef'
            });
        } else {
            timeline[timeline.length - 1].end = currentTime + 1;
        }
        return;
    }

    let selectedThread;

    switch (schedulingAlgorithm) {
        case 'fifo':
            selectedThread = readyQueue.shift();
            break;

        case 'roundrobin':
            selectedThread = readyQueue.shift();
            break;

        case 'priority':
            // Sort by priority (lower number = higher priority)
            readyQueue.sort((a, b) => a.priority - b.priority);
            selectedThread = readyQueue.shift();
            break;
    }

    if (selectedThread) {
        selectedThread.state = ThreadState.RUNNING;
        currentThread = selectedThread;
        quantumCounter = 0;
        logEvent(`Thread ${selectedThread.name} scheduled on CPU`, 'scheduled');
    }
}

// ========================================
// Thread Operations
// ========================================
function blockRunningThread() {
    if (!currentThread) return;

    logEvent(`Thread ${currentThread.name} blocked by user`, 'blocked');

    timeline.push({
        thread: currentThread.name,
        start: currentTime - quantumCounter,
        end: currentTime,
        color: threadColors[currentThread.colorIndex]
    });

    currentThread.state = ThreadState.BLOCKED;
    blockedQueue.push(currentThread);
    currentThread = null;
    quantumCounter = 0;

    updateAllDisplays();
}

function wakeBlockedThread() {
    if (blockedQueue.length === 0) return;

    const thread = blockedQueue.shift();
    thread.state = ThreadState.READY;
    readyQueue.push(thread);

    logEvent(`Thread ${thread.name} woken up and moved to Ready Queue`, 'scheduled');
    updateAllDisplays();
}

function terminateRunningThread() {
    if (!currentThread) return;

    logEvent(`Thread ${currentThread.name} terminated by user`, 'completed');

    timeline.push({
        thread: currentThread.name,
        start: currentTime - quantumCounter,
        end: currentTime,
        color: threadColors[currentThread.colorIndex]
    });

    currentThread.state = ThreadState.TERMINATED;
    currentThread.completionTime = currentTime;
    currentThread = null;
    quantumCounter = 0;

    updateAllDisplays();
}

// ========================================
// Display Updates
// ========================================
function updateAllDisplays() {
    updateThreadTable();
    updateCPUDisplay();
    updateTimelineDisplay();
    updateProgressBars();
    updateQueues();
    updateOperationButtons();
    currentTimeDisplay.textContent = currentTime;
}

function updateCPUDisplay() {
    if (currentThread) {
        cpuSlot.innerHTML = `
            <div class="cpu-thread" style="background: ${threadColors[currentThread.colorIndex]};">
                <div class="cpu-thread-name">${currentThread.name}</div>
                <div class="cpu-thread-info">
                    Remaining: ${currentThread.remainingTime} / ${currentThread.burstTime}
                </div>
            </div>
        `;
        cpuSlot.style.border = '4px solid #38ef7d';
    } else {
        cpuSlot.innerHTML = `
            <div class="cpu-idle">
                <div class="idle-icon">💤</div>
                <div class="idle-text">CPU IDLE</div>
            </div>
        `;
        cpuSlot.style.border = '4px dashed #dee2e6';
    }
}

function updateTimelineDisplay() {
    timelineCanvas.innerHTML = '';

    if (timeline.length === 0) {
        timelineCanvas.innerHTML = '<div style="padding: 30px; text-align: center; color: #999;">Timeline will appear here during simulation</div>';
        return;
    }

    // Show last 15 time units
    const displayTimeline = timeline.slice(-15);

    displayTimeline.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'timeline-block';
        blockDiv.style.background = block.color;
        blockDiv.style.flex = block.end - block.start;

        if (index === displayTimeline.length - 1) {
            blockDiv.classList.add('current');
        }

        blockDiv.innerHTML = `
            <div class="timeline-label">${block.thread}</div>
            <div class="timeline-time">${block.start}-${block.end}</div>
        `;

        timelineCanvas.appendChild(blockDiv);
    });
}

function updateProgressBars() {
    progressContainer.innerHTML = '';

    if (threads.length === 0) {
        progressContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 30px;">No threads to display</div>';
        return;
    }

    threads.forEach(thread => {
        const progress = ((thread.burstTime - thread.remainingTime) / thread.burstTime) * 100;

        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="progress-header">
                <span class="progress-name">${thread.name}</span>
                <span class="progress-stats">${thread.burstTime - thread.remainingTime} / ${thread.burstTime}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progress}%; background: ${threadColors[thread.colorIndex]};">
                    ${progress.toFixed(0)}%
                </div>
            </div>
        `;
        progressContainer.appendChild(progressItem);
    });
}

function updateQueues() {
    // Update Ready Queue
    readyQueueContainer.innerHTML = '';
    if (readyQueue.length === 0) {
        readyQueueContainer.innerHTML = '<div class="queue-empty">Empty</div>';
    } else {
        readyQueue.forEach(thread => {
            const threadDiv = document.createElement('div');
            threadDiv.className = 'queue-thread';
            threadDiv.style.background = threadColors[thread.colorIndex];
            threadDiv.textContent = `${thread.name} (Remaining: ${thread.remainingTime})`;
            readyQueueContainer.appendChild(threadDiv);
        });
    }

    // Update Blocked Queue
    blockedQueueContainer.innerHTML = '';
    if (blockedQueue.length === 0) {
        blockedQueueContainer.innerHTML = '<div class="queue-empty">Empty</div>';
    } else {
        blockedQueue.forEach(thread => {
            const threadDiv = document.createElement('div');
            threadDiv.className = 'queue-thread blocked';
            threadDiv.textContent = `${thread.name} (Remaining: ${thread.remainingTime})`;
            blockedQueueContainer.appendChild(threadDiv);
        });
    }
}

function updateOperationButtons() {
    blockThreadBtn.disabled = !currentThread || !isRunning;
    terminateThreadBtn.disabled = !currentThread || !isRunning;
    wakeThreadBtn.disabled = blockedQueue.length === 0 || !isRunning;
}

// ========================================
// Event Logging
// ========================================
function logEvent(message, type = 'initial') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[Time ${currentTime}] ${message}`;
    eventLog.appendChild(entry);
    eventLog.scrollTop = eventLog.scrollHeight;
}

// ========================================
// Initialize
// ========================================
function initialize() {
    handleAlgorithmChange();
    threadNameInput.value = 'T1';
    logEvent('System initialized. Add threads to begin.', 'initial');
}

initialize();