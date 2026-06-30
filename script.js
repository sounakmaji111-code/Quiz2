(() => {
    /* ==========================================================================
       1. THE STATE ENGINE & DOM SELECTORS
       ========================================================================== */
    const AppState = {
        currentLevel: 'kids',
        currentIndex: 0,
        score: 0,
        timer: null,
        timeLeft: 20,
        isLocked: false
    };

    const DOM = {
        views: {
            welcome: document.getElementById('view-welcome'),
            assessment: document.getElementById('view-assessment'),
            analytics: document.getElementById('view-analytics')
        },
        display: {
            questionText: document.getElementById('question-text'),
            optionsContainer: document.getElementById('options-container'),
            timerDisplay: document.getElementById('timer-display')
        },
        controls: {
            levelKids: document.getElementById('btn-level-kids'),
            levelHS: document.getElementById('btn-level-hs'),
            levelAdv: document.getElementById('btn-level-adv'),
            restartBtn: document.getElementById('btn-restart')
        }
    };

    /* ==========================================================================
       2. THE 3-TIER QUESTION BANK (WE WILL FILL THIS IN NEXT!)
       ========================================================================== */
    const questionBank = {
        kids: [
            // [PASTE KIDS QUESTIONS HERE]
        ],
        
        highSchool: [
             // [PASTE HIGH SCHOOL QUESTIONS HERE]
        ],
        
        advanced: [
             // [PASTE ADVANCED QUESTIONS HERE]
        ]
    };

    /* ==========================================================================
       3. CORE UTILITIES (SHUFFLER & TIMER)
       ========================================================================== */
    function switchView(viewElement) {
        DOM.views.welcome.classList.add('hidden');
        DOM.views.assessment.classList.add('hidden');
        DOM.views.analytics.classList.add('hidden');
        viewElement.classList.remove('hidden');
    }

    // Fisher-Yates Shuffler
    function shuffleArray(array) {
        let shuffled = [...array]; 
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function startTimer() {
        AppState.timeLeft = 20;
        DOM.display.timerDisplay.innerText = AppState.timeLeft;
        AppState.timer = setInterval(() => {
            AppState.timeLeft--;
            DOM.display.timerDisplay.innerText = AppState.timeLeft;
            if (AppState.timeLeft <= 0) {
                clearInterval(AppState.timer);
                forceNextQuestion();
            }
        }, 1000);
    }

    /* ==========================================================================
       4. DYNAMIC RENDER ENGINE
       ========================================================================== */
    function renderQuestion() {
        AppState.isLocked = false;
        DOM.display.optionsContainer.innerHTML = '';
        
        const currentActiveBank = questionBank[AppState.currentLevel];
        const currentQuestion = currentActiveBank[AppState.currentIndex];
        
        DOM.display.questionText.innerText = currentQuestion.q;
        
        const scrambledOptions = shuffleArray(currentQuestion.options);
        
        scrambledOptions.forEach(optionText => {
            const btn = document.createElement('button');
            btn.classList.add('option-btn');
            btn.innerText = optionText;
            btn.addEventListener('click', () => handleSelection(btn, optionText, currentQuestion));
            DOM.display.optionsContainer.appendChild(btn);
        });
        
        startTimer();
    }

    /* ==========================================================================
       5. VALIDATION & SECURITY (BASE64)
       ========================================================================== */
    function handleSelection(btnElement, selectedText, questionObj) {
        if (AppState.isLocked) return;
        AppState.isLocked = true;
        clearInterval(AppState.timer);
        
        const encodedSelection = btoa(selectedText);
        
        if (encodedSelection === questionObj.answerCode) {
            btnElement.classList.add('correct');
            AppState.score += 10;
        } else {
            btnElement.classList.add('wrong');
        }
        
        setTimeout(forceNextQuestion, 1500);
    }

    function forceNextQuestion() {
        const currentActiveBank = questionBank[AppState.currentLevel];
        AppState.currentIndex++;
        
        if (AppState.currentIndex < currentActiveBank.length) {
            renderQuestion();
        } else {
            endGame();
        }
    }

    function endGame() {
        switchView(DOM.views.analytics);
        document.getElementById('final-score').innerText = AppState.score;
    }

    /* ==========================================================================
       6. INITIALIZATION & CLEANUP
       ========================================================================== */
    function launchGame(levelString) {
        AppState.currentLevel = levelString;
        AppState.score = 0;
        AppState.currentIndex = 0;
        switchView(DOM.views.assessment);
        renderQuestion();
    }

    DOM.controls.levelKids?.addEventListener('click', () => launchGame('kids'));
    DOM.controls.levelHS?.addEventListener('click', () => launchGame('highSchool'));
    DOM.controls.levelAdv?.addEventListener('click', () => launchGame('advanced'));
    
    DOM.controls.restartBtn?.addEventListener('click', () => {
        switchView(DOM.views.welcome);
    });

    window.addEventListener('beforeunload', () => clearInterval(AppState.timer));

})();

            { id: "k1", q: "What color is human blood inside your body?", options: ["Red", "Blue", "Green", "Yellow"], answerCode: "UmVk" },
            { id: "k2", q: "Which organ do you use to think?", options: ["Heart", "Stomach", "Brain", "Lungs"], answerCode: "QnJhaW4=" },
            { id: "k3", q: "Which organ pumps blood everywhere in your body?", options: ["Lungs", "Brain", "Liver", "Heart"], answerCode: "SGVhcnQ=" },
            { id: "k4", q: "What hard structures make up your skeleton?", options: ["Muscles", "Bones", "Skin", "Veins"], answerCode: "Qm9uZXM=" },
            { id: "k5", q: "What do you use to breathe in air?", options: ["Heart", "Kidneys", "Lungs", "Stomach"], answerCode: "THVuZ3M=" },
            { id: "k6", q: "What is the largest organ on the outside of your body?", options: ["Hair", "Nails", "Skin", "Eyes"], answerCode: "U2tpbg==" },
            { id: "k7", q: "Where does your food go after you swallow it?", options: ["Lungs", "Heart", "Stomach", "Brain"], answerCode: "U3RvbWFjaA==" },
            { id: "k8", q: "How many main senses do humans have?", options: ["Three", "Five", "Seven", "Ten"], answerCode: "Rml2ZQ==" },
            { id: "k9", q: "Which part of your body has a pupil and an iris?", options: ["Ears", "Nose", "Tongue", "Eyes"], answerCode: "RXllcw==" },
            { id: "k10", q: "What muscle in your mouth helps you taste food?", options: ["Lips", "Teeth", "Throat", "Tongue"], answerCode: "VG9uZ3Vl" },
            { id: "k11", q: "Which part of your body grows on your head?", options: ["Hair", "Teeth", "Nails", "Bone"], answerCode: "SGFpcg==" },
            { id: "k12", q: "What do you use to hear music?", options: ["Eyes", "Ears", "Nose", "Mouth"], answerCode: "RWFycw==" },
            { id: "k13", q: "What joint helps you bend your leg?", options: ["Elbow", "Shoulder", "Knee", "Ankle"], answerCode: "S25lZQ==" },
            { id: "k14", q: "What are the hard white things in your mouth used for chewing?", options: ["Lips", "Teeth", "Tongue", "Gums"], answerCode: "VGVldGg=" },
            { id: "k15", q: "What connects your head to your shoulders?", options: ["Back", "Neck", "Chest", "Waist"], answerCode: "TmVjaw==" },
            { id: "k16", q: "What is the red liquid inside your body?", options: ["Water", "Juice", "Blood", "Sweat"], answerCode: "Qmxvb2Q=" },
            { id: "k17", q: "Which finger is the thickest and shortest?", options: ["Pinky", "Index", "Thumb", "Ring"], answerCode: "VGh1bWI=" },
            { id: "k18", q: "What do you use to smell a flower?", options: ["Ears", "Eyes", "Mouth", "Nose"], answerCode: "Tm9zZQ==" },
            { id: "k19", q: "What do you use to walk and run?", options: ["Arms", "Legs", "Fingers", "Toes"], answerCode: "TGVncw==" },
            { id: "k20", q: "What is the joint in the middle of your arm called?", options: ["Knee", "Wrist", "Elbow", "Shoulder"], answerCode: "RWxib3c=" },
            { id: "k21", q: "What hard structure protects your brain?", options: ["Ribs", "Spine", "Skull", "Pelvis"], answerCode: "U2t1bGw=" },
            { id: "k22", q: "What do you use to grab and hold things?", options: ["Feet", "Hands", "Knees", "Elbows"], answerCode: "SGFuZHM=" },
            { id: "k23", q: "Which organ makes a rumbling sound when you are hungry?", options: ["Brain", "Lungs", "Stomach", "Heart"], answerCode: "U3RvbWFjaA==" },
            { id: "k24", q: "What do you blink to protect?", options: ["Ears", "Nose", "Mouth", "Eyes"], answerCode: "RXllcw==" },
            { id: "k25", q: "What grows on the ends of your fingers and toes?", options: ["Hair", "Nails", "Teeth", "Skin"], answerCode: "TmFpbHM=" },
            { id: "k26", q: "What is the soft part of your face right below your mouth?", options: ["Forehead", "Cheek", "Chin", "Nose"], answerCode: "Q2hpbg==" },
            { id: "k27", q: "What part of your body wears shoes?", options: ["Hands", "Ears", "Feet", "Knees"], answerCode: "RmVldA==" },
            { id: "k28", q: "What is the colored part of your eye called?", options: ["Pupil", "Lens", "Retina", "Iris"], answerCode: "SXJpcw==" },
            { id: "k29", q: "What part of your body needs a haircut?", options: ["Nails", "Hair", "Skin", "Teeth"], answerCode: "SGFpcg==" },
            { id: "k30", q: "Which part of the face helps you smile?", options: ["Nose", "Ears", "Eyes", "Mouth"], answerCode: "TW91dGg=" },
            { id: "k31", q: "What bones protect your heart like a cage?", options: ["Skull", "Spine", "Ribs", "Femur"], answerCode: "Umlicw==" },
            { id: "k32", q: "What do you call the lines of hair above your eyes?", options: ["Eyelashes", "Eyebrows", "Hair", "Beard"], answerCode: "RXllYnJvd3M=" },
            { id: "k33", q: "What part of your leg touches the ground?", options: ["Hand", "Foot", "Knee", "Elbow"], answerCode: "Rm9vdA==" },
            { id: "k34", q: "What helps your arms and legs bend?", options: ["Bones", "Skin", "Joints", "Blood"], answerCode: "Sm9pbnRz" },
            { id: "k35", q: "Which bones make up your backbone?", options: ["Ribs", "Skull", "Spine", "Pelvis"], answerCode: "U3BpbmU=" },
            { id: "k36", q: "What helps your bones move?", options: ["Hair", "Muscles", "Skin", "Blood"], answerCode: "TXVzY2xlcw==" },
            { id: "k37", q: "What is the little black circle in the center of your eye?", options: ["Iris", "Pupil", "Lens", "Retina"], answerCode: "UHVwaWw=" },
            { id: "k38", q: "What joint connects your foot to your leg?", options: ["Wrist", "Elbow", "Knee", "Ankle"], answerCode: "QW5rbGU=" },
            { id: "k39", q: "What is the front of your head called?", options: ["Back", "Face", "Neck", "Chest"], answerCode: "RmFjZQ==" },
            { id: "k40", q: "What liquid falls from your eyes when you cry?", options: ["Sweat", "Blood", "Tears", "Water"], answerCode: "VGVhcnM=" },
            { id: "k41", q: "What body part do you use to clap?", options: ["Feet", "Hands", "Knees", "Head"], answerCode: "SGFuZHM=" },
            { id: "k42", q: "What joins your hand to your arm?", options: ["Ankle", "Knee", "Elbow", "Wrist"], answerCode: "V3Jpc3Q=" },
            { id: "k43", q: "What takes air into your body when you take a deep breath?", options: ["Heart", "Stomach", "Lungs", "Brain"], answerCode: "THVuZ3M=" },
            { id: "k44", q: "What is the top part of your arm near your neck?", options: ["Elbow", "Wrist", "Shoulder", "Ankle"], answerCode: "U2hvdWxkZXI=" },
            { id: "k45", q: "What are the five little parts on the end of your foot called?", options: ["Fingers", "Toes", "Nails", "Knuckles"], answerCode: "VG9lcw==" },
            { id: "k46", q: "What is the soft red part on the outside of your mouth?", options: ["Gums", "Teeth", "Tongue", "Lips"], answerCode: "TGlwcw==" },
            { id: "k47", q: "What is the round tube in the front of your neck used for swallowing?", options: ["Brain", "Lungs", "Throat", "Heart"], answerCode: "VGhyb2F0" },
            { id: "k48", q: "What part of your face sits above your eyes and below your hair?", options: ["Chin", "Cheek", "Nose", "Forehead"], answerCode: "Rm9yZWhlYWQ=" },
            { id: "k49", q: "What are the five parts at the end of each hand?", options: ["Toes", "Fingers", "Wrists", "Elbows"], answerCode: "RmluZ2Vycw==" },
            { id: "k50", q: "What pink tissue holds your teeth in place?", options: ["Lips", "Tongue", "Gums", "Cheeks"], answerCode: "R3Vtcw==" }
                         { id: "k51", q: "What is the back part of your foot called?", options: ["Toe", "Heel", "Ankle", "Knee"], answerCode: "SGVlbA==" },
            { id: "k52", q: "What skin covers your eyes when you sleep?", options: ["Eyebrows", "Eyelashes", "Eyelids", "Cheeks"], answerCode: "RXllbGlkcw==" },
            { id: "k53", q: "Which organ beats like a drum inside your chest?", options: ["Heart", "Brain", "Liver", "Stomach"], answerCode: "SGVhcnQ=" },
            { id: "k54", q: "What is the bumpy bone running down the middle of your back?", options: ["Ribs", "Skull", "Spine", "Shoulder"], answerCode: "U3BpbmU=" },
            { id: "k55", q: "What hard white coating protects your teeth?", options: ["Enamel", "Skin", "Bone", "Ice"], answerCode: "RW5hbWVs" },
            { id: "k56", q: "What makes you strong enough to lift heavy things?", options: ["Fat", "Skin", "Muscle", "Hair"], answerCode: "TXVzY2xl" },
            { id: "k57", q: "What red liquid carries oxygen to all parts of your body?", options: ["Water", "Juice", "Blood", "Sweat"], answerCode: "Qmxvb2Q=" },
            { id: "k58", q: "What soft, wrinkly organ sits inside your skull?", options: ["Heart", "Lungs", "Brain", "Liver"], answerCode: "QnJhaW4=" },
            { id: "k59", q: "What body part helps you smell warm cookies?", options: ["Mouth", "Ears", "Nose", "Eyes"], answerCode: "Tm9zZQ==" },
            { id: "k60", q: "What happens to your lungs when you take a deep breath in?", options: ["They disappear", "They shrink", "They get smaller", "They get bigger"], answerCode: "VGhleSBnZXQgYmlnZ2Vy" },
            { id: "k61", q: "What does your stomach do when it is very hungry?", options: ["Singing", "Growling", "Laughing", "Crying"], answerCode: "R3Jvd2xpbmc=" },
            { id: "k62", q: "What body part on your head helps you keep your balance?", options: ["Ears", "Nose", "Eyes", "Mouth"], answerCode: "RWFycw==" },
            { id: "k63", q: "Which side of your chest is your heart mostly on?", options: ["Right", "Left", "Middle", "Back"], answerCode: "TGVmdA==" },
            { id: "k64", q: "What are the tiny hairs inside your nose meant for?", options: ["Catching dust", "Smelling", "Sneezing", "Tickling"], answerCode: "Q2F0Y2hpbmcgZHVzdA==" },
            { id: "k65", q: "What salty water comes out of your skin when you are very hot?", options: ["Tears", "Blood", "Sweat", "Rain"], answerCode: "U3dlYXQ=" },
            { id: "k66", q: "What is the soft middle part of your body where your belly button is?", options: ["Back", "Chest", "Belly", "Neck"], answerCode: "QmVsbHk=" },
            { id: "k67", q: "What body part is your thumb attached to?", options: ["Foot", "Hand", "Arm", "Leg"], answerCode: "SGFuZA==" },
            { id: "k68", q: "What is the very bottom point of your face called?", options: ["Forehead", "Cheek", "Nose", "Chin"], answerCode: "Q2hpbg==" },
            { id: "k69", q: "What part of your leg bends when you sit in a chair?", options: ["Ankle", "Hip", "Knee", "Toes"], answerCode: "S25lZQ==" },
            { id: "k70", q: "What covers your whole body like a tight, stretchy suit?", options: ["Clothes", "Skin", "Hair", "Muscles"], answerCode: "U2tpbg==" },
            { id: "k71", q: "What color should your teeth be if you brush them every day?", options: ["Yellow", "Brown", "White", "Gray"], answerCode: "V2hpdGU=" },
            { id: "k72", q: "What are the little blue and green tubes under your skin that carry blood?", options: ["Veins", "Bones", "Nerves", "Muscles"], answerCode: "VmVpbnM=" },
            { id: "k73", q: "What part of your hands have knobby joints called knuckles?", options: ["Palms", "Wrists", "Fingers", "Nails"], answerCode: "RmluZ2Vycw==" },
            { id: "k74", q: "What part of your body gets bigger when you puff out your breath?", options: ["Stomach", "Chest", "Back", "Head"], answerCode: "Q2hlc3Q=" },
            { id: "k75", q: "What is the hard, clear shield at the very tips of your fingers?", options: ["Skin", "Bone", "Fingernails", "Hair"], answerCode: "RmluZ2VybmFpbHM=" }
            { id: "hs1", q: "What is the longest and strongest bone in the human body?", options: ["Tibia", "Humerus", "Femur", "Fibula"], answerCode: "RmVtdXI=" },
            { id: "hs2", q: "Which bean-shaped organs filter waste from your blood?", options: ["Kidneys", "Lungs", "Liver", "Ovaries"], answerCode: "S2lkbmV5cw==" },
            { id: "hs3", q: "Which chamber of the heart pumps oxygenated blood to the body?", options: ["Right Atrium", "Left Ventricle", "Right Ventricle", "Left Atrium"], answerCode: "TGVmdCBWZW50cmljbGU=" },
            { id: "hs4", q: "What is the anatomical name for the voice box?", options: ["Pharynx", "Larynx", "Trachea", "Esophagus"], answerCode: "TGFyeW54" },
            { id: "hs5", q: "Which protein in red blood cells carries oxygen?", options: ["Insulin", "Collagen", "Hemoglobin", "Keratin"], answerCode: "SGVtb2dsb2Jpbg==" },
            { id: "hs6", q: "What is the first section of the small intestine called?", options: ["Jejunum", "Ileum", "Duodenum", "Cecum"], answerCode: "RHVvZGVudW0=" },
            { id: "hs7", q: "Which blood type is considered the universal donor?", options: ["A positive", "AB positive", "O positive", "O negative"], answerCode: "TyBuZWdhdGl2ZQ==" },
            { id: "hs8", q: "Which nerve transmits visual information from the eye to the brain?", options: ["Optic Nerve", "Olfactory Nerve", "Vagus Nerve", "Facial Nerve"], answerCode: "T3B0aWMgTmVydmU=" },
            { id: "hs9", q: "What pigment is primarily responsible for human skin color?", options: ["Carotene", "Melanin", "Hemoglobin", "Chlorophyll"], answerCode: "TWVsYW5pbg==" },
            { id: "hs10", q: "How many bones are in the typical adult human skeleton?", options: ["206", "256", "196", "306"], answerCode: "MjA2" },
            { id: "hs11", q: "What tough bands of connective tissue attach muscle to bone?", options: ["Ligaments", "Cartilage", "Tendons", "Fascia"], answerCode: "VGVuZG9ucw==" },
            { id: "hs12", q: "What tough bands of connective tissue attach bone to bone?", options: ["Tendons", "Ligaments", "Cartilage", "Marrow"], answerCode: "TGlnYW1lbnRz" },
            { id: "hs13", q: "What is the outermost layer of the human skin called?", options: ["Dermis", "Hypodermis", "Epidermis", "Subcutaneous layer"], answerCode: "RXBpZGVybWlz" },
            { id: "hs14", q: "What is the largest internal organ in the human body?", options: ["Heart", "Brain", "Liver", "Lungs"], answerCode: "TGl2ZXI=" },
            { id: "hs15", q: "The windpipe is anatomically known as what structure?", options: ["Esophagus", "Pharynx", "Bronchus", "Trachea"], answerCode: "VHJhY2hlYQ==" },
            { id: "hs16", q: "What are the tiny air sacs in the lungs where gas exchange occurs?", options: ["Alveoli", "Bronchioles", "Cilia", "Pleura"], answerCode: "QWx2ZW9saQ==" },
            { id: "hs17", q: "Which gland is often referred to as the 'master gland' of the endocrine system?", options: ["Thyroid", "Pituitary", "Adrenal", "Pancreas"], answerCode: "UGl0dWl0YXJ5" },
            { id: "hs18", q: "What is the physical structure of a DNA molecule described as?", options: ["Single Strand", "Double Helix", "Triple Helix", "Beta Sheet"], answerCode: "RG91YmxlIEhlbGl4" },
            { id: "hs19", q: "What type of blood vessel carries blood away from the heart?", options: ["Vein", "Artery", "Capillary", "Venule"], answerCode: "QXJ0ZXJ5" },
            { id: "hs20", q: "Which dome-shaped muscle plays a major role in breathing?", options: ["Diaphragm", "Intercostal", "Pectoralis", "Abdominal"], answerCode: "RGlhcGhyYWdt" },
            { id: "hs21", q: "What fluid in the mouth contains enzymes that begin the digestion of carbohydrates?", options: ["Gastric Juice", "Bile", "Saliva", "Mucus"], answerCode: "U2FsaXZh" },
            { id: "hs22", q: "What is the anatomical name for the kneecap?", options: ["Tibia", "Fibula", "Patella", "Tarsal"], answerCode: "UGF0ZWxsYQ==" },
            { id: "hs23", q: "What is the anatomical name for the collarbone?", options: ["Scapula", "Sternum", "Clavicle", "Radius"], answerCode: "Q2xhdmljbGU=" },
            { id: "hs24", q: "Which part of the eye controls the amount of light that enters?", options: ["Cornea", "Lens", "Retina", "Iris"], answerCode: "SXJpcw==" },
            { id: "hs25", q: "Which type of cells are the primary component of the immune system?", options: ["Red Blood Cells", "White Blood Cells", "Platelets", "Plasma Cells"], answerCode: "V2hpdGUgQmxvb2QgQ2VsbHM=" },
                         { id: "hs26", q: "What part of the skull completely encloses and protects the brain?", options: ["Mandible", "Maxilla", "Cranium", "Zygomatic"], answerCode: "Q3Jhbml1bQ==" },
            { id: "hs27", q: "What is the primary function of the large intestine?", options: ["Digesting proteins", "Water absorption", "Producing bile", "Absorbing nutrients"], answerCode: "V2F0ZXIgYWJzb3JwdGlvbg==" },
            { id: "hs28", q: "What is the medical term for the shoulder blade?", options: ["Clavicle", "Sternum", "Scapula", "Thorax"], answerCode: "U2NhcHVsYQ==" },
            { id: "hs29", q: "Which digestive organ is responsible for producing bile?", options: ["Pancreas", "Gallbladder", "Liver", "Stomach"], answerCode: "TGl2ZXI=" },
            { id: "hs30", q: "Where is bile temporarily stored before it enters the small intestine?", options: ["Liver", "Gallbladder", "Pancreas", "Duodenum"], answerCode: "R2FsbGJsYWRkZXI=" },
            { id: "hs31", q: "What are the smallest and most numerous blood vessels in the human body?", options: ["Arteries", "Veins", "Venules", "Capillaries"], answerCode: "Q2FwaWxsYXJpZXM=" },
            { id: "hs32", q: "What part of the brain primarily controls balance and muscular coordination?", options: ["Cerebrum", "Cerebellum", "Brainstem", "Hypothalamus"], answerCode: "Q2VyZWJlbGx1bQ==" },
            { id: "hs33", q: "What is the common anatomical name for the sternum?", options: ["Breastbone", "Collarbone", "Tailbone", "Rib"], answerCode: "QnJlYXN0Ym9uZQ==" },
            { id: "hs34", q: "How many pairs of ribs does a typical human skeleton have?", options: ["10", "12", "14", "24"], answerCode: "MTI=" },
            { id: "hs35", q: "What is the pale yellow liquid component of blood that holds the blood cells?", options: ["Serum", "Plasma", "Lymph", "Hemoglobin"], answerCode: "UGxhc21h" },
            { id: "hs36", q: "What type of synovial joint is the shoulder joint?", options: ["Hinge", "Pivot", "Ball and socket", "Gliding"], answerCode: "QmFsbCBhbmQgc29ja2V0" },
            { id: "hs37", q: "Which endocrine gland located in the neck regulates the body's metabolism?", options: ["Thyroid", "Thymus", "Pineal", "Adrenal"], answerCode: "VGh5cm9pZA==" },
            { id: "hs38", q: "What anatomical tubes carry urine from the kidneys to the urinary bladder?", options: ["Urethras", "Ureters", "Fallopian tubes", "Bronchi"], answerCode: "VXJldGVycw==" },
            { id: "hs39", q: "What is the medical term for the lower jawbone?", options: ["Maxilla", "Mandible", "Sphenoid", "Temporal"], answerCode: "TWFuZGlibGU=" },
            { id: "hs40", q: "Which component of blood is primarily responsible for clotting?", options: ["Red blood cells", "White blood cells", "Platelets", "Plasma"], answerCode: "UGxhdGVsZXRz" },
            { id: "hs41", q: "What is the largest and most highly developed region of the human brain?", options: ["Cerebellum", "Medulla Oblongata", "Thalamus", "Cerebrum"], answerCode: "Q2VyZWJydW0=" },
            { id: "hs42", q: "What muscular wall separates the right and left sides of the heart?", options: ["Valve", "Septum", "Pericardium", "Myocardium"], answerCode: "U2VwdHVt" },
            { id: "hs43", q: "The malleus, incus, and stapes are tiny bones located in which part of the body?", options: ["Inner ear", "Middle ear", "Nasal cavity", "Throat"], answerCode: "TWlkZGxlIGVhcg==" },
            { id: "hs44", q: "What is the primary digestive enzyme in the stomach that breaks down proteins?", options: ["Amylase", "Lipase", "Pepsin", "Lactase"], answerCode: "UGVwc2lu" },
            { id: "hs45", q: "Which hormone produced by the pancreas regulates blood sugar levels?", options: ["Glucagon", "Insulin", "Estrogen", "Testosterone"], answerCode: "SW5zdWxpbg==" },
            { id: "hs46", q: "What is the main function of the myelin sheath surrounding a neuron?", options: ["Produce neurotransmitters", "Speed up nerve impulses", "Provide nutrients", "Destroy pathogens"], answerCode: "U3BlZWQgdXAgbmVydmUgaW1wdWxzZXM=" },
            { id: "hs47", q: "The radius and ulna are two bones located in which part of the body?", options: ["Lower leg", "Thigh", "Forearm", "Upper arm"], answerCode: "Rm9yZWFybQ==" },
            { id: "hs48", q: "What is a normal, healthy resting heart rate range for an adult (in beats per minute)?", options: ["40-60", "60-100", "100-120", "120-140"], answerCode: "NjAtMTAw" },
            { id: "hs49", q: "To which part of the digestive tract is the appendix attached?", options: ["Stomach", "Small intestine", "Large intestine", "Liver"], answerCode: "TGFyZ2UgaW50ZXN0aW5l" },
            { id: "hs50", q: "What is the medical term for the eardrum?", options: ["Cochlea", "Tympanic membrane", "Pinna", "Eustachian tube"], answerCode: "VHltcGFuaWMgbWVtYnJhbmU=" },
            { id: "hs51", q: "Which blood vessels contain one-way valves to prevent the backflow of blood?", options: ["Arteries", "Veins", "Capillaries", "Aorta"], answerCode: "VmVpbnM=" },
            { id: "hs52", q: "What thick band of nerve fibers connects the left and right hemispheres of the brain?", options: ["Medulla Oblongata", "Corpus Callosum", "Cerebellum", "Thalamus"], answerCode: "Q29ycHVzIENhbGxvc3Vt" },
            { id: "hs53", q: "Where in the body are red blood cells primarily produced?", options: ["Liver", "Spleen", "Bone Marrow", "Lymph Nodes"], answerCode: "Qm9uZSBNYXJyb3c=" },
            { id: "hs54", q: "What is a primary function of the lymphatic system?", options: ["Digestion", "Respiration", "Immunity", "Hormone production"], answerCode: "SW1tdW5pdHk=" },
            { id: "hs55", q: "Which organ produces digestive enzymes for carbohydrates, proteins, and fats?", options: ["Liver", "Pancreas", "Gallbladder", "Stomach"], answerCode: "UGFuY3JlYXM=" },
            { id: "hs56", q: "What is the name of the fluid that surrounds and protects the brain and spinal cord?", options: ["Synovial Fluid", "Lymph", "Plasma", "Cerebrospinal Fluid"], answerCode: "Q2VyZWJyb3NwaW5hbCBGbHVpZA==" },
            { id: "hs57", q: "Which part of the inner ear converts sound waves into nerve impulses?", options: ["Cochlea", "Vestibule", "Tympanic Membrane", "Semicircular Canals"], answerCode: "Q29jaGxlYQ==" },
            { id: "hs58", q: "What flap of cartilage prevents food from entering the trachea when swallowing?", options: ["Uvula", "Larynx", "Epiglottis", "Pharynx"], answerCode: "RXBpZ2xvdHRpcw==" },
            { id: "hs59", q: "What is the medical term for the smaller of the two bones in the lower leg?", options: ["Tibia", "Fibula", "Femur", "Radius"], answerCode: "RmlidWxh" },
            { id: "hs60", q: "What is the process of cell division that results in two identical daughter cells?", options: ["Meiosis", "Mitosis", "Apoptosis", "Osmosis"], answerCode: "TWl0b3Npcw==" },
            { id: "hs61", q: "Which endocrine glands sit directly on top of the kidneys and produce adrenaline?", options: ["Thyroid Glands", "Pituitary Glands", "Adrenal Glands", "Pineal Glands"], answerCode: "QWRyZW5hbCBHbGFuZA==" },
            { id: "hs62", q: "What is the name of the light-sensitive inner lining of the back of the eye?", options: ["Cornea", "Retina", "Sclera", "Lens"], answerCode: "UmV0aW5h" },
            { id: "hs63", q: "What type of muscle tissue is found in the walls of internal organs like the stomach?", options: ["Skeletal Muscle", "Cardiac Muscle", "Smooth Muscle", "Striated Muscle"], answerCode: "U21vb3RoIE11c2NsZQ==" },
            { id: "hs64", q: "Which part of the nephron is a bundle of capillaries primarily responsible for filtering blood?", options: ["Loop of Henle", "Glomerulus", "Collecting Duct", "Bowman's Capsule"], answerCode: "R2xvbWVydWx1cw==" },
            { id: "hs65", q: "What is the name of the air-filled cavities in the bones of the skull?", options: ["Ventricles", "Sinuses", "Alveoli", "Fissures"], answerCode: "U2ludXNlcw==" },
            { id: "hs66", q: "Which section of the vertebral column is located in the neck?", options: ["Thoracic", "Lumbar", "Sacral", "Cervical"], answerCode: "Q2VydmljYWw=" },
            { id: "hs67", q: "What hormone, produced by the pineal gland, is responsible for regulating the sleep-wake cycle?", options: ["Serotonin", "Melatonin", "Dopamine", "Cortisol"], answerCode: "TWVsYXRvbmlu" },
            { id: "hs68", q: "What tough protein makes up the structure of human hair and nails?", options: ["Collagen", "Elastin", "Keratin", "Actin"], answerCode: "S2VyYXRpbg==" },
            { id: "hs69", q: "What are the two upper receiving chambers of the heart called?", options: ["Ventricles", "Atria", "Aortas", "Valves"], answerCode: "QXRyaWE=" },
            { id: "hs70", q: "Which specific blood vessel carries oxygenated blood from the lungs back to the heart?", options: ["Pulmonary Artery", "Aorta", "Vena Cava", "Pulmonary Vein"], answerCode: "UHVsbW9uYXJ5IFZlaW4=" },
            { id: "hs71", q: "What is the anatomical name for the large bone forming the heel?", options: ["Talus", "Calcaneus", "Navicular", "Cuboid"], answerCode: "Q2FsY2FuZXVz" },
            { id: "hs72", q: "What type of synovial joint allows for movement in only one plane, like the elbow?", options: ["Ball and Socket", "Pivot Joint", "Hinge Joint", "Gliding Joint"], answerCode: "SGluZ2UgSm9pbnQ=" },
            { id: "hs73", q: "What fluid acts as a lubricant to reduce friction in freely movable joints?", options: ["Lymph", "Cerebrospinal Fluid", "Plasma", "Synovial Fluid"], answerCode: "U3lub3ZpYWwgRmx1aWQ=" },
            { id: "hs74", q: "What part of the digestive system absorbs the vast majority of nutrients from food?", options: ["Stomach", "Large Intestine", "Small Intestine", "Esophagus"], answerCode: "U21hbGwgSW50ZXN0aW5l" },
            { id: "hs75", q: "What is the primary function of the protein fibrin in the bloodstream?", options: ["Oxygen Transport", "Fighting Infection", "Blood Clotting", "Nutrient Delivery"], answerCode: "Qmxvb2QgQ2xvdHRpbmc=" }
            { id: "adv1", q: "Which neurotransmitter is primarily implicated in the reward pathway?", options: ["Serotonin", "Dopamine", "GABA", "Acetylcholine"], answerCode: "RG9wYW1pbmU=" },
            { id: "adv2", q: "Where does the Krebs cycle occur in a eukaryotic cell?", options: ["Cytoplasm", "Nucleus", "Mitochondrial Matrix", "Golgi Apparatus"], answerCode: "TWl0b2Nob25kcmlhbCBNYXRyaXg=" },
            { id: "adv3", q: "Which cranial nerve innervates the muscles of facial expression?", options: ["Trigeminal Nerve (CN V)", "Facial Nerve (CN VII)", "Vagus Nerve (CN X)", "Hypoglossal Nerve (CN XII)"], answerCode: "RmFjaWFsIE5lcnZlIChDTiBWSUkp" },
            { id: "adv4", q: "What specific cell type is responsible for the synthesis of new bone matrix?", options: ["Osteoclast", "Osteocyte", "Osteoblast", "Chondrocyte"], answerCode: "T3N0ZW9ibGFzdA==" },
            { id: "adv5", q: "Which glial cell creates the myelin sheath in the Central Nervous System?", options: ["Schwann Cell", "Astrocyte", "Microglia", "Oligodendrocyte"], answerCode: "T2xpZ29kZW5kcm9jeXRl" },
            { id: "adv6", q: "Which acid is secreted by the parietal cells of the stomach?", options: ["Sulfuric Acid", "Hydrochloric Acid", "Nitric Acid", "Acetic Acid"], answerCode: "SHlkcm9jaGxvcmljIEFjaWQ=" },
            { id: "adv7", q: "Which artery primarily supplies the visual cortex of the brain?", options: ["Middle Cerebral Artery", "Anterior Cerebral Artery", "Posterior Cerebral Artery", "Basilar Artery"], answerCode: "UG9zdGVyaW9yIENlcmVicmFsIEFydGVyeQ==" },
            { id: "adv8", q: "What is the basic functional structural unit of the kidney?", options: ["Nephron", "Glomerulus", "Loop of Henle", "Bowman's Capsule"], answerCode: "TmVwaHJvbg==" },
            { id: "adv9", q: "What is the resting membrane potential of a typical mammalian neuron?", options: ["-90 mV", "-70 mV", "-55 mV", "+30 mV"], answerCode: "LTcwIG1W" },
            { id: "adv10", q: "Which of the following immunoglobulins is the first to be produced in response to an infection?", options: ["IgG", "IgA", "IgM", "IgE"], answerCode: "SWdN" },
            { id: "adv11", q: "The bundle of His is located in which specific cardiac structure?", options: ["Sinoatrial Node", "Interventricular Septum", "Apex of the Heart", "Right Atrial Wall"], answerCode: "SW50ZXJ2ZW50cmljdWxhciBTZXB0dW0=" },
            { id: "adv12", q: "Which specific region of the adrenal cortex is responsible for synthesizing cortisol?", options: ["Zona Glomerulosa", "Zona Fasciculata", "Zona Reticularis", "Adrenal Medulla"], answerCode: "Wm9uYSBGYXNjaWN1bGF0YQ==" },
            { id: "adv13", q: "What specific type of epithelium lines the urinary bladder to accommodate distension?", options: ["Simple Squamous", "Stratified Cuboidal", "Pseudostratified Columnar", "Transitional Epithelium"], answerCode: "VHJhbnNpdGlvbmFsIEVwaXRoZWxpdW0=" },
            { id: "adv14", q: "The Foramen of Monro connects which two ventricular structures in the brain?", options: ["Lateral and Third Ventricles", "Third and Fourth Ventricles", "Fourth Ventricle and Central Canal", "Subarachnoid Space and Sagittal Sinus"], answerCode: "TGF0ZXJhbCBhbmQgVGhpcmQgVmVudHJpY2xlcw==" },
            { id: "adv15", q: "Which enzyme catalyzes the conversion of angiotensin I to angiotensin II?", options: ["Renin", "ACE", "Aldosterone Synthase", "Carbonic Anhydrase"], answerCode: "QUNF" },
            { id: "adv16", q: "In muscle contraction, calcium ions bind to which specific protein to initiate cross-bridge cycling?", options: ["Tropomyosin", "Actin", "Myosin Heavy Chain", "Troponin C"], answerCode: "VHJvcG9uaW4gQw==" },
            { id: "adv17", q: "What specific cell secretes pulmonary surfactant in the alveoli?", options: ["Type I Pneumocyte", "Type II Pneumocyte", "Alveolar Macrophage", "Goblet Cell"], answerCode: "VHlwZSBJSSBQbmV1bW9jeXRl" },
            { id: "adv18", q: "The circle of Willis is formed by the internal carotid arteries and which other major arteries?", options: ["Vertebral Arteries", "External Carotid Arteries", "Subclavian Arteries", "Maxillary Arteries"], answerCode: "VmVydGVicmFsIEFydGVyaWVz" },
            { id: "adv19", q: "What is the most abundant type of leukocyte found in healthy adult human blood?", options: ["Lymphocyte", "Monocyte", "Eosinophil", "Neutrophil"], answerCode: "TmV1dHJvcGhpbA==" },
            { id: "adv20", q: "Which anatomical structure prevents the prolapse of the atrioventricular valves during ventricular systole?", options: ["Papillary Muscles only", "Chordae Tendineae", "Trabeculae Carneae", "Pectinate Muscles"], answerCode: "Q2hvcmRhZSBUZW5kaW5lYWU=" },
            { id: "adv21", q: "Which ascending spinal pathway transmits pain and temperature sensation to the brain?", options: ["Dorsal Column-Medial Lemniscus", "Spinothalamic Tract", "Corticospinal Tract", "Spinocerebellar Tract"], answerCode: "U3Bpbm90aGFsYW1pYyBUcmFjdA==" },
            { id: "adv22", q: "Which hormone directly stimulates the Leydig cells of the testes to produce testosterone?", options: ["FSH (Follicle-Stimulating Hormone)", "GnRH", "LH (Luteinizing Hormone)", "Inhibin"], answerCode: "TEggKEx1dGVpbml6aW5nIEhvcm1vbmUp" },
            { id: "adv23", q: "Where are Peyer's patches predominantly located in the gastrointestinal tract?", options: ["Duodenum", "Jejunum", "Ileum", "Colon"], answerCode: "SWxldW0=" },
            { id: "adv24", q: "The primary motor cortex is located in which specific gyrus of the brain?", options: ["Postcentral Gyrus", "Precentral Gyrus", "Superior Temporal Gyrus", "Cingulate Gyrus"], answerCode: "UHJlY2VudHJhbCBHeXJ1cw==" },
            { id: "adv25", q: "Which specific receptor acts as a stretch receptor to monitor blood pressure in the carotid sinus?", options: ["Chemoreceptor", "Nociceptor", "Baroreceptor", "Thermoreceptor"], answerCode: "QmFyb3JlY2VwdG9y" },
            { id: "adv26", q: "The optic chiasm sits directly superior to which endocrine structure?", options: ["Pineal Gland", "Thyroid Gland", "Pituitary Gland", "Adrenal Medulla"], answerCode: "UGl0dWl0YXJ5IEdsYW5k" },
            { id: "adv27", q: "Which specific part of the loop of Henle is highly impermeable to water?", options: ["Descending limb", "Thin ascending limb", "Ascending limb", "Distal convoluted tubule"], answerCode: "QXNjZW5kaW5nIGxpbWI=" },
            { id: "adv28", q: "What is the primary function of Kupffer cells in the hepatic system?", options: ["Glycogen storage", "Bile production", "Phagocytosis", "Insulin secretion"], answerCode: "UGhhZ29jeXRvc2lz" },
            { id: "adv29", q: "Which carpal bone, located in the anatomical snuffbox, is the most commonly fractured?", options: ["Lunate", "Pisiform", "Trapezium", "Scaphoid"], answerCode: "U2NhcGhvaWQ=" },
            { id: "adv30", q: "The plateau phase of a ventricular action potential is primarily caused by the influx of which ion?", options: ["Sodium", "Potassium", "Calcium", "Chloride"], answerCode: "Q2FsY2l1bQ==" },
            { id: "adv31", q: "Which nerve provides the sole motor innervation to the diaphragm?", options: ["Vagus Nerve", "Phrenic Nerve", "Intercostal Nerve", "Thoracic Nerve"], answerCode: "UGhyZW5pYyBOZXJ2ZQ==" },
            { id: "adv32", q: "What enzyme is directly responsible for the conversion of fibrinogen to fibrin in the coagulation cascade?", options: ["Prothrombin", "Plasmin", "Thrombin", "Factor Xa"], answerCode: "VGhyb21iaW4=" },
            { id: "adv33", q: "The ampulla of Vater empties pancreatic juice and bile into which segment of the gastrointestinal tract?", options: ["Stomach", "Jejunum", "Duodenum", "Ileum"], answerCode: "RHVvZGVudW0=" },
            { id: "adv34", q: "Which specific type of cartilage comprises the epiglottis?", options: ["Hyaline cartilage", "Fibrocartilage", "Elastic cartilage", "Articular cartilage"], answerCode: "RWxhc3RpYyBjYXJ0aWxhZ2U=" },
            { id: "adv35", q: "What is the primary excitatory neurotransmitter in the central nervous system?", options: ["GABA", "Glycine", "Glutamate", "Serotonin"], answerCode: "R2x1dGFtYXRl" },
            { id: "adv36", q: "The ductus arteriosus is a fetal blood vessel that connects the pulmonary artery to what structure?", options: ["Umbilical vein", "Aorta", "Vena Cava", "Right Atrium"], answerCode: "QW9ydGE=" },
            { id: "adv37", q: "Which specialized cells in the kidney secrete renin in response to low blood pressure?", options: ["Macula densa cells", "Podocytes", "Mesangial cells", "Juxtaglomerular cells"], answerCode: "SnV4dGFnbG9tZXJ1bGFyIGNlbGxz" },
            { id: "adv38", q: "What is the anatomical term for the 'blind spot' on the retina where the optic nerve exits?", options: ["Fovea centralis", "Macula lutea", "Optic disc", "Ciliary body"], answerCode: "T3B0aWMgZGlzYw==" },
            { id: "adv39", q: "The exocrine portion of the pancreas is primarily composed of what type of cells?", options: ["Islets of Langerhans", "Acinar cells", "Kupffer cells", "Chief cells"], answerCode: "QWNpbmFyIGNlbGxz" },
            { id: "adv40", q: "Which antibody isotype is capable of crossing the placenta to provide passive immunity to the fetus?", options: ["IgA", "IgM", "IgE", "IgG"], answerCode: "SWdH" },
            { id: "adv41", q: "The substantia nigra, crucial for dopamine production, is located in which part of the brainstem?", options: ["Midbrain", "Pons", "Medulla Oblongata", "Thalamus"], answerCode: "TWlkYnJhaW4=" },
            { id: "adv42", q: "Which bone houses the pituitary gland in a saddle-like depression called the sella turcica?", options: ["Ethmoid bone", "Sphenoid bone", "Temporal bone", "Occipital bone"], answerCode: "U3BoZW5vaWQgYm9uZQ==" },
            { id: "adv43", q: "The sinoatrial (SA) node is supplied primarily by a branch of which coronary artery in most individuals?", options: ["Left anterior descending", "Circumflex artery", "Right coronary artery", "Left main coronary artery"], answerCode: "UmlnaHQgY29yb25hcnkgYXJ0ZXJ5" },
            { id: "adv44", q: "What membrane-covered opening forms the boundary between the middle ear and the inner ear?", options: ["Round window", "Tympanic membrane", "Oval window", "Eustachian tube"], answerCode: "T3ZhbCB3aW5kb3c=" },
            { id: "adv45", q: "Which phase of the cardiac cycle is characterized by the closure of the AV valves and the opening of the semilunar valves?", options: ["Isovolumetric contraction", "Ventricular filling", "Ventricular ejection", "Isovolumetric relaxation"], answerCode: "VmVudHJpY3VsYXIgZWplY3Rpb24=" },
            { id: "adv46", q: "The ligamentum teres hepatis is an adult anatomical remnant of which fetal structure?", options: ["Ductus venosus", "Umbilical artery", "Umbilical vein", "Foramen ovale"], answerCode: "VW1iaWxpY2FsIHZlaW4=" },
            { id: "adv47", q: "What anatomical classification of joint is the symphysis pubis?", options: ["Synovial joint", "Fibrous joint", "Cartilaginous joint", "Saddle joint"], answerCode: "Q2FydGlsYWdpbm91cyBqb2ludA==" },
            { id: "adv48", q: "Which cranial nerve provides the majority of parasympathetic innervation to the thoracic and abdominal viscera?", options: ["Facial nerve (CN VII)", "Glossopharyngeal nerve (CN IX)", "Vagus nerve (CN X)", "Accessory nerve (CN XI)"], answerCode: "VmFndXMgbmVydmUgKENOIFgp" },
            { id: "adv49", q: "Intrinsic factor, essential for the intestinal absorption of Vitamin B12, is secreted by which gastric cells?", options: ["Chief cells", "Parietal cells", "G cells", "Mucous neck cells"], answerCode: "UGFyaWV0YWwgY2VsbHM=" },
            { id: "adv50", q: "What is the primary physiological role of the Golgi tendon organ?", options: ["Detect muscle length", "Detect muscle tension", "Initiate muscle contraction", "Provide joint proprioception"], answerCode: "RGV0ZWN0IG11c2NsZSB0ZW5zaW9u" }
            { id: "adv51", q: "Which primary cell type forms the principal barrier of the glomerular filtration membrane?", options: ["Mesangial cells", "Endothelial cells", "Podocytes", "Juxtaglomerular cells"], answerCode: "UG9kb2N5dGVz" },
            { id: "adv52", q: "The tract of Burdach is another name for which specific spinal cord pathway?", options: ["Fasciculus gracilis", "Fasciculus cuneatus", "Anterior spinothalamic tract", "Lateral corticospinal tract"], answerCode: "RmFzY2ljdWx1cyBjdW5lYXR1cw==" },
            { id: "adv53", q: "Which specific enzyme converts testosterone to dihydrotestosterone (DHT)?", options: ["Aromatase", "5-alpha-reductase", "21-hydroxylase", "17-beta-HSD"], answerCode: "NS1hbHBoYS1yZWR1Y3Rhc2U=" },
            { id: "adv54", q: "Where are the cell bodies of the primary somatic sensory neurons located?", options: ["Dorsal horn of spinal cord", "Ventral horn of spinal cord", "Dorsal root ganglion", "Sympathetic chain ganglion"], answerCode: "RG9yc2FsIHJvb3QgZ2FuZ2xpb24=" },
            { id: "adv55", q: "Which segment of the renal tubule is the primary site for aldosterone-regulated sodium reabsorption?", options: ["Proximal convoluted tubule", "Descending limb of loop of Henle", "Thick ascending limb", "Cortical collecting duct"], answerCode: "Q29ydGljYWwgY29sbGVjdGluZyBkdWN0" },
            { id: "adv56", q: "What unique metabolic byproduct is synthesized by the liver during periods of prolonged fasting or starvation?", options: ["Glycogen", "Ketone bodies", "Bile pigments", "Urea"], answerCode: "S2V0b25lIGJvZGllcw==" },
            { id: "adv57", q: "The space of Disse is anatomically located between which two hepatic structures?", options: ["Hepatocytes and sinusoids", "Sinusoidal endothelium and bile canaliculi", "Kupffer cells and hepatocytes", "Portal vein and hepatic artery"], answerCode: "SGVwYXRvY3l0ZXMgYW5kIHNpbnVzb2lkcw==" },
            { id: "adv58", q: "Which thalamic nucleus serves as the primary relay station for visual information?", options: ["Medial geniculate nucleus", "Lateral geniculate nucleus", "Ventral posterolateral nucleus", "Pulvinar nucleus"], answerCode: "TGF0ZXJhbCBnZW5pY3VsYXRlIG51Y2xldXM=" },
            { id: "adv59", q: "What specific physiological shift occurs in the hemoglobin-oxygen dissociation curve during metabolic acidosis?", options: ["Shifts to the left", "Shifts to the right", "Remains entirely constant", "Flattens completely"], answerCode: "U2hpZnRzIHRvIHRoZSByaWdodA==" },
            { id: "adv60", q: "Which endocrine cell population in the stomach is responsible for secreting the hormone gastrin?", options: ["Parietal cells", "Chief cells", "G cells", "ECL cells"], answerCode: "RyBjZWxscw==" },
            { id: "adv61", q: "The dynamic depolarization phase of a pacemaker cell action potential is driven by the influx of which ion?", options: ["Sodium via fast channels", "Calcium via L-type channels", "Potassium via delayed rectifiers", "Chloride via leak channels"], answerCode: "Q2FsY2l1bSB2aWEgTC10eXBlIGNoYW5uZWxz" },
            { id: "adv62", q: "Which regulatory protein structurally blocks the myosin-binding sites on actin filaments in a resting muscle cell?", options: ["Troponin T", "Troponin I", "Tropomyosin", "Titin"], answerCode: "VHJvcG9teW9zaW4=" },
            { id: "adv63", q: "What specific vascular structure connects the fetal umbilical vein directly to the inferior vena cava?", options: ["Ductus arteriosus", "Ductus venosus", "Foramen ovale", "Umbilical artery"], answerCode: "RHVjdHVzIHZlbm9zdXM=" },
            { id: "adv64", q: "Which specific cranial nerve exits the brainstem from the posterior/dorsal aspect?", options: ["Oculomotor nerve (CN III)", "Trochlear nerve (CN IV)", "Abducens nerve (CN VI)", "Vestibulocochlear nerve (CN VIII)"], answerCode: "VHJvY2hsZWFyIG5lcnZlIChDTiBJVik=" },
            { id: "adv65", q: "What specialized cell type forms the structural visceral layer of Bowman's capsule, wrapping around the glomerulus?", options: ["Juxtaglomerular cells", "Macula densa cells", "Mesangial cells", "Podocytes"], answerCode: "UG9kb2N5dGVz" },
            { id: "adv66", q: "Which specialized mechanoreceptor is uniquely adapted for detecting high-frequency vibration in the skin?", options: ["Meissner's corpuscle", "Pacinian corpuscle", "Merkel's disc", "Ruffini's ending"], answerCode: "UGFjaW5pYW4gY29ycHVzY2xl" },
            { id: "adv67", q: "The oblique sinus and transverse sinus are structural landmarks found within which cavity?", options: ["Pleural cavity", "Pericardial cavity", "Peritoneal cavity", "Cranial cavity"], answerCode: "UGVyaWNhcmRpYWwgY2F2aXR5" },
            { id: "adv68", q: "Which pancreatic secretory product acts via a paracrine pathway to aggressively inhibit both insulin and glucagon secretion?", options: ["Pancreatic polypeptide", "Amylin", "Somatostatin", "Ghrelin"], answerCode: "U29tYXRvc3RhdGlu" },
            { id: "adv69", q: "What specific structural zone of the adrenal cortex is the primary site of mineralocorticoid synthesis?", options: ["Zona glomerulosa", "Zona fasciculata", "Zona reticularis", "Adrenal medulla"], answerCode: "Wm9uYSBnbG9tZXJ1bG9zYQ==" },
            { id: "adv70", q: "Which dynamic plasma protein acts as the primary copper carrier in human circulation?", options: ["Transferrin", "Albumin", "Ceruloplasmin", "Haptoglobin"], answerCode: "Q2VydWxvcGxhc21pbg==" },
            { id: "adv71", q: "What structural opening connects the lateral ventricles of the cerebral hemispheres to the central third ventricle?", options: ["Aqueduct of Sylvius", "Foramen of Magendie", "Foramina of Luschka", "Foramen of Monro"], answerCode: "Rm9yYW1lbiBvZiBNb25ybw==" },
            { id: "adv72", q: "Which enzyme is directly responsible for converting angiotensinogen synthesized by the liver into angiotensin I?", options: ["ACE", "Renin", "Aldosterone synthase", "Angiotensinase"], answerCode: "UmVuaW4=" },
            { id: "adv73", q: "What specific immunoglobulin isotype exists predominantly as a secretory dimer providing mucosal immunity?", options: ["IgG", "IgM", "IgA", "IgE"], answerCode: "SWdB" },
            { id: "adv74", q: "The secondary structure of a protein molecule, such as an alpha-helix or beta-sheet, is stabilized primarily by which bonds?", options: ["Disulfide bonds", "Hydrogen bonds", "Ionic bonds", "Hydrophobic interactions"], answerCode: "SHlkcm9nZW4gYm9uZHM=" },
            { id: "adv75", q: "Which specific anatomical structure forms the lower structural boundary of the superior mediastinum?", options: ["Sternal angle to T4/T5 intervertebral disc", "First rib boundary", "Diaphragm level", "Xiphisternal joint"], answerCode: "U3Rlcm5hbCBhbmdsZSB0byBUNC9UNSBpbnRlcnZlcnRlYnJhbCBkaXNj" }

