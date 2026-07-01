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
    /* ---- BONES & SKELETON (15) ---- */
    {
        system: "Bones & Skeleton",
        stem: "How many bones does a grown-up human body have?",
        options: ["100 bones", "206 bones", "350 bones", "500 bones"],
        k: 0,
        rationale: "Adults have exactly 206 bones! Babies start with about 300, but many fuse together as you grow up."
    },
    {
        system: "Bones & Skeleton",
        stem: "Which bone protects your brain like a hard helmet?",
        options: ["The ribcage", "The kneecap", "The skull", "The spine"],
        k: 1,
        rationale: "Your skull is made of several bones fused together to create a super-strong helmet that keeps your precious brain safe!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What is the longest bone in your whole body?",
        options: ["Arm bone", "Shin bone", "Thigh bone", "Foot bone"],
        k: 1,
        rationale: "The thigh bone (femur) is the longest and strongest bone in your body. It goes from your hip all the way down to your knee!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What do we call the place where two bones meet and let you bend?",
        options: ["A muscle", "A joint", "A nerve", "A vein"],
        k: 0,
        rationale: "Joints are the clever hinges of your body! Without them you couldn't bend your knees, elbows, or fingers."
    },
    {
        system: "Bones & Skeleton",
        stem: "What is inside your big bones that makes red blood cells?",
        options: ["Jelly beans", "Water", "Bone marrow", "Air"],
        k: 1,
        rationale: "Bone marrow is like a tiny factory inside your bones that works non-stop making millions of new red blood cells every second!"
    },
    {
        system: "Bones & Skeleton",
        stem: "Which food helps build strong, hard bones?",
        options: ["Candy", "Chips", "Milk and cheese", "Soda"],
        k: 1,
        rationale: "Milk, cheese, and yogurt are packed with calcium — the mineral that makes your bones hard and strong like concrete!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What is the name of your backbone that runs down the middle of your back?",
        options: ["The sternum", "The spine", "The pelvis", "The femur"],
        k: 0,
        rationale: "Your spine is a stack of 33 ring-shaped bones. It holds you upright and protects the big bundle of nerves running down your back!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What smooth, rubbery material stops your bones from grinding together?",
        options: ["Skin", "Fat", "Cartilage", "Muscle"],
        k: 1,
        rationale: "Cartilage is super slippery! It covers the ends of your bones so they glide smoothly. Your ears and nose tip are also made of cartilage."
    },
    {
        system: "Bones & Skeleton",
        stem: "What is the name of the round bone that covers the front of your knee?",
        options: ["Patella", "Fibula", "Radius", "Tibia"],
        k: 3,
        rationale: "The patella (kneecap) acts like a little shield protecting your knee joint. It also helps your leg muscles work more powerfully when you kick!"
    },
    {
        system: "Bones & Skeleton",
        stem: "The bones of your fingers and toes have a special name. What is it?",
        options: ["Carpals", "Tarsals", "Phalanges", "Metatarsals"],
        k: 1,
        rationale: "You have 14 phalanges in each hand and 14 in each foot. They let you pick things up, write, and grip your favorite toys!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What connects one bone to another bone across a joint?",
        options: ["Tendons", "Ligaments", "Muscles", "Cartilage"],
        k: 0,
        rationale: "Ligaments are strong, stretchy bands that hold bones together. Remember: Ligaments link bone to bone!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What is the flat bone in the middle of your chest called?",
        options: ["Clavicle", "Scapula", "Sternum", "Humerus"],
        k: 1,
        rationale: "The sternum (breastbone) is shaped like a flat tie and sits right in the middle of your chest, connecting your ribs together."
    },
    {
        system: "Bones & Skeleton",
        stem: "Which bone in your body can you NOT move on purpose?",
        options: ["Your finger bone", "Your knee", "Your skull bones", "Your elbow"],
        k: 1,
        rationale: "All the bones of your skull are locked tightly together — except your lower jaw! The skull can't move because it needs to stay firm to protect your brain."
    },
    {
        system: "Bones & Skeleton",
        stem: "What are the flat, wing-shaped bones on your upper back called?",
        options: ["Shoulder blades", "Hip bones", "Collar bones", "Wrist bones"],
        k: 3,
        rationale: "Your shoulder blades (scapulae) slide around on your back when you move your arms, giving your shoulder muscles a wide surface to pull against!"
    },
    {
        system: "Bones & Skeleton",
        stem: "What is the tiny tailbone at the very bottom of your spine called?",
        options: ["Sacrum", "Atlas", "Coccyx", "Axis"],
        k: 1,
        rationale: "The coccyx is your tiny tailbone made of a few small fused bones. It's actually the leftover trace of a tail from our ancient evolutionary ancestors!"
    },

    /* ---- MUSCLES (15) ---- */
    {
        system: "Muscles",
        stem: "Roughly how many muscles do you have in your body?",
        options: ["Over 600", "Exactly 100", "About 30", "Over 2000"],
        k: 3,
        rationale: "You have over 600 muscles! They make up about 40% of your body weight and help you do everything from blinking your eyes to jumping as high as you can!"
    },
    {
        system: "Muscles",
        stem: "Which muscle never ever stops working, even when you are sleeping?",
        options: ["Your arm muscle", "Your leg muscle", "Your tummy muscle", "Your heart muscle"],
        k: 2,
        rationale: "Your heart is a special muscle that beats over 100,000 times every single day without ever taking a break — not even for a single second!"
    },
    {
        system: "Muscles",
        stem: "What do we call the strong cords that tie your muscles to your bones?",
        options: ["Ligaments", "Nerves", "Tendons", "Veins"],
        k: 1,
        rationale: "Tendons are like strong ropes that attach muscles to bones. When a muscle contracts and gets shorter, it pulls the tendon, which moves the bone!"
    },
    {
        system: "Muscles",
        stem: "When you flex your arm to show your muscles, which muscle makes the bump?",
        options: ["Triceps", "Deltoid", "Biceps", "Hamstring"],
        k: 1,
        rationale: "The biceps muscle on the front of your upper arm makes that famous bump when you flex! The word biceps means 'two heads' because it has two parts."
    },
    {
        system: "Muscles",
        stem: "What does your body do with your muscles when you are cold to make heat?",
        options: ["Stretches them", "Shakes and shivers them", "Grows new ones", "Shrinks them"],
        k: 0,
        rationale: "Shivering is your body's built-in heater! Your muscles shake really fast to create warmth when you're feeling chilly."
    },
    {
        system: "Muscles",
        stem: "Which is the biggest muscle in your whole body?",
        options: ["Arm muscle", "Chest muscle", "Bottom muscle", "Calf muscle"],
        k: 1,
        rationale: "Your gluteus maximus (bottom muscle) is the biggest! It needs to be super strong because it keeps your whole upper body standing tall and upright."
    },
    {
        system: "Muscles",
        stem: "Can muscles push bones, or can they only pull bones?",
        options: ["Only push", "Only pull", "Both push and pull", "Neither"],
        k: 0,
        rationale: "Muscles can only pull! That's why they work in pairs — one muscle pulls the bone one way, and the opposite muscle pulls it back the other way."
    },
    {
        system: "Muscles",
        stem: "Which big flat muscle below your lungs helps you breathe in?",
        options: ["Abdominals", "Diaphragm", "Trapezius", "Quadriceps"],
        k: 0,
        rationale: "The diaphragm is your main breathing muscle! When it flattens down, it creates space for your lungs to fill with air. When it spasms, you get hiccups!"
    },
    {
        system: "Muscles",
        stem: "What happens to your muscles if you exercise them regularly?",
        options: ["They disappear", "They get thinner", "They get bigger and stronger", "They turn to bone"],
        k: 1,
        rationale: "Exercise creates tiny micro-tears in your muscle fibres. When they heal, they grow back thicker and stronger — that's how your muscles get bigger over time!"
    },
    {
        system: "Muscles",
        stem: "What type of muscle automatically moves food through your stomach without you thinking about it?",
        options: ["Skeletal muscle", "Smooth muscle", "Heart muscle", "Arm muscle"],
        k: 0,
        rationale: "Smooth muscle works on autopilot inside your organs! You never have to think about moving food through your stomach — your smooth muscles just do it automatically."
    },
    {
        system: "Muscles",
        stem: "Which muscle on the back of your ankle is the thickest, strongest tendon in your body?",
        options: ["The Achilles tendon", "The kneecap tendon", "The hip tendon", "The shoulder tendon"],
        k: 3,
        rationale: "The Achilles tendon connects your calf muscle to your heel bone. It's named after the Greek hero Achilles and lets you push off the ground when you run and jump!"
    },
    {
        system: "Muscles",
        stem: "How many muscles does it take to smile?",
        options: ["Only 2", "About 17", "Exactly 50", "Over 100"],
        k: 0,
        rationale: "Smiling uses about 17 muscles in your face! Frowning actually uses more muscles, so smiling is the easier and happier choice!"
    },
    {
        system: "Muscles",
        stem: "What is the fastest-moving muscle in your body?",
        options: ["Your tongue", "Your eyelid", "Your finger", "Your toe"],
        k: 0,
        rationale: "Your eyelid blink muscle is lightning fast — it snaps shut in less than 1/100th of a second to protect your eye from dust and bright flashes!"
    },
    {
        system: "Muscles",
        stem: "What food nutrient helps your muscles grow and repair after exercise?",
        options: ["Sugar", "Fat", "Protein", "Vitamins"],
        k: 1,
        rationale: "Protein is the building block of muscles! Foods like eggs, chicken, fish, beans, and nuts give your muscles the materials they need to grow stronger."
    },
    {
        system: "Muscles",
        stem: "What do muscles burn to create energy for you to run and play?",
        options: ["Calcium", "Oxygen and glucose (sugar)", "Fat only", "Water only"],
        k: 0,
        rationale: "Your muscles mix glucose (sugar from food) with oxygen from breathing to make energy — like a tiny engine burning fuel to make your body move!"
    },

    /* ---- HEART & LUNGS (15) ---- */
    {
        system: "Heart & Lungs",
        stem: "About how big is your heart?",
        options: ["As big as your head", "As big as your fist", "As big as your foot", "As big as your thumb"],
        k: 0,
        rationale: "Your heart is roughly the same size as your closed fist! It sits snugly in the middle of your chest and grows right along with you."
    },
    {
        system: "Heart & Lungs",
        stem: "What does your heart do all day and all night?",
        options: ["Digests food", "Pumps blood around your body", "Sends nerve signals", "Makes hormones"],
        k: 0,
        rationale: "Your heart is a pumping superstar! It beats about 100,000 times a day, sending blood carrying oxygen and nutrients to every single cell in your body."
    },
    {
        system: "Heart & Lungs",
        stem: "What do your lungs collect from the air when you breathe in?",
        options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Water vapour"],
        k: 1,
        rationale: "Every breath you take pulls oxygen into your lungs. Your blood picks it up and delivers it to every cell in your body so they can make energy!"
    },
    {
        system: "Heart & Lungs",
        stem: "What gas do you breathe OUT of your lungs?",
        options: ["Oxygen", "Nitrogen", "Helium", "Carbon dioxide"],
        k: 2,
        rationale: "When your body uses oxygen to make energy, it produces carbon dioxide as a waste gas. Your lungs breathe it out — and plants love to absorb it!"
    },
    {
        system: "Heart & Lungs",
        stem: "What colour is your blood really inside your body?",
        options: ["Bright blue", "Dark red", "Clear", "Orange"],
        k: 0,
        rationale: "Your blood is always red — never blue! Blood carrying lots of oxygen is bright red, and blood that has given its oxygen away turns a darker red."
    },
    {
        system: "Heart & Lungs",
        stem: "What are the tubes called that carry blood AWAY from your heart?",
        options: ["Veins", "Arteries", "Capillaries", "Tendons"],
        k: 0,
        rationale: "Arteries carry blood away from the heart! They have thick walls because the heart pushes blood into them with a strong squeeze."
    },
    {
        system: "Heart & Lungs",
        stem: "What are the tubes called that carry blood BACK to your heart?",
        options: ["Arteries", "Veins", "Nerves", "Capillaries"],
        k: 0,
        rationale: "Veins return tired blood back to your heart. They have one-way valves inside them so blood can't flow backwards down your legs!"
    },
    {
        system: "Heart & Lungs",
        stem: "How many lungs do you have?",
        options: ["One", "Two", "Three", "Four"],
        k: 0,
        rationale: "You have two lungs — a left and a right! Your left lung is slightly smaller than the right one to make room for your heart sitting next to it."
    },
    {
        system: "Heart & Lungs",
        stem: "When you feel your pulse at your wrist, what are you actually feeling?",
        options: ["Your bones tapping", "Your arteries bouncing with each heartbeat", "Your nerves tingling", "Your muscles twitching"],
        k: 0,
        rationale: "Every time your heart beats it pushes a wave of blood through your arteries, making them bulge slightly. You can feel that gentle bounce as your pulse!"
    },
    {
        system: "Heart & Lungs",
        stem: "What is the name of your main windpipe that carries air down to your lungs?",
        options: ["Esophagus", "Trachea", "Larynx", "Pharynx"],
        k: 0,
        rationale: "Your trachea has stiff C-shaped rings of cartilage keeping it open like a flexible vacuum hose so air can always flow freely down to your lungs!"
    },
    {
        system: "Heart & Lungs",
        stem: "What are the tiny air sacs inside your lungs where oxygen enters your blood?",
        options: ["Bronchi", "Alveoli", "Capillaries", "Ventricles"],
        k: 0,
        rationale: "You have about 600 million alveoli in your lungs! These tiny balloon-like sacs have super thin walls so oxygen can easily pass through into your blood."
    },
    {
        system: "Heart & Lungs",
        stem: "What clever flap snaps shut over your windpipe when you swallow food?",
        options: ["The uvula", "The epiglottis", "The tonsil", "The tongue"],
        k: 0,
        rationale: "The epiglottis is like a trapdoor! Every time you swallow it flips down over your windpipe so food goes down your food pipe instead of into your lungs."
    },
    {
        system: "Heart & Lungs",
        stem: "How many chambers (rooms) does your heart have?",
        options: ["Two", "Three", "Four", "Six"],
        k: 1,
        rationale: "Your heart has four chambers — two on top (atria) to receive incoming blood, and two on the bottom (ventricles) to pump blood out to your body and lungs!"
    },
    {
        system: "Heart & Lungs",
        stem: "Which type of blood cell carries oxygen around your body?",
        options: ["White blood cells", "Red blood cells", "Platelets", "Plasma"],
        k: 0,
        rationale: "Red blood cells are packed with a special protein called haemoglobin that grabs onto oxygen and carries it like little delivery parcels to every cell in your body!"
    },
    {
        system: "Heart & Lungs",
        stem: "What sticks together to plug a cut and stop you from bleeding?",
        options: ["Red blood cells", "White blood cells", "Platelets", "Plasma"],
        k: 1,
        rationale: "Platelets are tiny cell fragments that rush to any cut and clump together to build a sticky plug — that's what eventually forms the scab you see on a scrape!"
    },

    /* ---- DIGESTION (15) ---- */
    {
        system: "Digestion",
        stem: "Where does digestion start?",
        options: ["In your stomach", "In your mouth", "In your intestines", "In your throat"],
        k: 0,
        rationale: "Digestion begins the moment you take a bite! Your teeth chew food into smaller pieces and your saliva starts breaking it down straight away."
    },
    {
        system: "Digestion",
        stem: "What does your stomach make to help break down food?",
        options: ["Saliva", "Bile", "Stomach acid", "Blood"],
        k: 1,
        rationale: "Your stomach makes a very strong acid that breaks food down into a liquid mush. A special layer of slime protects your stomach walls from being burned by its own acid!"
    },
    {
        system: "Digestion",
        stem: "What is the long twisty tube that absorbs nutrients from your food?",
        options: ["Large intestine", "Small intestine", "Esophagus", "Stomach"],
        k: 0,
        rationale: "Your small intestine is actually over 20 feet long even though it is narrow! It absorbs almost all the vitamins and nutrients from your food."
    },
    {
        system: "Digestion",
        stem: "What is the main job of the large intestine?",
        options: ["Make stomach acid", "Absorb water from waste", "Produce bile", "Chew food"],
        k: 0,
        rationale: "The large intestine is like a water recycling machine! It soaks up leftover water from your food waste so your body stays hydrated."
    },
    {
        system: "Digestion",
        stem: "Which organ cleans your blood and does over 500 jobs at once?",
        options: ["Kidneys", "Stomach", "Liver", "Pancreas"],
        k: 1,
        rationale: "Your liver is an amazing multitasker! It filters toxins out of your blood, stores energy, and produces bile to help digest fatty foods."
    },
    {
        system: "Digestion",
        stem: "What liquid does the liver make to break down fatty foods like butter and cheese?",
        options: ["Saliva", "Bile", "Acid", "Insulin"],
        k: 0,
        rationale: "Bile is a green liquid that works exactly like dish soap — it breaks big globs of fat into tiny droplets so your body can absorb them easily!"
    },
    {
        system: "Digestion",
        stem: "What is the name of the food pipe that carries food from your mouth down to your stomach?",
        options: ["Trachea", "Esophagus", "Urethra", "Intestine"],
        k: 0,
        rationale: "The esophagus squeezes food down to your stomach using wave-like muscle movements. It's so powerful it can push food down even if you were hanging upside down!"
    },
    {
        system: "Digestion",
        stem: "What is the watery liquid in your mouth that starts digestion?",
        options: ["Bile", "Acid", "Saliva", "Plasma"],
        k: 1,
        rationale: "Saliva keeps your mouth moist, contains enzymes that begin breaking down food, and makes food slippery enough to swallow. You make about 1-2 litres every day!"
    },
    {
        system: "Digestion",
        stem: "What are the tiny finger-like bumps inside your small intestine that absorb nutrients?",
        options: ["Cilia", "Villi", "Alveoli", "Pores"],
        k: 0,
        rationale: "Villi are millions of tiny absorbing bumps that give your intestine as much surface area as a whole tennis court — making sure nothing good goes to waste!"
    },
    {
        system: "Digestion",
        stem: "Which organ sits beside your stomach and makes insulin to control sugar levels?",
        options: ["The liver", "The pancreas", "The gallbladder", "The spleen"],
        k: 0,
        rationale: "The pancreas does two big jobs! It makes digestive enzymes to break down food, and produces insulin to keep your blood sugar at a healthy level."
    },
    {
        system: "Digestion",
        stem: "About how long does it take for food to travel all the way through your digestive system?",
        options: ["10 minutes", "1 hour", "24 to 72 hours", "One week"],
        k: 1,
        rationale: "Digestion is a slow journey! While food leaves your stomach after a few hours, it can take up to three whole days to complete the full trip through your intestines."
    },
    {
        system: "Digestion",
        stem: "What is the hardest substance your body makes?",
        options: ["Bone", "Fingernail", "Tooth enamel", "Cartilage"],
        k: 1,
        rationale: "Tooth enamel is even harder than bone! It coats the outside of your teeth to protect them while you chew tough and crunchy foods."
    },
    {
        system: "Digestion",
        stem: "What causes the rumbling sound in your tummy when you're hungry?",
        options: ["Your bones grinding", "Air and juices moving through empty intestines", "Your heart beating", "Your blood flowing"],
        k: 0,
        rationale: "When your stomach and intestines are empty, the muscles still squeeze automatically — and that makes the gurgling and rumbling sound you hear when you're hungry!"
    },
    {
        system: "Digestion",
        stem: "What do your kidneys produce to flush waste out of your body?",
        options: ["Bile", "Saliva", "Urine (pee)", "Sweat"],
        k: 1,
        rationale: "Your two kidneys filter your entire blood supply about 40 times every day, removing waste and extra water to make yellow urine stored in your bladder!"
    },
    {
        system: "Digestion",
        stem: "When you burp after drinking fizzy soda, where does the burp come from?",
        options: ["Your lungs", "Your stomach", "Your intestines", "Your throat"],
        k: 0,
        rationale: "Fizzy drinks are full of carbon dioxide bubbles! The bubbles collect in your stomach until the top opens up and lets them escape as a big burp!"
    },

    /* ---- BRAIN & SENSES (15) ---- */
    {
        system: "Brain & Senses",
        stem: "What is the name of the amazing organ inside your head that controls everything you do?",
        options: ["The heart", "The liver", "The brain", "The stomach"],
        k: 1,
        rationale: "Your brain is your body's supercomputer! It controls your thoughts, movements, feelings, and automatically runs all your vital body functions."
    },
    {
        system: "Brain & Senses",
        stem: "How many senses do humans have?",
        options: ["Three", "Four", "Five", "Seven"],
        k: 1,
        rationale: "The five main senses are sight, hearing, smell, taste, and touch! Each one collects information from the world around you and sends it to your brain."
    },
    {
        system: "Brain & Senses",
        stem: "What do your eyes use to let in light?",
        options: ["The iris", "The pupil", "The cornea", "The retina"],
        k: 0,
        rationale: "Your pupil is the dark circle in the middle of your eye. It's actually an opening that gets bigger in the dark to let in more light and smaller in bright sunshine!"
    },
    {
        system: "Brain & Senses",
        stem: "What is the coloured ring around your pupil called?",
        options: ["Cornea", "Retina", "Iris", "Lens"],
        k: 1,
        rationale: "Your iris can be blue, green, brown, hazel, or grey — no two people have the exact same iris pattern! It controls how much light enters your eye."
    },
    {
        system: "Brain & Senses",
        stem: "Which body part do you use to hear sounds?",
        options: ["Your nose", "Your eyes", "Your ears", "Your tongue"],
        k: 1,
        rationale: "Sound waves travel into your ear canal and make your eardrum vibrate. Those vibrations are turned into signals that your brain understands as sound!"
    },
    {
        system: "Brain & Senses",
        stem: "What are the tiny bumps on your tongue that detect flavours called?",
        options: ["Villi", "Taste buds", "Papillae", "Cilia"],
        k: 0,
        rationale: "You have around 10,000 taste buds spread across your tongue! They can detect sweet, salty, sour, bitter, and savoury flavours."
    },
    {
        system: "Brain & Senses",
        stem: "What connects your brain to the rest of your body through your spine?",
        options: ["Spinal cord", "Backbone", "Aorta", "Trachea"],
        k: 3,
        rationale: "The spinal cord is a thick bundle of nerves running through your backbone. It carries messages from your brain to your muscles and brings information back up!"
    },
    {
        system: "Brain & Senses",
        stem: "Why does food taste boring when you have a blocked nose?",
        options: ["Your tongue stops working", "Taste and smell work together", "Your saliva dries up", "Your throat swells shut"],
        k: 0,
        rationale: "Most of what we call 'taste' is actually smell! When your nose is blocked, the aroma of food can't reach your smell receptors, so flavours seem dull and flat."
    },
    {
        system: "Brain & Senses",
        stem: "What part of the brain at the back of your head helps you keep your balance?",
        options: ["Cerebrum", "Brainstem", "Cerebellum", "Amygdala"],
        k: 1,
        rationale: "The cerebellum fine-tunes all your movements and keeps you balanced. Without it you would wobble and stumble trying to walk in a straight line!"
    },
    {
        system: "Brain & Senses",
        stem: "Why do you blink your eyes without thinking about it?",
        options: ["To rest your eyeballs", "To spread tears and clean your eyes", "To focus on objects", "To let in more light"],
        k: 0,
        rationale: "You blink about 15-20 times a minute automatically! Each blink coats your eye with a fresh layer of tears that washes away dust and keeps your vision crystal clear."
    },
    {
        system: "Brain & Senses",
        stem: "What are the tiny nerve cells in your brain called?",
        options: ["Neurons", "Nephrons", "Platelets", "Alveoli"],
        k: 3,
        rationale: "You have billions of neurons in your brain! They send tiny electrical signals to each other at incredible speeds, creating every thought and feeling you have."
    },
    {
        system: "Brain & Senses",
        stem: "Which part of your brain is in charge of your feelings like happiness and fear?",
        options: ["Cerebrum", "Brainstem", "Cerebellum", "Amygdala"],
        k: 2,
        rationale: "The amygdala is a tiny almond-shaped cluster deep in your brain that acts as your emotional alarm system — responsible for making you feel happy, scared, or excited!"
    },
    {
        system: "Brain & Senses",
        stem: "How fast can nerve signals travel in your body?",
        options: ["As fast as a walking pace", "As fast as a bicycle", "As fast as a racing car", "At the speed of light"],
        k: 1,
        rationale: "The fastest nerve signals in your body travel at up to 270 miles per hour — faster than a racing car! That's how you react so quickly when something touches you."
    },
    {
        system: "Brain & Senses",
        stem: "What covers your entire body, protects you from germs, and keeps your insides safe?",
        options: ["Muscles", "Fat", "Skin", "Hair"],
        k: 1,
        rationale: "Your skin is actually the largest organ in your whole body! It's your personal waterproof armour, keeping germs out and moisture in."
    },
    {
        system: "Brain & Senses",
        stem: "When a doctor taps your knee and your leg kicks on its own, what is that called?",
        options: ["A habit", "A reflex", "A muscle cramp", "A nerve buzz"],
        k: 0,
        rationale: "A reflex is an automatic response your spinal cord sends out without waiting for your brain! It's your body's emergency fast-track system to protect you from harm."
    },
],
    highschool: [
    /* ---- SKELETAL SYSTEM (15) ---- */
    {
        system: "Skeletal System",
        stem: "What type of bone tissue has a spongy, lattice-like structure found inside large bones?",
        options: ["Compact bone", "Cartilage", "Cancellous (spongy) bone", "Periosteum"],
        k: 1,
        rationale: "Cancellous (spongy) bone has a honeycomb-like structure that makes bones lightweight yet strong. The spaces within it are filled with red bone marrow that produces blood cells."
    },
    {
        system: "Skeletal System",
        stem: "What is the periosteum?",
        options: ["The inner cavity of a bone", "A tough fibrous membrane covering the outer surface of bones", "The cartilage at bone ends", "The marrow inside bones"],
        k: 0,
        rationale: "The periosteum is a dense membrane that wraps around the outside of bones. It contains blood vessels, nerves, and bone-forming cells called osteoblasts that are vital for growth and repair."
    },
    {
        system: "Skeletal System",
        stem: "Which type of joint allows rotation only, such as turning your head from side to side?",
        options: ["Ball-and-socket joint", "Hinge joint", "Pivot joint", "Saddle joint"],
        k: 1,
        rationale: "A pivot joint allows one bone to rotate around another. The joint between the first two cervical vertebrae (atlas and axis) is a classic example, letting you shake your head 'no'."
    },
    {
        system: "Skeletal System",
        stem: "What is ossification?",
        options: ["The process of bone fracturing", "The process by which cartilage is gradually replaced by bone tissue", "The removal of calcium from bones", "The surgical repair of broken bones"],
        k: 0,
        rationale: "Ossification is how bones form and grow. Most of the skeleton starts as cartilage in a developing embryo, which is then slowly replaced by hard bone tissue through this process."
    },
    {
        system: "Skeletal System",
        stem: "Which cells are responsible for building and depositing new bone tissue?",
        options: ["Osteoclasts", "Osteoblasts", "Chondrocytes", "Osteocytes"],
        k: 0,
        rationale: "Osteoblasts are bone-building cells that secrete collagen and minerals to form new bone matrix. Once surrounded by matrix they become osteocytes, which maintain the existing bone."
    },
    {
        system: "Skeletal System",
        stem: "Which cells break down old bone tissue to allow continuous bone remodelling?",
        options: ["Osteoblasts", "Chondrocytes", "Osteoclasts", "Fibroblasts"],
        k: 1,
        rationale: "Osteoclasts are large cells that dissolve bone mineral and matrix. They work alongside osteoblasts in a constant cycle of resorption and deposition that keeps bones healthy and responsive."
    },
    {
        system: "Skeletal System",
        stem: "Which vitamin acts like a hormone to regulate calcium absorption and is critical for bone health?",
        options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
        k: 1,
        rationale: "Vitamin D is converted in the body into a hormone that promotes calcium absorption from the gut and its incorporation into bone. Deficiency in children causes rickets — soft, bowed bones."
    },
    {
        system: "Skeletal System",
        stem: "The vertebral column is divided into how many named regions?",
        options: ["Three", "Four", "Five", "Seven"],
        k: 1,
        rationale: "The spine has five regions: cervical (neck, 7 vertebrae), thoracic (mid-back, 12), lumbar (lower back, 5), sacral (fused, 5), and coccygeal (tailbone, 3-5 fused bones)."
    },
    {
        system: "Skeletal System",
        stem: "What is the correct anatomical term for freely movable joints such as the knee and shoulder?",
        options: ["Synarthroses", "Amphiarthroses", "Diarthroses", "Gomphoses"],
        k: 1,
        rationale: "Diarthroses (synovial joints) are freely movable joints lubricated by synovial fluid. Synarthroses are fixed joints like skull sutures, and amphiarthroses allow limited movement like the pubic symphysis."
    },
    {
        system: "Skeletal System",
        stem: "In adults, where is red bone marrow primarily found?",
        options: ["Inside the shaft of long bones", "In flat bones and the ends of long bones", "Only within the femur", "Exclusively within cartilage"],
        k: 0,
        rationale: "In adults, active red marrow producing blood cells is found mainly in flat bones like the sternum, pelvis, ribs, and skull, plus the epiphyses (ends) of some long bones."
    },
    {
        system: "Skeletal System",
        stem: "What tissue makes up the epiphyseal (growth) plate in developing bones?",
        options: ["Compact bone", "Hyaline cartilage", "Fibrocartilage", "Elastic cartilage"],
        k: 0,
        rationale: "Growth plates are made of hyaline cartilage. New cartilage cells are produced on one side while cartilage on the other side is replaced by bone, causing bones to lengthen during childhood."
    },
    {
        system: "Skeletal System",
        stem: "Which vitamin deficiency causes softening and weakening of bones in children, leading to bowed legs?",
        options: ["Vitamin A", "Vitamin C", "Vitamin K", "Vitamin D"],
        k: 2,
        rationale: "Rickets is caused by Vitamin D deficiency. Without enough Vitamin D, the intestines cannot absorb sufficient calcium, so bones fail to mineralise properly and become soft and deformed."
    },
    {
        system: "Skeletal System",
        stem: "The thoracic cage is formed by the ribs, thoracic vertebrae, and which other structure?",
        options: ["Clavicle", "Scapula", "Sternum", "Humerus"],
        k: 1,
        rationale: "The sternum (breastbone) forms the front wall of the thoracic cage. The ribs attach to it at the front and to the thoracic vertebrae at the back, forming a protective barrel around the heart and lungs."
    },
    {
        system: "Skeletal System",
        stem: "What type of cartilage makes up the intervertebral discs between vertebrae?",
        options: ["Hyaline cartilage", "Elastic cartilage", "Fibrocartilage", "Calcified cartilage"],
        k: 1,
        rationale: "Fibrocartilage is tough and highly resistant to compression, making it ideal for intervertebral discs that absorb the enormous forces placed on the spine during daily movement."
    },
    {
        system: "Skeletal System",
        stem: "How many pairs of ribs does the human body have in total?",
        options: ["10 pairs", "11 pairs", "12 pairs", "14 pairs"],
        k: 1,
        rationale: "Humans have 12 pairs of ribs. The top 7 pairs are 'true ribs' attached directly to the sternum. Pairs 8-10 are 'false ribs' and pairs 11-12 are 'floating ribs' with no front attachment."
    },

    /* ---- MUSCULAR SYSTEM (15) ---- */
    {
        system: "Muscular System",
        stem: "What is the basic functional contractile unit of a skeletal muscle fibre?",
        options: ["Myofibril", "Sarcomere", "Actin filament", "Motor unit"],
        k: 0,
        rationale: "The sarcomere is the fundamental unit of muscle contraction. It runs from one Z-line to the next and contains overlapping thick (myosin) and thin (actin) filaments that slide past each other during contraction."
    },
    {
        system: "Muscular System",
        stem: "According to the sliding filament theory, which two proteins interact to produce muscle contraction?",
        options: ["Collagen and elastin", "Myosin and actin", "Keratin and fibrin", "Tropomyosin and titin"],
        k: 0,
        rationale: "Myosin heads (thick filaments) repeatedly attach to actin (thin filaments), pivot, and pull them inward. This shortens the sarcomere and creates the pulling force of muscle contraction."
    },
    {
        system: "Muscular System",
        stem: "Which ion is released from the sarcoplasmic reticulum to trigger muscle contraction?",
        options: ["Sodium (Na+)", "Potassium (K+)", "Calcium (Ca2+)", "Magnesium (Mg2+)"],
        k: 1,
        rationale: "When a nerve impulse arrives, calcium floods out of the sarcoplasmic reticulum. It binds to troponin on the actin filament, which moves tropomyosin aside and exposes binding sites for myosin heads."
    },
    {
        system: "Muscular System",
        stem: "What is a motor unit?",
        options: ["A single muscle fibre", "A motor neuron and all the muscle fibres it controls", "The sarcomere within a myofibril", "The neuromuscular junction alone"],
        k: 0,
        rationale: "When one motor neuron fires, all the muscle fibres it connects to contract simultaneously — this is the motor unit. Precise movements use small motor units; powerful movements recruit large ones."
    },
    {
        system: "Muscular System",
        stem: "What primarily causes muscle fatigue during intense exercise?",
        options: ["Complete oxygen depletion in the blood", "Depletion of ATP and accumulation of metabolic byproducts", "Muscle fibres dying permanently", "Tendons stretching beyond their limit"],
        k: 0,
        rationale: "Fatigue results from reduced ATP availability, accumulation of inorganic phosphate, hydrogen ions (lowering pH), and other metabolic waste products that interfere with the contractile mechanism."
    },
    {
        system: "Muscular System",
        stem: "Which type of contraction occurs when a muscle generates tension but does not change in length?",
        options: ["Isotonic concentric", "Isotonic eccentric", "Isometric", "Isokinetic"],
        k: 1,
        rationale: "An isometric contraction produces force without joint movement — like pushing against a wall. Isotonic contractions involve movement: concentric shortens the muscle, eccentric lengthens it under load."
    },
    {
        system: "Muscular System",
        stem: "What is the neuromuscular junction?",
        options: ["The point where two muscles attach to each other", "The site where a motor neuron communicates with a muscle fibre", "The tendon insertion point on bone", "The Z-line boundary of a sarcomere"],
        k: 0,
        rationale: "The neuromuscular junction is a specialised synapse between a motor neuron terminal and a muscle fibre. Neurotransmitters released here trigger the electrical signal that starts contraction."
    },
    {
        system: "Muscular System",
        stem: "Which neurotransmitter is released at the neuromuscular junction to initiate muscle contraction?",
        options: ["Dopamine", "Serotonin", "Acetylcholine", "Norepinephrine"],
        k: 1,
        rationale: "Acetylcholine (ACh) is released from the motor neuron terminal into the synaptic cleft. It binds to receptors on the muscle membrane, generating an action potential that triggers contraction."
    },
    {
        system: "Muscular System",
        stem: "What is DOMS (Delayed Onset Muscle Soreness)?",
        options: ["A chronic muscle wasting disease", "Pain and stiffness felt 24-72 hours after unfamiliar exercise due to microscopic muscle damage and inflammation", "Immediate cramping experienced during peak exercise", "Permanent muscle inflammation requiring medical treatment"],
        k: 0,
        rationale: "DOMS is caused by microscopic tears in muscle fibres and connective tissue following eccentric exercise or unaccustomed training. The resulting inflammation and repair process causes the familiar ache."
    },
    {
        system: "Muscular System",
        stem: "Slow-twitch (Type I) muscle fibres are best suited for which type of activity?",
        options: ["Explosive short-distance sprinting", "Heavy one-rep maximum weightlifting", "Long-duration endurance activities like marathon running", "Quick reflex-based actions"],
        k: 1,
        rationale: "Type I fibres are rich in mitochondria and myoglobin, have excellent blood supply, and are highly fatigue-resistant. They rely on aerobic metabolism, making them perfect for sustained endurance activities."
    },
    {
        system: "Muscular System",
        stem: "Fast-twitch (Type II) muscle fibres are primarily characterised by which feature?",
        options: ["High endurance and extreme fatigue resistance", "Slow contraction speed suitable for posture", "High myoglobin content giving them a red colour", "Rapid, powerful contractions with relatively quick fatigability"],
        k: 2,
        rationale: "Type II fibres contract quickly and powerfully using anaerobic glycolysis for rapid ATP production. However, they fatigue quickly because they generate lactic acid and have fewer mitochondria."
    },
    {
        system: "Muscular System",
        stem: "What is the 'origin' of a skeletal muscle?",
        options: ["The attachment point on the bone that moves", "The stationary attachment point on the fixed bone", "Where a muscle belly splits into two heads", "The point where muscle tissue transitions into tendon"],
        k: 0,
        rationale: "The origin is where a muscle attaches to the relatively fixed bone. The insertion is on the bone that moves. When the muscle contracts, the insertion moves toward the origin."
    },
    {
        system: "Muscular System",
        stem: "What is muscular hypertrophy?",
        options: ["Muscle wasting due to prolonged inactivity", "An increase in the cross-sectional size of individual muscle fibres from resistance training", "The development of entirely new muscle fibres", "Chronic muscle inflammation following injury"],
        k: 0,
        rationale: "Hypertrophy is an increase in muscle fibre diameter. Resistance training causes micro-damage, and repair adds more myofibrils and contractile protein, making each fibre thicker and the whole muscle larger."
    },
    {
        system: "Muscular System",
        stem: "Which energy system provides immediate fuel for the first few seconds of maximal explosive effort?",
        options: ["Aerobic oxidative system", "Anaerobic glycolytic system", "Phosphocreatine (ATP-PC) system", "Fat oxidation system"],
        k: 1,
        rationale: "The ATP-PC system uses stored ATP and phosphocreatine to regenerate ATP almost instantly. It powers maximum efforts like jumping or sprinting for roughly 8-10 seconds before other systems must take over."
    },
    {
        system: "Muscular System",
        stem: "What is the primary role of the sarcoplasmic reticulum in muscle cells?",
        options: ["To produce ATP needed for contraction", "To store and release calcium ions that initiate contraction", "To synthesise structural muscle proteins", "To conduct the electrical action potential along the fibre"],
        k: 0,
        rationale: "The sarcoplasmic reticulum is a specialised endoplasmic reticulum that wraps around myofibrils. It stores calcium at rest and releases it upon stimulation, which is the trigger for the contraction cycle."
    },

    /* ---- HEART & LUNGS (15) ---- */
    {
        system: "Heart & Lungs",
        stem: "What is cardiac output?",
        options: ["The pressure of blood within the arteries", "The volume of blood the heart pumps out per minute", "The rate of oxygen exchange across alveoli", "The electrical activity pattern of the heart"],
        k: 0,
        rationale: "Cardiac output = heart rate × stroke volume. At rest it is about 5 litres per minute. During intense exercise it can rise to 20-25 litres per minute in trained athletes."
    },
    {
        system: "Heart & Lungs",
        stem: "What is the sinoatrial (SA) node?",
        options: ["A valve preventing backflow between the atria and ventricles", "The heart's natural pacemaker that initiates each electrical heartbeat", "A blood vessel that supplies the heart muscle with oxygen", "The outermost protective layer of the heart wall"],
        k: 0,
        rationale: "The SA node is a cluster of specialised cells in the right atrium that spontaneously generates electrical impulses about 60-100 times per minute, setting the heart's natural rhythm."
    },
    {
        system: "Heart & Lungs",
        stem: "Which blood vessels supply the heart muscle itself with oxygenated blood?",
        options: ["Pulmonary arteries", "Aortic arch branches", "Coronary arteries", "Jugular veins"],
        k: 1,
        rationale: "The coronary arteries branch from the base of the aorta and supply the heart muscle (myocardium). Blockage of these arteries causes a heart attack (myocardial infarction)."
    },
    {
        system: "Heart & Lungs",
        stem: "What does systolic blood pressure measure?",
        options: ["The arterial pressure when the heart muscle is relaxed", "The mathematical average of systolic and diastolic pressures", "The arterial pressure generated when the heart contracts and ejects blood", "The pressure within the pulmonary circulation"],
        k: 1,
        rationale: "Systolic pressure is the peak arterial pressure reached during ventricular contraction. Diastolic is the lower pressure during relaxation. A normal reading is around 120/80 mmHg."
    },
    {
        system: "Heart & Lungs",
        stem: "What is the function of the bicuspid (mitral) valve?",
        options: ["Prevents backflow from the aorta into the left ventricle", "Prevents backflow from the left ventricle into the left atrium", "Prevents backflow from the pulmonary artery into the right ventricle", "Prevents backflow from the right ventricle into the right atrium"],
        k: 0,
        rationale: "The bicuspid (mitral) valve sits between the left atrium and left ventricle. It snaps shut when the ventricle contracts, preventing oxygenated blood from flowing backwards toward the lungs."
    },
    {
        system: "Heart & Lungs",
        stem: "During gas exchange in the alveoli, oxygen moves from air into the blood by which process?",
        options: ["Active transport requiring ATP", "Osmosis driven by water pressure", "Diffusion down a concentration gradient", "Filtration driven by blood pressure"],
        k: 1,
        rationale: "Oxygen diffuses passively from areas of high concentration in the alveolar air into the surrounding capillary blood where concentration is lower. No energy is required — it follows its own gradient."
    },
    {
        system: "Heart & Lungs",
        stem: "What is tidal volume?",
        options: ["The maximum total capacity of both lungs combined", "The volume of air remaining after a maximum forced exhalation", "The volume of air inhaled or exhaled during one normal resting breath", "The maximum volume of air forcefully exhaled after a deep breath"],
        k: 1,
        rationale: "Tidal volume at rest is approximately 500 mL per breath. It increases significantly during exercise as the body demands more oxygen and needs to expel more carbon dioxide."
    },
    {
        system: "Heart & Lungs",
        stem: "What is the role of pulmonary surfactant?",
        options: ["To kill bacteria that enter the airways", "To transport oxygen molecules within alveolar fluid", "To reduce surface tension inside alveoli, preventing them from collapsing", "To warm and humidify air entering the lungs"],
        k: 1,
        rationale: "Surfactant is produced by Type II alveolar cells. Without it, the surface tension of the water lining alveoli would cause them to collapse with each exhalation — a condition seen in premature infants."
    },
    {
        system: "Heart & Lungs",
        stem: "Adult haemoglobin is made up of how many polypeptide chains?",
        options: ["Two", "Three", "Four", "Six"],
        k: 1,
        rationale: "Adult haemoglobin (HbA) consists of four polypeptide chains — two alpha and two beta. Each chain carries one haem group containing an iron atom that can bind one oxygen molecule, giving four O2 per haemoglobin."
    },
    {
        system: "Heart & Lungs",
        stem: "What is the Bohr effect?",
        options: ["The increase in heart rate in response to aerobic exercise", "The rightward shift of the oxygen-haemoglobin dissociation curve caused by increased CO2 and lower pH", "The age-related decline in lung capacity", "The reflex control of breathing rate by CO2 chemoreceptors"],
        k: 0,
        rationale: "The Bohr effect means haemoglobin releases oxygen more readily in tissues with high CO2 and low pH (like active muscles). This perfectly matches oxygen delivery to where it is needed most."
    },
    {
        system: "Heart & Lungs",
        stem: "Which brain region contains the respiratory centres that automatically control breathing rhythm?",
        options: ["Cerebral cortex", "Cerebellum", "Medulla oblongata", "Hypothalamus"],
        k: 1,
        rationale: "The medulla oblongata houses the dorsal and ventral respiratory groups that set the basic breathing rhythm. The pons fine-tunes it. CO2 levels in the blood are the primary driver of breathing rate."
    },
    {
        system: "Heart & Lungs",
        stem: "What is a normal resting heart rate range for a healthy adult?",
        options: ["40-50 bpm", "60-100 bpm", "100-120 bpm", "120-140 bpm"],
        k: 0,
        rationale: "60-100 beats per minute is the normal resting range. Highly trained endurance athletes often have resting rates of 40-50 bpm because their stronger hearts pump more blood per beat."
    },
    {
        system: "Heart & Lungs",
        stem: "What is erythropoiesis?",
        options: ["The destruction and recycling of old red blood cells", "The production of new red blood cells in the bone marrow", "The clotting cascade at a wound site", "The binding of oxygen to haemoglobin in the lungs"],
        k: 0,
        rationale: "Erythropoiesis occurs mainly in red bone marrow and is stimulated by the hormone erythropoietin (EPO) released by the kidneys when blood oxygen levels fall — for example at high altitude."
    },
    {
        system: "Heart & Lungs",
        stem: "What structure separates the left and right sides of the heart?",
        options: ["The pericardium", "The pleura", "The septum", "The myocardium"],
        k: 1,
        rationale: "The septum is a thick muscular wall dividing the heart into right and left halves. This separation ensures oxygenated and deoxygenated blood never mix during normal circulation."
    },
    {
        system: "Heart & Lungs",
        stem: "What is the name of the large vein that returns deoxygenated blood from the lower body to the right atrium?",
        options: ["Superior vena cava", "Pulmonary vein", "Inferior vena cava", "Coronary sinus"],
        k: 1,
        rationale: "The inferior vena cava drains blood from the lower body, while the superior vena cava drains the upper body and head. Both empty into the right atrium. Pulmonary veins, unusually, carry oxygenated blood."
    },

    /* ---- DIGESTION (15) ---- */
    {
        system: "Digestion",
        stem: "What is the chemical name for the acid produced by the stomach?",
        options: ["Sulfuric acid", "Hydrochloric acid", "Citric acid", "Carbonic acid"],
        k: 0,
        rationale: "Gastric glands secrete hydrochloric acid (HCl), creating a stomach pH of 1.5-3.5. This denatures proteins, activates pepsinogen into pepsin, and kills most ingested bacteria."
    },
    {
        system: "Digestion",
        stem: "Which enzyme found in saliva begins the chemical digestion of carbohydrates in the mouth?",
        options: ["Pepsin", "Lipase", "Salivary amylase", "Trypsin"],
        k: 1,
        rationale: "Salivary amylase begins breaking starch (polysaccharides) into smaller maltose units in the mouth. This is why starchy food like bread tastes slightly sweet if you chew it for a long time."
    },
    {
        system: "Digestion",
        stem: "Which specialised cells in the stomach lining secrete hydrochloric acid?",
        options: ["Chief cells", "Parietal cells", "Goblet cells", "G cells"],
        k: 0,
        rationale: "Parietal cells (oxyntic cells) in the gastric glands secrete both HCl and intrinsic factor. Chief cells secrete pepsinogen, and G cells produce the hormone gastrin which stimulates acid secretion."
    },
    {
        system: "Digestion",
        stem: "What is the primary role of pepsin in digestion?",
        options: ["Breaks down carbohydrates in the stomach", "Breaks down proteins into smaller peptide fragments in the stomach", "Emulsifies fat droplets in the small intestine", "Neutralises stomach acid as it enters the duodenum"],
        k: 0,
        rationale: "Pepsin is a protease enzyme active in the acidic environment of the stomach. It is secreted as inactive pepsinogen by chief cells and activated by HCl, preventing it from digesting the stomach itself."
    },
    {
        system: "Digestion",
        stem: "What is enterohepatic circulation?",
        options: ["Portal blood flow from intestines to the liver", "The recycling of bile salts between the liver, bile ducts, small intestine, and back to the liver", "The arterial blood supply to the entire GI tract", "The nerve supply from the enteric nervous system to the intestines"],
        k: 0,
        rationale: "About 95% of bile salts secreted into the small intestine are reabsorbed in the terminal ileum and returned to the liver for reuse. This highly efficient recycling means the body needs to synthesise little new bile."
    },
    {
        system: "Digestion",
        stem: "Which hormone triggers the gallbladder to contract and release bile into the small intestine?",
        options: ["Gastrin", "Secretin", "Cholecystokinin (CCK)", "Insulin"],
        k: 1,
        rationale: "CCK is released by cells in the duodenal wall in response to fat and protein. It stimulates gallbladder contraction, relaxes the sphincter of Oddi, and also triggers pancreatic enzyme secretion."
    },
    {
        system: "Digestion",
        stem: "What is the brush border of the small intestine?",
        options: ["A protective mucus layer coating the intestinal wall", "Densely packed microvilli on enterocyte surfaces that enormously increase the absorptive surface area", "The smooth muscle layer responsible for peristaltic contractions", "A layer of mucus-secreting goblet cells lining the intestinal wall"],
        k: 0,
        rationale: "Each epithelial cell (enterocyte) has around 3,000 microvilli on its apical surface forming the brush border. This increases the total absorptive surface of the small intestine to approximately the size of a tennis court."
    },
    {
        system: "Digestion",
        stem: "Where are fat-soluble vitamins (A, D, E, K) primarily absorbed in the digestive tract?",
        options: ["In the stomach with gastric acid", "In the large intestine by bacterial action", "In the small intestine with the aid of bile salts and micelles", "In the mouth through the buccal mucosa"],
        k: 1,
        rationale: "Fat-soluble vitamins are packaged into micelles (tiny fat-bile complexes) in the small intestine and absorbed through the intestinal wall into lymphatic vessels (lacteals) rather than directly into blood."
    },
    {
        system: "Digestion",
        stem: "What is the function of the ileocecal valve?",
        options: ["Controls the rate of chyme release from the stomach into the duodenum", "Prevents backflow of large intestine contents into the small intestine", "Regulates the release of bile into the duodenum", "Separates the jejunum from the ileum"],
        k: 0,
        rationale: "The ileocecal valve sits at the junction of the small and large intestines. It acts as a one-way gate preventing bacteria-rich colonic contents from contaminating the small intestine."
    },
    {
        system: "Digestion",
        stem: "Which macronutrient begins chemical digestion first — in the mouth?",
        options: ["Proteins", "Fats", "Carbohydrates", "Vitamins and minerals"],
        k: 1,
        rationale: "Salivary amylase immediately begins breaking down starch molecules as soon as food enters the mouth. Protein digestion starts in the stomach, and fat digestion mainly occurs in the small intestine."
    },
    {
        system: "Digestion",
        stem: "What is the hepatic portal system?",
        options: ["The bile duct network draining from liver to intestine", "The network of veins carrying nutrient-rich blood from the intestines directly to the liver for processing", "The arterial supply bringing oxygenated blood to the liver", "The lymphatic vessels draining absorbed fats from the gut"],
        k: 0,
        rationale: "After absorption, nutrients pass into the hepatic portal vein and travel to the liver first. The liver can store, transform, detoxify, or redistribute them before they reach general circulation."
    },
    {
        system: "Digestion",
        stem: "What causes acid reflux (heartburn)?",
        options: ["Excess bile flooding back into the stomach", "Gastric acid rising into the oesophagus due to a weakened lower oesophageal sphincter", "Spasm of the pyloric sphincter trapping acid", "Bacterial infection of the stomach lining"],
        k: 0,
        rationale: "The lower oesophageal sphincter normally prevents stomach contents from rising. When it is weak or relaxes inappropriately, acidic chyme enters the oesophagus, causing the burning sensation of heartburn."
    },
    {
        system: "Digestion",
        stem: "What is the primary site of dietary iron absorption in the gastrointestinal tract?",
        options: ["Stomach", "Duodenum and upper jejunum", "Ileum", "Large intestine"],
        k: 0,
        rationale: "Iron is mainly absorbed in the duodenum and proximal jejunum. Vitamin C enhances absorption by keeping iron in its more absorbable ferrous (Fe2+) form. Deficiency causes iron-deficiency anaemia."
    },
    {
        system: "Digestion",
        stem: "Which intestinal cells are primarily responsible for absorbing digested nutrients?",
        options: ["Goblet cells", "Enterocytes", "Paneth cells", "Enteroendocrine cells"],
        k: 0,
        rationale: "Enterocytes are the absorptive epithelial cells lining the small intestinal villi. They transport amino acids, monosaccharides, fatty acids, vitamins, and minerals into blood or lymph."
    },
    {
        system: "Digestion",
        stem: "What is the role of intrinsic factor, produced by parietal cells of the stomach?",
        options: ["It converts pepsinogen into active pepsin", "It neutralises acid as it enters the duodenum", "It is essential for the absorption of vitamin B12 in the terminal ileum", "It stimulates bile production in the liver"],
        k: 1,
        rationale: "Intrinsic factor is a glycoprotein that binds vitamin B12 (cobalamin) in the stomach and escorts it to the terminal ileum where it can be absorbed. Without intrinsic factor, B12 deficiency and pernicious anaemia result."
    },

    /* ---- BRAIN & SENSES (15) ---- */
    {
        system: "Brain & Senses",
        stem: "What are the three protective membranes that enclose the brain and spinal cord collectively called?",
        options: ["Pleura", "Peritoneum", "Meninges", "Pericardium"],
        k: 1,
        rationale: "The three meningeal layers from outside to inside are: dura mater (tough), arachnoid mater (web-like), and pia mater (thin, directly touching the brain). Meningitis is inflammation of these membranes."
    },
    {
        system: "Brain & Senses",
        stem: "What is the primary function of the myelin sheath surrounding nerve axons?",
        options: ["To supply glucose and nutrients directly to the nerve cell body", "To link adjacent neurons across synaptic gaps", "To electrically insulate the axon and dramatically speed up nerve impulse conduction", "To produce and store neurotransmitters for release"],
        k: 1,
        rationale: "Myelin allows saltatory conduction — the impulse leaps between gaps in myelin (nodes of Ranvier) rather than travelling continuously. This increases conduction speed from about 1 m/s to up to 120 m/s."
    },
    {
        system: "Brain & Senses",
        stem: "What is the typical resting membrane potential of a neuron?",
        options: ["+70 mV", "0 mV", "-70 mV", "-140 mV"],
        k: 1,
        rationale: "At rest, the inside of a neuron is about -70 mV relative to the outside, maintained by the sodium-potassium pump. Depolarisation to threshold (-55 mV) triggers an action potential."
    },
    {
        system: "Brain & Senses",
        stem: "What occurs during a nerve action potential?",
        options: ["Calcium ions flow into the cell triggering neurotransmitter release at the dendrites", "Sodium ions rapidly enter the cell causing depolarisation, followed by potassium exiting to repolarise the membrane", "Dopamine is released into the synapse causing the next neuron to fire", "The myelin sheath contracts to physically squeeze the signal along"],
        k: 0,
        rationale: "An action potential is an all-or-nothing electrical event. Voltage-gated Na+ channels open (depolarisation), then K+ channels open (repolarisation), briefly overshooting to hyperpolarisation before returning to rest."
    },
    {
        system: "Brain & Senses",
        stem: "Which cerebral lobe is primarily responsible for processing touch sensation and spatial awareness?",
        options: ["Frontal lobe", "Occipital lobe", "Temporal lobe", "Parietal lobe"],
        k: 2,
        rationale: "The parietal lobe contains the primary somatosensory cortex which maps touch, temperature, and pain from the body. It also integrates spatial information to help you know where your body parts are."
    },
    {
        system: "Brain & Senses",
        stem: "What is the primary role of the hypothalamus?",
        options: ["Direct voluntary control of skeletal muscle movement", "Processing and relaying visual information to the cortex", "Regulating homeostasis including body temperature, hunger, thirst, and circadian rhythms", "Forming and consolidating long-term explicit memories"],
        k: 1,
        rationale: "The hypothalamus is the master regulator of homeostasis. It controls the autonomic nervous system and pituitary gland, coordinating responses to temperature, hydration, hunger, stress, and sleep cycles."
    },
    {
        system: "Brain & Senses",
        stem: "What is the corpus callosum?",
        options: ["The folded outer layer of the cerebral hemispheres", "A massive band of white matter fibres connecting the left and right cerebral hemispheres", "The floor of the third and fourth brain ventricles", "The fibrous periosteum covering the exterior of the skull"],
        k: 0,
        rationale: "The corpus callosum is the largest white matter structure in the brain, containing about 200-250 million nerve fibres. It allows rapid communication and coordination between the two cerebral hemispheres."
    },
    {
        system: "Brain & Senses",
        stem: "Which neurotransmitter is most associated with the brain's reward, motivation, and pleasure circuits?",
        options: ["Acetylcholine", "Serotonin", "Dopamine", "GABA"],
        k: 1,
        rationale: "Dopamine is released in the mesolimbic pathway (reward circuit) in response to rewarding stimuli. Disruption of dopamine signalling is implicated in addiction, Parkinson's disease, and schizophrenia."
    },
    {
        system: "Brain & Senses",
        stem: "What is the blood-brain barrier?",
        options: ["The dura mater layer that mechanically shields the brain", "A highly selective barrier formed by specialised capillary endothelial cells that tightly regulates what enters the brain", "The cerebrospinal fluid cushion surrounding brain tissue", "The bony cranium protecting the brain from physical trauma"],
        k: 0,
        rationale: "The blood-brain barrier consists of tightly joined endothelial cells with no gaps. It permits oxygen, glucose, and some drugs to pass while blocking toxins, pathogens, and most large molecules from reaching neural tissue."
    },
    {
        system: "Brain & Senses",
        stem: "Which photoreceptor cells in the retina are specialised for detecting dim light and enabling night vision?",
        options: ["Cone cells", "Rod cells", "Ganglion cells", "Bipolar cells"],
        k: 0,
        rationale: "Rods are extremely light-sensitive and contain rhodopsin. There are about 120 million rods concentrated in the peripheral retina. They only detect light intensity, not colour, which is why night vision is greyscale."
    },
    {
        system: "Brain & Senses",
        stem: "What is the function of the semicircular canals in the inner ear?",
        options: ["Converting sound vibrations into nerve impulses for hearing", "Detecting rotational head movements to help maintain balance and spatial orientation", "Amplifying sound waves before they reach the cochlea", "Equalising air pressure between the inner and outer ear"],
        k: 0,
        rationale: "The three semicircular canals are arranged in perpendicular planes to detect rotation in any direction. Fluid movement within them bends hair cells, signalling rotational acceleration to the brain."
    },
    {
        system: "Brain & Senses",
        stem: "Which structure converts mechanical sound vibrations into electrical nerve impulses sent to the brain?",
        options: ["Semicircular canals", "Eardrum (tympanic membrane)", "Cochlea", "Ossicles (tiny ear bones)"],
        k: 1,
        rationale: "The cochlea is a fluid-filled, snail-shaped structure lined with thousands of hair cells that respond to different sound frequencies. Bending of these hairs generates electrical signals sent via the auditory nerve."
    },
    {
        system: "Brain & Senses",
        stem: "What does the autonomic nervous system primarily regulate?",
        options: ["Voluntary control of all skeletal muscles", "Conscious sensory processing in the cerebral cortex", "Involuntary body functions such as heart rate, digestion, glandular secretion, and smooth muscle activity", "Fine motor coordination and balance through the cerebellum"],
        k: 1,
        rationale: "The autonomic nervous system has two divisions: sympathetic (fight-or-flight) and parasympathetic (rest-and-digest). They act in opposition to regulate heart rate, breathing, digestion, and blood pressure automatically."
    },
    {
        system: "Brain & Senses",
        stem: "Which neurotransmitter is the brain's primary inhibitory signal, acting as a neural 'brake' to calm activity?",
        options: ["Glutamate", "Acetylcholine", "Norepinephrine", "GABA (gamma-aminobutyric acid)"],
        k: 2,
        rationale: "GABA is the main inhibitory neurotransmitter in the brain. It hyperpolarises neurons, making them less likely to fire. Many anxiolytic drugs like benzodiazepines work by enhancing GABA's inhibitory effects."
    },
    {
        system: "Brain & Senses",
        stem: "What is neuroplasticity?",
        options: ["The physical elasticity and flexibility of brain tissue itself", "The brain's ability to reorganise and form new neural connections in response to learning, experience, or injury throughout life", "The protective myelin coating that insulates neuron axons", "The natural process of neuronal cell death that accelerates with ageing"],
        k: 0,
        rationale: "Neuroplasticity underlies all learning and memory. When you practise a skill, synaptic connections strengthen (long-term potentiation). After brain injury, plasticity allows other regions to partially compensate for lost function."
    },
],
    advanced: [
        // -- filled in later parts --
    ]
};

// (App launcher / event bindings come in the final part, after the question bank is complete)

})();
