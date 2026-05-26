let currentSentence = "";
let startTime;
let gameActive = false;
let difficulty = 'medium';
let totalCharsTyped = 0;
let errors = 0;

const playerCar = document.getElementById('player-car');
const aiCar = document.getElementById('ai-car');
const sentenceDisplay = document.getElementById('sentence-display');
const typingInput = document.getElementById('typing-input');
const resultsArea = document.getElementById('results');
const winnerText = document.getElementById('winner-text');

async function fetchSentence() {
    try {
        // Using a variety of sources or just one reliable one
        const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        const data = await response.json();
        return data.text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error("Error fetching sentence:", error);
        return "The quick brown fox jumps over the lazy dog."; // Fallback
    }
}

async function startGame(selectedDifficulty) {
    difficulty = selectedDifficulty;
    document.getElementById('difficulty-selection').style.display = 'none';
    document.getElementById('results').style.display = 'none';

    currentSentence = await fetchSentence();
    renderSentence("");

    document.getElementById('typing-area').style.display = 'block';
    typingInput.value = "";
    typingInput.disabled = false;
    typingInput.focus();

    totalCharsTyped = 0;
    errors = 0;
    gameActive = true;
    startTime = Date.now();

    playerCar.style.left = "0%";
    aiCar.style.left = "0%";

    requestAnimationFrame(updateGame);
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
                span.style.borderLeft = "2px solid #fff"; // Cursor
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

    // Check for errors
    if (val.length > 0 && val[val.length - 1] !== currentSentence[val.length - 1]) {
        errors++;
        flashError();
    }

    renderSentence(val);

    // Update player position based on correct characters at the start
    let correctLength = 0;
    for (let i = 0; i < val.length; i++) {
        if (val[i] === currentSentence[i]) {
            correctLength++;
        } else {
            break;
        }
    }

    const progress = correctLength / currentSentence.length;
    playerCar.style.left = (progress * 90) + "%";

    if (correctLength === currentSentence.length) {
        winRace('player');
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
    const aiProgress = (aiCPM / 60 * elapsedSeconds) / currentSentence.length;

    const aiPosition = Math.min(aiProgress * 90, 90);
    aiCar.style.left = aiPosition + "%";

    if (aiPosition >= 90) {
        winRace('ai');
    } else {
        requestAnimationFrame(updateGame);
    }
}

function winRace(winner) {
    if (!gameActive) return;
    gameActive = false;
    typingInput.disabled = true;

    const endTime = Date.now();
    const durationMinutes = (endTime - startTime) / 1000 / 60;
    const cpm = Math.round(typingInput.value.length / durationMinutes);
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
    document.getElementById('results').style.display = 'none';
    document.getElementById('typing-area').style.display = 'none';
    document.getElementById('difficulty-selection').style.display = 'block';
    playerCar.style.left = "0%";
    aiCar.style.left = "0%";
    typingInput.value = "";
}
