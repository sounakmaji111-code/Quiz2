(() => {

/* ==========================================================================
   0. CONFIGURATION (single source of truth for tunable numbers)
   ========================================================================== */
const CONFIG = {
    QUESTIONS_PER_QUIZ: 20,
    TIMER_SECONDS: 20,
    TIMER_WARNING_AT: 5,
    QUESTIONS_PER_LEVEL: 75
};

// Light obfuscation salt for the correct-answer index.
// This is NOT real security — anyone reading script.js in DevTools can still
// reverse it if they try. It just stops the answer from being plainly
// visible as "correct: 1" when someone skims the source.
const ANSWER_SALT = 7;
function encodeCorrect(idx) { return (idx + ANSWER_SALT) % 4; }
function decodeCorrect(k) { return (k - ANSWER_SALT + 400) % 4; }

/* ==========================================================================
   1. STATE ENGINE & DOM SELECTORS
   ========================================================================== */
const AppState = {
    mode: 'formative',
    level: 'kids',
    currentIndex: 0,
    score: 0,
    timer: null,
    timeLeft: CONFIG.TIMER_SECONDS,
    selectedOption: null,
    isLocked: false,
    activeSessionBank: [],   // each entry: { system, stem, options(shuffled), correct(shuffled index), rationale }
    systemScores: {}
};

const DOM = {
    views: {
        welcome: document.getElementById('view-welcome'),
        assessment: document.getElementById('view-assessment'),
        analytics: document.getElementById('view-analytics')
    },
    controls: {
        globalBack: document.getElementById('btn-global-back'),
        modeSelect: document.getElementById('testing-mode-select'),
        levelGrid: document.getElementById('level-select-grid'),
        initBtn: document.getElementById('btn-initialize-test'),
        submitBtn: document.getElementById('btn-submit-answer'),
        nextBtn: document.getElementById('btn-next-item'),
        finalizeBtn: document.getElementById('btn-finalize-exam'),
        restartBtn: document.getElementById('btn-restart-exam')
    },
    hud: {
        counter: document.getElementById('current-q-num'),
        timerBadge: document.getElementById('hud-timer-badge'),
        timerReadout: document.getElementById('timer-readout'),
        modeDisplay: document.getElementById('hud-mode-display'),
        progressBar: document.getElementById('hud-progress-bar'),
        systemBadge: document.getElementById('hud-system-badge')
    },
    stage: {
        stem: document.getElementById('question-stem-text'),
        matrix: document.getElementById('options-matrix')
    },
    drawer: {
        container: document.getElementById('rationale-drawer'),
        pill: document.getElementById('verdict-pill'),
        text: document.getElementById('rationale-text')
    }
};

/* ==========================================================================
   2. LEVEL SELECTOR WIRING
   ========================================================================== */
DOM.controls.levelGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.level-card');
    if (!card) return;
    DOM.controls.levelGrid.querySelectorAll('.level-card').forEach(c => c.setAttribute('aria-checked', 'false'));
    card.setAttribute('aria-checked', 'true');
    AppState.level = card.dataset.level;
});

/* ==========================================================================
   3. SHUFFLE HELPERS
   ========================================================================== */
// Generic Fisher-Yates shuffle — used for picking the session's question set.
function shuffleArray(sourceArr) {
    let clone = [...sourceArr];
    for (let i = clone.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
}

// Takes a raw question (options in fixed authored order + obfuscated correct
// index) and returns a NEW object with options shuffled and the correct
// index remapped to match. This is what prevents "always pick B" from
// working — the correct answer's position is randomized per play-through.
function shuffleQuestionOptions(rawQuestion) {
    const trueCorrectIdx = decodeCorrect(rawQuestion.k);
    const indices = [0, 1, 2, 3];
    const shuffledIndices = shuffleArray(indices);

    const newOptions = shuffledIndices.map(origIdx => rawQuestion.options[origIdx]);
    const newCorrectIdx = shuffledIndices.indexOf(trueCorrectIdx);

    return {
        system: rawQuestion.system,
        stem: rawQuestion.stem,
        options: newOptions,
        correct: newCorrectIdx,
        rationale: rawQuestion.rationale
    };
}

/* ==========================================================================
   4. TIMER & GAME LOOP LOGIC
   ========================================================================== */
function startTimer() {
    clearInterval(AppState.timer);
    AppState.timeLeft = CONFIG.TIMER_SECONDS;
    DOM.hud.timerReadout.innerText = `${CONFIG.TIMER_SECONDS}s`;
    DOM.hud.timerBadge.className = "hud-timer-badge";

    AppState.timer = setInterval(() => {
        AppState.timeLeft--;
        DOM.hud.timerReadout.innerText = `${AppState.timeLeft}s`;

        if (AppState.timeLeft === CONFIG.TIMER_WARNING_AT) DOM.hud.timerBadge.classList.add('timer-warning');
        if (AppState.timeLeft <= 0) {
            clearInterval(AppState.timer);
            handleTimeExpiration();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(AppState.timer);
    DOM.hud.timerBadge.classList.remove('timer-warning');
}

function handleTimeExpiration() {
    AppState.isLocked = true;
    DOM.hud.timerBadge.className = "hud-timer-badge timer-expired";
    DOM.hud.timerReadout.innerText = "EXP";

    const allOptions = DOM.stage.matrix.querySelectorAll('.quiz-option');
    allOptions.forEach(opt => opt.disabled = true);
    DOM.controls.submitBtn.disabled = true;

    const currentItem = AppState.activeSessionBank[AppState.currentIndex];
    recordSystemScore(currentItem.system, false);

    if (AppState.mode === 'formative') {
        allOptions[currentItem.correct].classList.add('state-correct');
        DOM.drawer.pill.className = "verdict-pill is-wrong";
        DOM.drawer.pill.innerText = "⏱️ Time's Up!";
        DOM.drawer.text.innerHTML = `<strong>Too slow!</strong> The best answer was: <em>"${currentItem.options[currentItem.correct]}"</em>.<br><br>${currentItem.rationale}`;
        DOM.drawer.container.style.display = 'block';
        showNavigation();
    } else {
        setTimeout(advanceItem, 1500);
    }
}

/* ==========================================================================
   5. ASSESSMENT INIT & RENDERING
   ========================================================================== */
function initializeAssessment() {
    AppState.mode = DOM.controls.modeSelect.value;

    // Pull only this level's 75-question pool, shuffle it, slice the session size,
    // then shuffle each question's OPTIONS individually so answer position
    // can never be guessed by clicking the same letter every time.
    const levelPool = QUESTION_BANK[AppState.level];
    const shuffledPool = shuffleArray(levelPool);
    const sessionRaw = shuffledPool.slice(0, CONFIG.QUESTIONS_PER_QUIZ);
    AppState.activeSessionBank = sessionRaw.map(shuffleQuestionOptions);

    AppState.currentIndex = 0;
    AppState.score = 0;
    AppState.systemScores = {};

    DOM.hud.modeDisplay.innerText = AppState.mode === 'formative' ? "Learn & Play" : "Challenge Mode";
    switchView(DOM.views.assessment);
    renderActiveCard();
}

function renderActiveCard() {
    AppState.isLocked = false;
    AppState.selectedOption = null;
    DOM.drawer.container.style.display = 'none';
    DOM.controls.submitBtn.disabled = true;
    DOM.controls.nextBtn.classList.add('hidden');
    DOM.controls.finalizeBtn.classList.add('hidden');

    const currentQ = AppState.activeSessionBank[AppState.currentIndex];

    DOM.hud.counter.innerText = AppState.currentIndex + 1;
    DOM.hud.systemBadge.innerText = `🏷️ ${currentQ.system}`;
    DOM.hud.progressBar.style.width = `${((AppState.currentIndex + 1) / CONFIG.QUESTIONS_PER_QUIZ) * 100}%`;

    DOM.stage.stem.innerText = currentQ.stem;
    DOM.stage.matrix.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    currentQ.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.innerHTML = `<span class="option-index-key">${letters[idx]}</span><span>${optText}</span>`;
        btn.addEventListener('click', () => selectOption(idx, btn));
        DOM.stage.matrix.appendChild(btn);
    });

    startTimer();
}

function selectOption(idx, btn) {
    if (AppState.isLocked) return;
    DOM.stage.matrix.querySelectorAll('.quiz-option').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');
    AppState.selectedOption = idx;
    DOM.controls.submitBtn.disabled = false;
}

function submitAnswer() {
    if (AppState.selectedOption === null || AppState.isLocked) return;
    stopTimer();
    AppState.isLocked = true;
    DOM.controls.submitBtn.disabled = true;

    const currentQ = AppState.activeSessionBank[AppState.currentIndex];
    const isCorrect = (AppState.selectedOption === currentQ.correct);

    recordSystemScore(currentQ.system, isCorrect);
    if (isCorrect) AppState.score++;

    const opts = DOM.stage.matrix.querySelectorAll('.quiz-option');
    opts.forEach(opt => opt.disabled = true);

    if (AppState.mode === 'formative') {
        opts[currentQ.correct].classList.add('state-correct');
        if (!isCorrect) opts[AppState.selectedOption].classList.add('state-wrong');

        DOM.drawer.pill.className = isCorrect ? "verdict-pill is-correct" : "verdict-pill is-wrong";
        DOM.drawer.pill.innerText = isCorrect ? "Spot On! 🎉" : "Not Quite! 🤔";
        DOM.drawer.text.innerHTML = currentQ.rationale;
        DOM.drawer.container.style.display = 'block';
        showNavigation();
    } else {
        advanceItem();
    }
}

function showNavigation() {
    if (AppState.currentIndex < CONFIG.QUESTIONS_PER_QUIZ - 1) DOM.controls.nextBtn.classList.remove('hidden');
    else DOM.controls.finalizeBtn.classList.remove('hidden');
}

function advanceItem() {
    if (AppState.currentIndex < CONFIG.QUESTIONS_PER_QUIZ - 1) {
        AppState.currentIndex++;
        renderActiveCard();
    } else concludeExamination();
}

function recordSystemScore(sys, correct) {
    if (!AppState.systemScores[sys]) AppState.systemScores[sys] = { total: 0, correct: 0 };
    AppState.systemScores[sys].total++;
    if (correct) AppState.systemScores[sys].correct++;
}

function concludeExamination() {
    stopTimer();
    document.getElementById('final-raw-score').innerText = AppState.score;

    const title = document.getElementById('mastery-tier-title');
    const desc = document.getElementById('mastery-tier-desc');
    const grid = document.getElementById('systemic-breakdown-grid');

    if (AppState.score >= 18) { title.innerText = "Anatomy Superstar! 🌟"; desc.innerText = "Amazing job! You know the human body inside and out!"; }
    else if (AppState.score >= 14) { title.innerText = "Body Explorer! 🗺️"; desc.innerText = "Great job! You're well on your way to mastering human anatomy."; }
    else { title.innerText = "Curious Apprentice! 🌱"; desc.innerText = "Good try! Keep exploring the 3D Atlas to level up your brain power."; }

    grid.innerHTML = '';
    Object.keys(AppState.systemScores).forEach(s => {
        const d = AppState.systemScores[s];
        grid.innerHTML += `<div class="system-score-card"><span class="system-name">${s}</span><span class="system-stat">${d.correct}/${d.total} (${Math.round((d.correct/d.total)*100)}%)</span></div>`;
    });

    switchView(DOM.views.analytics);
}

function switchView(v) {
    Object.values(DOM.views).forEach(screen => screen.classList.remove('active-screen'));
    v.classList.add('active-screen');
    window.scrollTo(0, 0);
}

/* ==========================================================================
   6. QUESTION_BANK — filled in across the next parts as:
      QUESTION_BANK = { kids: [...75], highschool: [...75], advanced: [...75] }
      Each raw question: { system, stem, options: [4 strings in authored order], k: encodeCorrect(idx), rationale }
   ========================================================================== */
const QUESTION_BANK = {
    kids: [
        // -- filled in Part 4 onward --
    ],
    highschool: [
        // -- filled in later parts --
    ],
    advanced: [
        // -- filled in later parts --
    ]
};

// (App launcher / event bindings come in the final part, after the question bank is complete)

})();
