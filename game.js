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
        if (btn.innerText.toLowerCase() === d) btn.classList.add('active');
    });
}

async function fetchSentence() {
    try {
        const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        const data = await response.json();
        return data.text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error("Error fetching sentence:", error);
        const fallbacks = [
            "The quick brown fox jumps over the lazy dog.",
            "Typing fast is a skill that takes practice and patience.",
            "Racing cars is dangerous but very exciting for the fans.",
            "Software engineering is about solving problems with code.",
            "Artificial intelligence is changing the way we live and work."
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

async function startGame(mode) {
    gameMode = mode;
    totalLaps = parseInt(document.getElementById('lap-select').value);

    document.getElementById('difficulty-selection').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    sentenceDisplay.innerHTML = "<span style='color: #aaa'>Loading sentences...</span>";
    document.getElementById('typing-area').style.display = 'block';
    typingInput.disabled = true;
    typingInput.value = "";

    raceSentences = [];
    totalRaceChars = 0;
    playerCharsCompleted = 0;
    currentLap = 1;

    if (gameMode === 'race') {
        aiCar.style.display = 'block';
        for (let i = 0; i < totalLaps; i++) {
            const s = await fetchSentence();
            raceSentences.push(s);
            totalRaceChars += s.length;
        }
        currentSentence = raceSentences[0];
    } else {
        aiCar.style.display = 'none';
        currentSentence = await fetchSentence();
        totalRaceChars = currentSentence.length;
        totalLaps = 1;
    }

    renderSentence("");

    lapCounter.style.display = 'block';
    updateLapUI();

    typingInput.disabled = false;
    typingInput.focus();

    totalCharsTyped = 0;
    errors = 0;
    playerVisualProgress = 0;
    aiVisualProgress = 0;
    gameActive = true;
    startTime = Date.now();

    updateCarPositions(0, 0);

    startCountdown(() => {
        gameActive = true;
        startTime = Date.now();
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
            countdownEl.innerText = "GO!";
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

typingInput.addEventListener('input', async () => {
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
            playerCharsCompleted = 0;
            playerVisualProgress = 0;
            currentSentence = await fetchSentence();
            totalRaceChars = currentSentence.length;
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
    const aiCPM = { 'easy': 140, 'medium': 280, 'hard': 480 }[difficulty];

    // Player progress
    let playerCorrectInSentence = 0;
    const val = typingInput.value;
    for (let i = 0; i < val.length; i++) {
        if (val[i] === currentSentence[i]) playerCorrectInSentence++;
        else break;
    }

    const playerTotalCorrect = playerCharsCompleted + playerCorrectInSentence;
    const playerActualProgress = Math.min(1, playerTotalCorrect / totalRaceChars);

    playerVisualProgress += (playerActualProgress - playerVisualProgress) * 0.1;

    // AI progress
    const aiTotalChars = (aiCPM * elapsedSeconds / 60);
    const aiActualProgress = Math.min(1, aiTotalChars / totalRaceChars);
    aiVisualProgress += (aiActualProgress - aiVisualProgress) * 0.1;

    const pLapProgress = (playerVisualProgress * totalLaps) % 1;
    const aLapProgress = (aiVisualProgress * totalLaps) % 1;

    updateCarPositions(pLapProgress, aLapProgress);

    if (gameMode === 'race' && aiActualProgress >= 1) {
        winRace('ai');
    } else {
        requestAnimationFrame(updateGame);
    }
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
        winnerText.innerText = "You Won!";
        winnerText.style.color = "#2ecc71";
    } else {
        winnerText.innerText = "AI Won!";
        winnerText.style.color = "#e74c3c";
    }

    document.getElementById('accuracy-val').innerText = accuracy;
    document.getElementById('cpm-val').innerText = cpm;
}

function resetGame() {
    location.reload();
}

setDifficulty('medium');
