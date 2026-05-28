let currentSentence = "";
let raceSentences = [];
let startTime;
let gameActive = false;
let gameMode = 'race'; // 'race' or 'practice'
let difficulty = 'medium';
let totalCharsTyped = 0;
let errors = 0;
let currentLap = 1;
let totalLaps = 1;
let playerVisualProgress = 0;
let aiVisualProgress = 0;
let totalRaceChars = 0;
let playerCharsCompleted = 0;

const playerCar = document.getElementById('player-car');
const aiCar = document.getElementById('ai-car');
const gameContainer = document.getElementById('game-container');
const trackPath = document.getElementById('track-path');
const sentenceDisplay = document.getElementById('sentence-display');
const typingInput = document.getElementById('typing-input');
const resultsArea = document.getElementById('results');
const winnerText = document.getElementById('winner-text');
const lapCounter = document.getElementById('lap-counter');
const currentLapSpan = document.getElementById('current-lap');
const totalLapsSpan = document.getElementById('total-laps');

const pathLength = trackPath.getTotalLength();

function setDifficulty(d) {
    difficulty = d;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        // Check onclick attribute to match difficulty ID
        if (btn.getAttribute('onclick').includes(`'${d}'`)) btn.classList.add('active');
    });
}

function fetchSentence() {
    const sentences = [
        "Rychlá hnědá liška přeskakuje líného psa.",
        "Závodění není jen o rychlosti, ale také o soustředění a přesnosti.",
        "Abyste skončili první, musíte nejprve závod dokončit.",
        "Sledujte cestu a mějte ruce pevně na klávesnici.",
        "Rychlé psaní je jako řazení rychlostních stupňů v závodním autě.",
        "Vítězství patří tomu, kdo udělá nejméně chyb.",
        "Motor řve, když na semaforu naskočí zelená pro poslední kolo.",
        "Cvičení dělá mistra, pokud jde o dovednosti v psaní všemi deseti.",
        "Pravidelný rytmus je důležitější než náhlý příval rychlosti.",
        "Dav jásá, když vedoucí jezdec projíždí cílem.",
        "Formule jedna mohou na dlouhých rovinkách dosáhnout neuvěřitelných rychlostí.",
        "Soustřeďte se nejprve na přesnost a rychlost se dostaví sama.",
        "Každý napsaný znak vás přibližuje k šachovnicovému praporku.",
        "Nedívejte se zpět, soupeř vám dýchá na záda.",
        "Pneumatiky skřípou, když auto projíždí ostrou zatáčku ve vysoké rychlosti.",
        "Šampionát je na dosah pro ty nejoddanější hráče.",
        "Moderní technologie nám umožňují simulovat realistické závodní prostředí.",
        "Kód je jako závodní dráha, musí být čistý a efektivní.",
        "Pocit z dokonalého kola se nevyrovná ničemu jinému ve sportu.",
        "Zůstaňte v klidu i pod tlakem, abyste si udrželi výkon v psaní.",
        "Praha je hlavní a největší město České republiky.",
        "Vltava je nejdelší řeka na území České republiky."
    ];
    return sentences[Math.floor(Math.random() * sentences.length)];
}

function startGame(mode) {
    gameMode = mode;
    totalLaps = parseInt(document.getElementById('lap-select').value);

    document.getElementById('difficulty-selection').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    sentenceDisplay.innerHTML = "<span style='color: #aaa'>Načítání vět...</span>";
    document.getElementById('typing-area').style.display = 'block';
    typingInput.disabled = true;
    typingInput.value = "";

    raceSentences = [];
    totalRaceChars = 0;
    playerCharsCompleted = 0;
    currentLap = 1;

    aiCar.style.display = 'block';
    if (gameMode === 'race') {
        for (let i = 0; i < totalLaps; i++) {
            const s = fetchSentence();
            raceSentences.push(s);
            totalRaceChars += s.length;
        }
        currentSentence = raceSentences[0];
    } else {
        currentSentence = fetchSentence();
        totalRaceChars = 150; // Reference for progress
        totalLaps = 1;
    }

    renderSentence("");

    lapCounter.style.display = 'block';
    updateLapUI();

    typingInput.disabled = true;

    totalCharsTyped = 0;
    errors = 0;
    playerVisualProgress = 0;
    aiVisualProgress = 0;
    gameActive = false;

    updateCarPositions(0, 0);

    startCountdown(() => {
        gameActive = true;
        startTime = Date.now();
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
    currentLapSpan.innerText = currentLap;
    totalLapsSpan.innerText = gameMode === 'practice' ? '∞' : totalLaps;
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
                span.style.borderLeft = "2px solid #fff";
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
    }

    renderSentence(val);

    if (val === currentSentence) {
        if (gameMode === 'practice') {
            playerCharsCompleted += currentSentence.length;
            currentLap++;
            updateLapUI();
            currentSentence = fetchSentence();
            typingInput.value = "";
            renderSentence("");
        } else {
            playerCharsCompleted += currentSentence.length;
            if (currentLap < totalLaps) {
                currentSentence = raceSentences[currentLap];
                currentLap++;
                updateLapUI();
                typingInput.value = "";
                renderSentence("");
            } else {
                playerVisualProgress = 1;
                winRace('player');
            }
        }
    }
});

function flashError() {
    sentenceDisplay.style.backgroundColor = "rgba(231, 76, 60, 0.3)";
    gameContainer.classList.add('shake');
    setTimeout(() => {
        sentenceDisplay.style.backgroundColor = "#2c3e50";
        gameContainer.classList.remove('shake');
    }, 100);
}

function updateGame() {
    if (!gameActive) return;

    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    const baseCPM = 30; // Constant slow movement
    const aiCPM = { 'easy': 140, 'medium': 280, 'hard': 480 }[difficulty];

    // Player progress calculation
    let playerCorrectInSentence = 0;
    const val = typingInput.value;
    for (let i = 0; i < val.length; i++) {
        if (val[i] === currentSentence[i]) playerCorrectInSentence++;
        else break;
    }

    const playerTotalCorrect = playerCharsCompleted + playerCorrectInSentence + (baseCPM * elapsedSeconds / 60);
    const aiTotalChars = ((aiCPM + baseCPM) * elapsedSeconds / 60);

    let pLapProgress, aLapProgress;

    if (gameMode === 'race') {
        const playerActualProgress = Math.min(1, playerTotalCorrect / totalRaceChars);
        playerVisualProgress += (playerActualProgress - playerVisualProgress) * 0.1;

        const aiActualProgress = Math.min(1, aiTotalChars / totalRaceChars);
        aiVisualProgress += (aiActualProgress - aiVisualProgress) * 0.1;

        pLapProgress = (playerVisualProgress * totalLaps) % 1;
        aLapProgress = (aiVisualProgress * totalLaps) % 1;

        if (aiActualProgress >= 1) {
            winRace('ai');
            return;
        }
    } else {
        // Practice mode: constant lap length (150 chars) for smooth "circulating"
        const lapLen = 150;
        pLapProgress = (playerTotalCorrect / lapLen) % 1;
        aLapProgress = (aiTotalChars / lapLen) % 1;
    }

    updateCarPositions(pLapProgress, aLapProgress);
    requestAnimationFrame(updateGame);
}

function updateCarPositions(playerLapProgress, aiLapProgress) {
    const pPoint = trackPath.getPointAtLength(playerLapProgress * pathLength);
    const aPoint = trackPath.getPointAtLength(aiLapProgress * pathLength);

    const pPointAhead = trackPath.getPointAtLength((playerLapProgress + 0.01) % 1 * pathLength);
    const aPointAhead = trackPath.getPointAtLength((aiLapProgress + 0.01) % 1 * pathLength);

    const pAngle = Math.atan2(pPointAhead.y - pPoint.y, pPointAhead.x - pPoint.x) * 180 / Math.PI;
    const aAngle = Math.atan2(aPointAhead.y - aPoint.y, aPointAhead.x - aPoint.x) * 180 / Math.PI;

    playerCar.style.left = `${pPoint.x - 15}px`;
    playerCar.style.top = `${pPoint.y - 25}px`;
    playerCar.style.transform = `rotate(${pAngle + 90}deg)`;

    aiCar.style.left = `${aPoint.x - 15}px`;
    aiCar.style.top = `${aPoint.y - 25}px`;
    aiCar.style.transform = `rotate(${aAngle + 90}deg)`;
}

function winRace(winner) {
    if (!gameActive) return;
    gameActive = false;
    typingInput.disabled = true;

    const endTime = Date.now();
    const durationMinutes = (endTime - startTime) / 1000 / 60;
    const cpm = Math.round(totalCharsTyped / durationMinutes);
    const accuracy = Math.round(((totalCharsTyped - errors) / totalCharsTyped) * 100) || 0;

    resultsArea.style.display = 'block';
    if (winner === 'player') {
        winnerText.innerText = "Vyhrál jsi!";
        winnerText.style.color = "#2ecc71";
    } else {
        winnerText.innerText = "AI vyhrála!";
        winnerText.style.color = "#e74c3c";
    }

    document.getElementById('accuracy-val').innerText = accuracy;
    document.getElementById('cpm-val').innerText = cpm;
}

function resetGame() {
    location.reload();
}

setDifficulty('medium');
