let currentSentence = "";
let startTime;
let gameActive = false;
let gameMode = 'race'; // 'race' or 'practice'
let difficulty = 'medium';
let totalCharsTyped = 0;
let errors = 0;
let currentLap = 1;
let totalLaps = 1;
let playerVisualProgress = 0; // For smooth car movement

const playerCar = document.getElementById('player-car');
const aiCar = document.getElementById('ai-car');
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
    document.querySelectorAll('#difficulty-selection button').forEach(btn => {
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
        return "The quick brown fox jumps over the lazy dog.";
    }
}

async function startGame(mode) {
    gameMode = mode;
    totalLaps = parseInt(document.getElementById('lap-select').value);

    document.getElementById('difficulty-selection').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    currentSentence = await fetchSentence();
    renderSentence("");

    document.getElementById('typing-area').style.display = 'block';
    lapCounter.style.display = 'block';
    currentLap = 1;
    updateLapUI();

    typingInput.value = "";
    typingInput.disabled = false;
    typingInput.focus();

    totalCharsTyped = 0;
    errors = 0;
    gameActive = true;
    startTime = Date.now();

    updateCarPositions(0, 0);
    requestAnimationFrame(updateGame);
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

    // Check if sentence complete
    if (val === currentSentence) {
        if (gameMode === 'practice') {
            currentSentence = await fetchSentence();
            typingInput.value = "";
            renderSentence("");
        } else {
            // In race mode, we might need multiple sentences for multiple laps,
            // or one long sentence per lap. Let's do one sentence per lap.
            if (currentLap < totalLaps) {
                currentLap++;
                updateLapUI();
                currentSentence = await fetchSentence();
                typingInput.value = "";
                playerVisualProgress = 0; // Reset visual for new lap
                renderSentence("");
            } else {
                winRace('player');
            }
        }
    }
});

function flashError() {
    sentenceDisplay.style.backgroundColor = "rgba(231, 76, 60, 0.3)";
    setTimeout(() => {
        sentenceDisplay.style.backgroundColor = "#2c3e50";
    }, 100);
}

function updateGame() {
    if (!gameActive) return;

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const aiCPM = { 'easy': 120, 'medium': 250, 'hard': 450 }[difficulty];

    // Player progress - smooth interpolation
    const actualLapProgress = typingInput.value.length / currentSentence.length;
    // Slowly move the car towards the actual typed progress for a "constantly moving" feel
    playerVisualProgress += (actualLapProgress - playerVisualProgress) * 0.1;

    // AI progress
    // We use a fixed duration based on difficulty for the AI to finish,
    // rather than guessing sentence lengths, for better balance.
    const secondsPerLap = { 'easy': 40, 'medium': 25, 'hard': 15 }[difficulty];
    const totalRaceTime = totalLaps * secondsPerLap;
    const aiProgress = elapsedSeconds / totalRaceTime;

    const aiLapProgress = (aiProgress * totalLaps) % 1;

    updateCarPositions(playerVisualProgress, aiLapProgress);

    if (gameMode === 'race' && aiProgress >= 1) {
        winRace('ai');
    } else {
        requestAnimationFrame(updateGame);
    }
}

function updateCarPositions(playerLapProgress, aiLapProgress) {
    const pPoint = trackPath.getPointAtLength(playerLapProgress * pathLength);
    const aPoint = trackPath.getPointAtLength(aiLapProgress * pathLength);

    // Approximate rotation by looking slightly ahead
    const pPointAhead = trackPath.getPointAtLength((playerLapProgress + 0.01) % 1 * pathLength);
    const aPointAhead = trackPath.getPointAtLength((aiLapProgress + 0.01) % 1 * pathLength);

    const pAngle = Math.atan2(pPointAhead.y - pPoint.y, pPointAhead.x - pPoint.x) * 180 / Math.PI;
    const aAngle = Math.atan2(aPointAhead.y - aPoint.y, aPointAhead.x - aPoint.x) * 180 / Math.PI;

    // Adjust offset for car size (30x50)
    // Adding 90deg base rotation because the cars in the spritesheet face UP
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

// Set default difficulty
setDifficulty('medium');
