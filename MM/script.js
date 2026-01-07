// ========================================
// Multithreading Models Simulator v2.0
// ========================================

// Global State
let currentModel = 'many-to-one';
let userThreads = [];
let kernelThreads = [];
let connections = [];
let threadIdCounter = 1;
let animationInProgress = false;

// Model Information Database
const modelInfo = {
    'many-to-one': {
        title: 'Many-to-One Threading Model',
        description: 'In the Many-to-One model, multiple user-level threads are mapped to a single kernel thread. Thread management is handled entirely in user space.',
        working: 'All user threads share a single kernel thread. The thread library manages scheduling. If one thread makes a blocking system call, the entire process blocks.',
        advantages: [
            'Efficient thread management in user space',
            'Fast context switching (no kernel involvement)',
            'Portable across OSs'
        ],
        disadvantages: [
            'Entire process blocks if one thread blocks (CLICK ME TO SIMULATE)',
            'Cannot run on multiple processors concurrently'
        ],
        examples: 'Green Threads, GNU Portable Threads',
        useCases: ['Single-core systems', 'Lightweight threading needs'],
        initialKernelThreads: 1
    },
    'one-to-one': {
        title: 'One-to-One Threading Model',
        description: 'Each user thread is mapped to its own kernel thread. This provides maximum concurrency.',
        working: 'Each user thread has a dedicated kernel thread. When one blocks, others can continue. Allows true parallelism on multi-core systems.',
        advantages: [
            'True Concurrency and Parallelism',
            'Blocking one thread does NOT block others',
            'Utilizes multi-core architectures'
        ],
        disadvantages: [
            'Higher resource overhead (kernel threads are heavy)',
            'Slower creation/destruction of threads'
        ],
        examples: 'Windows, Linux (NPTL), Modern Java',
        useCases: ['CPU-intensive apps', 'Multi-core servers'],
        initialKernelThreads: 1
    },
    'many-to-many': {
        title: 'Many-to-Many Threading Model',
        description: 'Multiple user threads are multiplexed onto a smaller or equal number of kernel threads.',
        working: 'A pool of kernel threads serves many user threads. The OS schedules kernel threads, and the library schedules user threads onto them.',
        advantages: [
            'Best of both worlds: Flexible and Efficient',
            'Sufficient concurrency with lower overhead',
            'Can adjust kernel thread pool size'
        ],
        disadvantages: [
            'Complex implementation',
            'Harder to debug'
        ],
        examples: 'Solaris, Windows ThreadPool',
        useCases: ['Complex enterprise applications'],
        initialKernelThreads: 3 // Default pool size
    }
};

// ========================================
// DOM Elements
// ========================================
const tabButtons = document.querySelectorAll('.tab-button');
const addThreadBtn = document.getElementById('addThreadBtn');
const removeThreadBtn = document.getElementById('removeThreadBtn');
const playAnimationBtn = document.getElementById('playAnimationBtn');
const resetBtn = document.getElementById('resetBtn');
const userThreadsContainer = document.getElementById('userThreads');
const kernelThreadsContainer = document.getElementById('kernelThreads');
const connectionsCanvas = document.getElementById('connectionsCanvas');
const userThreadCount = document.getElementById('userThreadCount');
const kernelThreadCount = document.getElementById('kernelThreadCount');
const mappingRatio = document.getElementById('mappingRatio');
const statusMessage = document.getElementById('statusMessage');

// Info Panel Elements
const modelTitle = document.getElementById('modelTitle');
const modelDescription = document.getElementById('modelDescription');
const modelWorking = document.getElementById('modelWorking');
const modelAdvantages = document.getElementById('modelAdvantages');
const modelDisadvantages = document.getElementById('modelDisadvantages');
const modelExamples = document.getElementById('modelExamples');
const modelUseCases = document.getElementById('modelUseCases');

// ========================================
// Event Listeners
// ========================================
tabButtons.forEach(button => {
    button.addEventListener('click', () => switchModel(button.dataset.model));
});

addThreadBtn.addEventListener('click', addUserThread);
removeThreadBtn.addEventListener('click', removeUserThread);
playAnimationBtn.addEventListener('click', playAnimation);
resetBtn.addEventListener('click', resetModel);
window.addEventListener('resize', () => { if (!animationInProgress) drawConnections(); });

// ========================================
// Initialization
// ========================================
initialize();

function initialize() {
    switchModel('many-to-one');
    updateStatus('Simulator initialized. Select a model and add threads.');
}

// ========================================
// Model Switching Logic
// ========================================
function switchModel(model) {
    currentModel = model;

    tabButtons.forEach(btn => {
        if (btn.dataset.model === model) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    updateInfoPanel();
    resetModel();
    updateStatus(`Switched to ${modelInfo[model].title}`);
}

function updateInfoPanel() {
    const info = modelInfo[currentModel];

    modelTitle.textContent = info.title;
    modelDescription.textContent = info.description;
    modelWorking.textContent = info.working;

    // Advantages
    modelAdvantages.innerHTML = '';
    info.advantages.forEach(adv => {
        const li = document.createElement('li');
        li.textContent = adv;
        modelAdvantages.appendChild(li);
    });

    // Disadvantages (Interactive)
    modelDisadvantages.innerHTML = '';
    info.disadvantages.forEach(dis => {
        const li = document.createElement('li');
        li.textContent = dis;

        // INTERACTIVE DISADVANTAGE LOGIC
        if (currentModel === 'many-to-one' && dis.includes('Entire process blocks')) {
            li.style.cursor = 'pointer';
            li.style.color = '#ff4757';
            li.style.textDecoration = 'underline';
            li.title = "Click to Simulate Blocking Scenario";
            li.onclick = simulateBlockingScenario; // Trigger Special Animation
        }

        modelDisadvantages.appendChild(li);
    });

    modelExamples.textContent = info.examples;

    // Use Cases
    modelUseCases.innerHTML = '';
    info.useCases.forEach(uc => {
        const li = document.createElement('li');
        li.textContent = uc;
        modelUseCases.appendChild(li);
    });
}


// ========================================
// Thread Logic
// ========================================
function addUserThread() {
    if (animationInProgress) return;
    const threadId = `UT${threadIdCounter++}`;
    userThreads.push({ id: threadId, type: 'user', element: null });
    renderThreads();
    updateConnections();
    updateCounts();
}

function removeUserThread() {
    if (animationInProgress || userThreads.length === 0) return;
    userThreads.pop();
    renderThreads();
    updateConnections();
    updateCounts();
}

function resetModel() {
    userThreads = [];
    kernelThreads = [];
    connections = [];
    threadIdCounter = 1;
    animationInProgress = false;

    // Reset Kernel Threads based on model
    const initialKernelCount = modelInfo[currentModel].initialKernelThreads;
    for (let i = 0; i < initialKernelCount; i++) {
        kernelThreads.push({ id: `KT${i + 1}`, type: 'kernel', element: null });
    }

    // Special: One-to-One logic clears KTs? No, it grows them dynamically. 
    // But reset should clear them back to 0 or 1? Let's stick to config.
    if (currentModel === 'one-to-one') kernelThreads = [];

    renderThreads();
    updateConnections();
    updateCounts();
    updateStatus('Model reset.');
}

// ========================================
// CORE: ANIMATION LOGIC
// ========================================
async function playAnimation() {
    if (animationInProgress) return;
    if (userThreads.length === 0) {
        updateStatus('Add User Threads first!');
        return;
    }

    animationInProgress = true;
    playAnimationBtn.disabled = true;

    // 1. ONE-TO-ONE (Full Concurrency)
    if (currentModel === 'one-to-one') {
        updateStatus('Executing Concurrently: All threads running in parallel...');

        // Map all threads to separate promises
        const promises = userThreads.map((ut, index) => animateOneToOnePair(ut, index));
        await Promise.all(promises);

        updateStatus('Concurrent execution finished.');
    }

    // 2. MANY-TO-MANY (Batched Concurrency)
    else if (currentModel === 'many-to-many') {
        updateStatus('Executing Batched Concurrency on limited Kernel Pool...');

        let remainingUTs = [...userThreads];

        while (remainingUTs.length > 0) {
            // Pick next batch of threads equal to number of Kernels
            let batch = [];
            for (let k = 0; k < kernelThreads.length && remainingUTs.length > 0; k++) {
                batch.push({
                    ut: remainingUTs.shift(),
                    kt: kernelThreads[k] // Assign available KT
                });
            }

            updateStatus(`Running batch of ${batch.length} threads...`);

            // Run this batch concurrently
            const batchPromises = batch.map(pair => animatePair(pair.ut, pair.kt));
            await Promise.all(batchPromises);

            if (remainingUTs.length > 0) await sleep(500); // Pause between batches
        }

        updateStatus('Pool execution finished.');
    }

    // 3. MANY-TO-ONE (Sequential - Normal Case)
    else {
        updateStatus('Sequential Execution (Time Sliced)...');
        const kt = kernelThreads[0];

        for (let i = 0; i < userThreads.length; i++) {
            await animatePair(userThreads[i], kt);
        }

        updateStatus('Sequence finished. CLICK THE DISADVANTAGE to see Blocking!');
    }

    animationInProgress = false;
    playAnimationBtn.disabled = false;
}

// --- Animation Helpers ---

async function animateOneToOnePair(ut, index) {
    const kt = kernelThreads[index]; // Assume synced indices for 1:1
    if (!kt) return;

    // Direct visual mapping
    const line = connectionsCanvas.querySelectorAll('.connection-line')[index];

    ut.element.classList.add('active');
    if (line) line.classList.add('active');

    await sleep(300 + Math.random() * 200); // Slight jitter for realism

    kt.element.classList.add('active');
    await sleep(2000); // Doing work

    ut.element.classList.remove('active');
    kt.element.classList.remove('active');
    if (line) line.classList.remove('active');
}

async function animatePair(ut, kt) {
    // Find connection index if needed, but for M:M we know exact pair
    // Just activate elements visually

    ut.element.classList.add('active');
    kt.element.classList.add('active');

    // Highlight lines? Complex for M:M dynamic mapping.
    // Let's try to highlight the specific SVG line connecting them?
    // We redraw lines constantly, so finding the specific one is tricky.
    // We will just highlight nodes for M:M clarity.

    await sleep(1500); // Work duration

    ut.element.classList.remove('active');
    kt.element.classList.remove('active');
}

// --- SPECIAL: BLOCKING SCENARIO ---
async function simulateBlockingScenario() {
    if (currentModel !== 'many-to-one') return;
    if (userThreads.length === 0) { updateStatus("Add threads first!"); return; }
    if (animationInProgress) return;

    animationInProgress = true;
    playAnimationBtn.disabled = true;
    updateStatus('⚠️ SIMULATING BLOCKING DISADVANTAGE ⚠️');

    const kt = kernelThreads[0];
    const ut1 = userThreads[0];

    // 1. Thread 1 starts ... AND BLOCKS
    ut1.element.classList.add('active');
    kt.element.classList.add('active');

    await sleep(800);
    updateStatus(`🛑 ${ut1.id} issued BLOCKING call! Kernel Thread is now FROZEN.`);

    // Turn RED using CSS class
    ut1.element.classList.add('blocked');
    kt.element.classList.add('blocked');

    await sleep(1500);

    // 2. Try running Thread 2 (if exists) -> FAILS
    if (userThreads.length > 1) {
        const ut2 = userThreads[1];
        updateStatus(`⏳ ${ut2.id} wants to run... but KT1 is BLOCKED.`);

        // Shake animation manually
        ut2.element.style.background = '#ffd32a'; // Yellow "Waiting"
        await sleep(200);
        ut2.element.style.transform = 'translate(5px, 0)';
        await sleep(100);
        ut2.element.style.transform = 'translate(-5px, 0)';
        await sleep(100);
        ut2.element.style.transform = 'translate(0, 0)';

        await sleep(1000);
        updateStatus(`❌ ${ut2.id} CANNOT execute!`);
        ut2.element.style.background = '';
    }

    await sleep(1500);

    // 3. Unblock
    updateStatus('✅ System call returned. Unblocking...');
    ut1.element.classList.remove('blocked');
    kt.element.classList.remove('blocked');

    ut1.element.classList.remove('active');
    kt.element.classList.remove('active');

    animationInProgress = false;
    playAnimationBtn.disabled = false;
}


// ========================================
// Rendering & Connections
// ========================================
function renderThreads() {
    userThreadsContainer.innerHTML = '';
    userThreads.forEach(t => {
        const div = document.createElement('div');
        div.className = `thread-box ${t.type}-thread`;
        div.textContent = t.id;
        userThreadsContainer.appendChild(div);
        t.element = div;
    });

    kernelThreadsContainer.innerHTML = '';
    kernelThreads.forEach(t => {
        const div = document.createElement('div');
        div.className = `thread-box ${t.type}-thread`;
        div.textContent = t.id;
        kernelThreadsContainer.appendChild(div);
        t.element = div;
    });
}

function updateConnections() {
    requestAnimationFrame(() => {
        connectionsCanvas.innerHTML = '';
        connections = [];

        // Recalculate Logic
        if (currentModel === 'many-to-one' && userThreads.length > 0 && kernelThreads.length > 0) {
            userThreads.forEach(ut => connections.push({ from: ut.id, to: kernelThreads[0].id }));
        }
        else if (currentModel === 'one-to-one') {
            // Ensure enough KTs
            while (kernelThreads.length < userThreads.length) {
                kernelThreads.push({ id: `KT${kernelThreads.length + 1}`, type: 'kernel', element: null });
            }
            renderThreads(); // Re-render if grew
            userThreads.forEach((ut, i) => connections.push({ from: ut.id, to: kernelThreads[i].id }));
        }
        else if (currentModel === 'many-to-many' && kernelThreads.length > 0) {
            userThreads.forEach((ut, i) => {
                connections.push({ from: ut.id, to: kernelThreads[i % kernelThreads.length].id });
            });
        }

        // Draw Lines
        connections.forEach(conn => {
            const ut = userThreads.find(u => u.id === conn.from);
            const kt = kernelThreads.find(k => k.id === conn.to);
            if (ut && kt && ut.element && kt.element) drawLine(ut.element, kt.element);
        });
    });
}

function drawLine(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    const c = connectionsCanvas.getBoundingClientRect();

    const x1 = r1.right - c.left;
    const y1 = r1.top + r1.height / 2 - c.top;
    const x2 = r2.left - c.left;
    const y2 = r2.top + r2.height / 2 - c.top;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`);
    path.setAttribute('class', 'connection-line');
    connectionsCanvas.appendChild(path);
}

function updateCounts() {
    userThreadCount.innerText = userThreads.length;
    kernelThreadCount.innerText = kernelThreads.length;
    mappingRatio.innerText = kernelThreads.length ? (userThreads.length / kernelThreads.length).toFixed(1) + ":1" : "-";
}

function updateStatus(msg) { statusMessage.innerText = msg; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }