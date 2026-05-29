let currentSentence = "";
let raceSentences = [];
let startTime;
let gameActive = false;
let gameMode = 'race'; // 'race' or 'practice'
let difficulty = 'medium';
let totalCharsTyped = 0;
let errors = 0;
let currentLap = 1;
let totalLaps = 3;
let playerVisualProgress = 0;
let aiVisualProgress = 0;
let totalRaceChars = 0;
let playerCharsCompleted = 0;
let playerCurrentDistance = 0;
let aiCurrentDistance = 0;
let lastFrameTime = 0;

const playerCar = document.getElementById('player-car');
const aiCar = document.getElementById('ai-car');
const raceArena = document.getElementById('race-arena');
const trackPath = document.getElementById('track-path');
const sentenceDisplay = document.getElementById('sentence-display');
const typingInput = document.getElementById('typing-input');
const resultsArea = document.getElementById('results');
const winnerText = document.getElementById('winner-text');
const hud = document.getElementById('hud');
const posVal = document.getElementById('pos-val');
const lapVal = document.getElementById('lap-val');
const totalLapsHud = document.getElementById('total-laps-hud');
const speedVal = document.getElementById('speed-val');
const nitroBar = document.getElementById('nitro-bar');

let pathLength = 0;
let playerLastAngle = 0;
let aiLastAngle = 0;
let nitroAmount = 0;

let selectedCarColor = "#2563eb";
const carColors = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

// Audio System
let audioCtx;
let engineOsc;
let engineGain;
let screechOsc;
let screechGain;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Engine sound
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = audioCtx.createGain();
    const engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 800;

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    engineGain.gain.value = 0;
    engineOsc.start();

    // Tire screech sound
    screechOsc = audioCtx.createOscillator();
    screechOsc.type = 'square';
    screechGain = audioCtx.createGain();
    const screechFilter = audioCtx.createBiquadFilter();
    screechFilter.type = 'highpass';
    screechFilter.frequency.value = 2000;

    screechOsc.connect(screechFilter);
    screechFilter.connect(screechGain);
    screechGain.connect(audioCtx.destination);

    screechGain.gain.value = 0;
    screechOsc.start();
}

function updateAudio(speed, isTurning) {
    if (!audioCtx) return;

    // Speed is usually 0-450 (CPM based)
    const baseFreq = 40;
    const maxFreq = 160;
    const freq = baseFreq + (speed / 450) * (maxFreq - baseFreq);

    engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);

    if (gameActive) {
        engineGain.gain.setTargetAtTime(0.15, audioCtx.currentTime, 0.1);
    } else {
        engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
    }

    // Screeching logic
    if (gameActive && speed > 200 && isTurning) {
        screechGain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.05);
        screechOsc.frequency.setTargetAtTime(800 + Math.random() * 200, audioCtx.currentTime, 0.05);
    } else {
        screechGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
    }
}

// Wait for SVG to be ready to get path length
window.addEventListener('load', () => {
    pathLength = trackPath.getTotalLength();
    updateCarPositions(0, 0);
    initCarSelection();
});

function initCarSelection() {
    const container = document.getElementById('car-selection');

    carColors.forEach(color => {
        const btn = document.createElement('div');
        btn.className = 'car-option';
        btn.style.backgroundColor = color;
        if (color === selectedCarColor) btn.classList.add('active');

        btn.onclick = () => selectCar(color);
        container.appendChild(btn);
    });
}

function selectCar(color) {
    selectedCarColor = color;
    document.querySelectorAll('.car-option').forEach(btn => {
        btn.classList.toggle('active', btn.style.backgroundColor === hexToRgb(color));
    });

    // Update player car visual
    const body = playerCar.querySelector('.car-body');
    if (body) body.setAttribute('fill', color);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "";
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

function setDifficulty(d) {
    difficulty = d;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${d}'`)) btn.classList.add('active');
    });
}

function setLaps(n) {
    totalLaps = n;
    document.querySelectorAll('.lap-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`(${n})`)) btn.classList.add('active');
    });
}

function fetchSentence() {
    const sentences = [
        "Rychlá hnědá liška přeskakuje líného psa.",
        "Závodění není jen o rychlosti, ale také o soustředění a přesnosti.",
        "Abyste skončili první, musíte nejdříve dojet do cíle.",
        "Sledujte cestu a držte ruce pevně na klávesnici.",
        "Rychlé psaní je jako řazení rychlostních stupňů v závodním autě.",
        "Vítězství patří tomu, kdo udělá nejméně chyb.",
        "Motor řve, když zelené světlo signalizuje start posledního kola.",
        "Cvičení dělá mistra, pokud jde o dovednosti psaní všemi deseti.",
        "Pravidelný rytmus je důležitější než náhlý nárůst rychlosti.",
        "Dav jásá, když vedoucí jezdec protne cílovou čáru.",
        "Vozy formule jedna mohou na dlouhých rovinkách dosáhnout úžasných rychlostí.",
        "Soustřeďte se nejdříve na přesnost a rychlost přijde sama.",
        "Každý napsaný znak vás přibližuje k šachovnicové vlajce.",
        "Nedívejte se zpět, soupeř vám dýchá na záda.",
        "Pneumatiky skřípou, když auto projíždí ostrou zatáčku ve vysoké rychlosti.",
        "Šampionát je na dosah pro ty nejoddanější hráče.",
        "Moderní technologie nám umožňují simulovat realistická závodní prostředí.",
        "Kód je jako závodní dráha, musí být čistý a efektivní.",
        "Pocit z dokonalého kola se nevyrovná ničemu jinému ve sportu.",
        "Zůstaňte v klidu pod tlakem, abyste si udrželi výkon při psaní.",
        "Závodní dráha je náročné místo pro člověka i stroj.",
        "Zrychlení je klíčem k předjíždění soupeřů na rovince.",
        "Při psaní všemi deseti je důležité udržovat prsty v základní poloze.",
        "Kvalitní mechanická klávesnice může výrazně zlepšit váš pocit z psaní.",
        "Soustřeďte se na text před sebou a snažte se nedívat na své ruce.",
        "Každá chyba vás stojí drahocenné sekundy v tomto napínavém závodě.",
        "Adrenalin stoupá, když se přibližujete k poslední zatáčce před cílem.",
        "Plynulost je často důležitější než syrová rychlost úhozů za minutu.",
        "Vaše auto reaguje na každé správně napsané slovo okamžitým zrychlením.",
        "V tréninkovém režimu můžete pilovat svou techniku bez tlaku soupeřů.",
        "Závodní simulátory pomáhají profesionálním jezdcům učit se nové tratě.",
        "Precizní brzdění a včasná akcelerace jsou základy rychlého kola.",
        "Světlo světlometů prořezává tmu během nočního vytrvalostního závodu.",
        "Týmová strategie hraje klíčovou roli v moderních automobilových závodech.",
        "Aerodynamika vozu je navržena tak, aby poskytovala maximální přítlak.",
        "V boxové uličce se počítá každá desetina sekundy při výměně kol."
    ];
    return sentences[Math.floor(Math.random() * sentences.length)];
}

function startGame(mode) {
    gameMode = mode;

    document.getElementById('overlay-container').style.display = 'none';
    document.getElementById('difficulty-selection').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    sentenceDisplay.innerHTML = "<span style='color: #64748b'>Načítání...</span>";
    document.getElementById('typing-area').style.display = 'flex';
    typingInput.disabled = true;
    typingInput.value = "";

    playerCharsCompleted = 0;
    currentLap = 1;

    aiCar.style.display = 'block';

    // Set Player Car
    selectCar(selectedCarColor);

    // Randomize AI Car
    const aiColor = carColors[Math.floor(Math.random() * carColors.length)];
    const aiBody = aiCar.querySelector('.car-body');
    if (aiBody) aiBody.setAttribute('fill', aiColor);

    currentSentence = fetchSentence();

    renderSentence("");

    hud.style.display = 'grid';
    updateLapUI();

    typingInput.disabled = true;

    totalCharsTyped = 0;
    errors = 0;
    playerVisualProgress = 0;
    aiVisualProgress = 0;
    playerCurrentDistance = 0;
    aiCurrentDistance = 0;
    nitroAmount = 0;
    gameActive = false;

    updateCarPositions(0, 0);

    startCountdown(() => {
        initAudio();
        gameActive = true;
        startTime = Date.now();
        lastFrameTime = startTime;
        typingInput.disabled = false;
        typingInput.focus();
        requestAnimationFrame(updateGame);
    });
}

function startCountdown(callback) {
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    let count = 3;
    countdownEl.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
        } else if (count === 0) {
            countdownEl.innerText = "START!";
        } else {
            clearInterval(interval);
            countdownEl.style.display = 'none';
            callback();
        }
    }, 1000);
}

function updateLapUI() {
    lapVal.innerText = currentLap;
    totalLapsHud.innerText = gameMode === 'practice' ? '∞' : totalLaps;
}

function renderSentence(userInput) {
    sentenceDisplay.innerHTML = "";
    let correctSoFar = true;

    for (let i = 0; i < currentSentence.length; i++) {
        const span = document.createElement('span');
        const char = currentSentence[i];
        const userChar = userInput[i];

        if (userChar == null) {
            span.innerText = char;
            if (i === userInput.length && correctSoFar) {
                span.classList.add('cursor');
            }
        } else if (userChar === char && correctSoFar) {
            span.innerText = char;
            span.classList.add('correct');
        } else {
            span.innerText = char;
            span.classList.add('incorrect');
            correctSoFar = false;
        }
        sentenceDisplay.appendChild(span);
    }
}

typingInput.addEventListener('input', () => {
    if (!gameActive) return;

    const val = typingInput.value;
    totalCharsTyped++;

    if (val.length > 0 && val[val.length - 1] !== currentSentence[val.length - 1]) {
        errors++;
        flashError();
        // Velocity reduction penalty
        playerCharsCompleted = Math.max(0, playerCharsCompleted - 1);
    }

    renderSentence(val);

    if (val === currentSentence) {
        sentenceDisplay.classList.add('correct-word-pop');
        setTimeout(() => sentenceDisplay.classList.remove('correct-word-pop'), 300);

        playerCharsCompleted += currentSentence.length;

        // Cycle sentences continuously
        currentSentence = fetchSentence();
        typingInput.value = "";
        renderSentence("");
    }
});

function flashError() {
    sentenceDisplay.classList.add('error-flash');
    raceArena.classList.add('shake');
    setTimeout(() => {
        sentenceDisplay.classList.remove('error-flash');
        raceArena.classList.remove('shake');
    }, 100);
}

function updateGame() {
    if (!gameActive) return;
    if (pathLength === 0) pathLength = trackPath.getTotalLength();

    const now = Date.now();
    const deltaTimeSeconds = (now - lastFrameTime) / 1000;
    const elapsedSeconds = (now - startTime) / 1000;
    lastFrameTime = now;

    // Steady slow pace (Idling)
    const idlingCPM = 80;
    const aiCPMBase = { 'easy': 150, 'medium': 250, 'hard': 400 }[difficulty];

    // Player CPM calculation
    const currentCPM = Math.round((totalCharsTyped / (elapsedSeconds / 60)) || 0);
    const speed = Math.min(500, Math.round(currentCPM * 0.9 + idlingCPM));
    speedVal.innerText = speed;

    // Nitro logic
    if (currentCPM > 400) {
        nitroAmount = Math.min(100, nitroAmount + 1.0);
    } else {
        nitroAmount = Math.max(0, nitroAmount - 0.4);
    }
    nitroBar.style.width = `${nitroAmount}%`;

    // Player progress calculation
    let playerCorrectInSentence = 0;
    const val = typingInput.value;
    for (let i = 0; i < val.length; i++) {
        if (val[i] === currentSentence[i]) playerCorrectInSentence++;
        else break;
    }

    // Nitro boost effect on progress
    const nitroBoost = nitroAmount > 80 ? 1.3 : 1.0;

    // Total distance based on characters typed + idling time
    // We assume an average race is ~300 characters per lap for progress scaling
    const targetDistance = totalLaps * 300;

    const playerTotalCorrect = (playerCharsCompleted + playerCorrectInSentence) * nitroBoost + (idlingCPM * elapsedSeconds / 60);
    const aiTotalChars = ((aiCPM + idlingCPM) * elapsedSeconds / 60);

    let pLapProgress, aLapProgress;

    if (gameMode === 'race') {
        const playerActualProgress = Math.min(1, playerTotalCorrect / targetDistance);
        const aiActualProgress = Math.min(1, aiTotalChars / targetDistance);

        playerVisualProgress += (playerActualProgress - playerVisualProgress) * 0.1;
        aiVisualProgress += (aiActualProgress - aiVisualProgress) * 0.1;

        pLapProgress = (playerVisualProgress * totalLaps) % 1;
        aLapProgress = (aiVisualProgress * totalLaps) % 1;

        // Lap detection
        const newLap = Math.floor(playerVisualProgress * totalLaps) + 1;
        if (newLap > currentLap && newLap <= totalLaps) {
            currentLap = newLap;
            updateLapUI();
        }

        // HUD Position update
        posVal.innerText = playerVisualProgress >= aiVisualProgress ? "1" : "2";

        // INSTANT FINISH: Check actual progress instead of visual
        if (playerActualProgress >= 1) {
            playerVisualProgress = 1;
            updateCarPositions(1 % 1, aLapProgress); // Snap to finish
            winRace('player');
            return;
        }
        if (aiActualProgress >= 1) {
            aiVisualProgress = 1;
            updateCarPositions(pLapProgress, 1 % 1); // Snap to finish
            winRace('ai');
            return;
        }
    } else {
        // Infinite Practice Mode
        const lapLengthInChars = 300;
        pLapProgress = (playerTotalCorrect / lapLengthInChars) % 1;
        aLapProgress = (aiTotalChars / lapLengthInChars) % 1;

        const newLap = Math.floor(playerTotalCorrect / lapLengthInChars) + 1;
        if (newLap > currentLap) {
            currentLap = newLap;
            updateLapUI();
        }
        posVal.innerText = "-";
    }

    updateCarPositions(pLapProgress, aLapProgress);

    // Audio update
    const isTurning = Math.abs(playerLastAngle - playerCar.dataset.prevAngle || 0) > 2;
    playerCar.dataset.prevAngle = playerLastAngle;
    updateAudio(speed, isTurning);

    requestAnimationFrame(updateGame);
}

function updateCarPositions(playerLapProgress, aiLapProgress) {
    if (!pathLength) return;

    const pPoint = trackPath.getPointAtLength(playerLapProgress * pathLength);
    const aPoint = trackPath.getPointAtLength(aiLapProgress * pathLength);

    const lookAhead = 5;
    const pPointAhead = trackPath.getPointAtLength((playerLapProgress * pathLength + lookAhead) % pathLength);
    const aPointAhead = trackPath.getPointAtLength((aiLapProgress * pathLength + lookAhead) % pathLength);

    let pAngle = Math.atan2(pPointAhead.y - pPoint.y, pPointAhead.x - pPoint.x) * 180 / Math.PI + 90;
    let aAngle = Math.atan2(aPointAhead.y - aPoint.y, aPointAhead.x - aPoint.x) * 180 / Math.PI + 90;

    pAngle = smoothAngle(playerLastAngle, pAngle);
    aAngle = smoothAngle(aiLastAngle, aAngle);

    playerLastAngle = pAngle;
    aiLastAngle = aAngle;

    // Arena dimensions for relative positioning
    const arenaRect = raceArena.getBoundingClientRect();
    const svgViewBoxWidth = 1536;
    const svgViewBoxHeight = 1024;

    // SVG transform: Use matrix or translate/rotate directly on elements
    playerCar.setAttribute('transform', `translate(${pPoint.x}, ${pPoint.y}) rotate(${pAngle})`);

    // Player car offset
    const playerLaneOffset = -25;
    const pRad = (pAngle - 90) * Math.PI / 180;
    const pOffsetX = Math.cos(pRad + Math.PI / 2) * playerLaneOffset;
    const pOffsetY = Math.sin(pRad + Math.PI / 2) * playerLaneOffset;

    playerCar.setAttribute('transform', `translate(${pPoint.x + pOffsetX}, ${pPoint.y + pOffsetY}) rotate(${pAngle})`);

    // AI car offset slightly to the side to simulate lanes
    const aiLaneOffset = 25;
    const aRad = (aAngle - 90) * Math.PI / 180;
    const offsetX = Math.cos(aRad + Math.PI / 2) * aiLaneOffset;
    const offsetY = Math.sin(aRad + Math.PI / 2) * aiLaneOffset;

    aiCar.setAttribute('transform', `translate(${aPoint.x + offsetX}, ${aPoint.y + offsetY}) rotate(${aAngle})`);
}

function smoothAngle(oldAngle, newAngle) {
    while (newAngle - oldAngle > 180) newAngle -= 360;
    while (newAngle - oldAngle < -180) newAngle += 360;
    return newAngle;
}

function updatePersonalBest(cpm) {
    const pb = localStorage.getItem('typeracer_pb') || 0;
    const pbDisplayMenu = document.getElementById('pb-val-menu');
    const newBestMsg = document.getElementById('new-best-msg');

    if (cpm > pb) {
        localStorage.setItem('typeracer_pb', cpm);
        pbDisplayMenu.innerText = cpm;
        newBestMsg.style.display = 'block';
        return true;
    } else {
        newBestMsg.style.display = 'none';
        return false;
    }
}

function loadPersonalBest() {
    const pb = localStorage.getItem('typeracer_pb') || 0;
    document.getElementById('pb-val-menu').innerText = pb;
}

function winRace(winner) {
    if (!gameActive) return;
    gameActive = false;
    typingInput.disabled = true;

    const endTime = Date.now();
    const durationMinutes = (endTime - startTime) / 1000 / 60;
    const cpm = Math.round(totalCharsTyped / durationMinutes);
    const accuracy = Math.max(0, Math.round(((totalCharsTyped - errors) / totalCharsTyped) * 100)) || 0;

    updatePersonalBest(cpm);

    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('practice-btn').style.display = 'none';
    document.getElementById('back-btn').style.display = 'block';

    setTimeout(() => {
        document.getElementById('overlay-container').style.display = 'flex';
        resultsArea.style.display = 'block';
        if (winner === 'player') {
            winnerText.innerText = "VYHRÁL JSTE!";
            winnerText.style.color = "#2563eb";
            winnerText.style.textShadow = "none";
            document.getElementById('medal-icon').innerText = "🏆";
        } else {
            winnerText.innerText = "AI VYHRÁLA!";
            winnerText.style.color = "#64748b";
            winnerText.style.textShadow = "none";
            document.getElementById('medal-icon').innerText = "🏁";
        }

        document.getElementById('accuracy-val').innerText = accuracy;
        document.getElementById('cpm-val').innerText = cpm;
    }, 1000);
}

function resetGame() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('difficulty-selection').style.display = 'block';
    document.getElementById('overlay-container').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('typing-area').style.display = 'none';

    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('practice-btn').style.display = 'block';
    document.getElementById('back-btn').style.display = 'none';

    // Reset state variables
    playerVisualProgress = 0;
    aiVisualProgress = 0;
    playerLastAngle = 0;
    aiLastAngle = 0;
    updateCarPositions(0, 0);
}

setDifficulty('medium');
loadPersonalBest();
