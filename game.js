/*
 * GAME.JS - komplet spilkerne til den selvstændige arkadeprototype.
 *
 * Filen håndterer tastatur, fysik, kollisioner, tegning, HUD, lyd og forbindelsen
 * til den lokale kopi af fysiologimotoren. Spillet kræver ingen filer fra den
 * almindelige T1D Simulator ud over de to kopier i engine-mappen.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    // 2D-sprites bruges kun som fallback på enheder uden tilgængelig WebGL.
    const dexRenderer = window.DexGameRenderer ? window.DexGameRenderer.create() : null;
    const muscleDust = window.DexGlucoseParticles.createDust();
    const overlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');
    const overlayPrompt = document.getElementById('overlayPrompt');
    const demoBadge = document.getElementById('demoBadge');
    const liveStatus = document.getElementById('liveStatus');
    const musicToggle = document.getElementById('musicToggle');
    const soundToggle = document.getElementById('soundToggle');
    const gameHint = document.getElementById('gameHint');
    const hintPanel = document.getElementById('hintPanel');
    const hintTimer = document.getElementById('hintTimer');
    const hintTimerLabel = document.getElementById('hintTimerLabel');

    // 200 logiske højdepixels bevarer banernes fysik. Den bredere 16:9-visning
    // viser mere af banen uden at strække figurer eller ændre springlængder.
    const SCREEN_WIDTH = 200 * 16 / 9;
    const SCREEN_HEIGHT = 200;
    const RENDER_SCALE = 1080 / SCREEN_HEIGHT;
    const HUD_HEIGHT = 32;
    const HUD_TOP = SCREEN_HEIGHT - HUD_HEIGHT;
    const bgHUDRenderer = window.DexBGHUD ? window.DexBGHUD.create() : null;
    // Hele glasmodulet centreret som én enhed; samme offset bruges af pickups.
    const BG_HUD_X = (SCREEN_WIDTH - 190) / 2;
    const CANDY_HUD_X = BG_HUD_X - 158;
    const PUMP_HUD_X = BG_HUD_X + 69;
    // Små måltidsbilleder er visuel feedback, ikke separate fysiologiske puljer.
    const hudMeals = [];
    let bgHUDSignals = {cob:0,food:0,out:0,action:1,insulinClearance:0};
    let baselineBGAction = 1;
    let baselineDisposalAction = 0;
    const FIXED_STEP_SECONDS = 1 / 60;
    const SIMULATION_MINUTES_PER_REAL_SECOND = 4;
    const LEVEL_TIME_SECONDS = 120;
    const HINT_TIME_SCALE = 1 / 3;
    const HINT_RESUME_SECONDS = 2 * HINT_TIME_SCALE;
    const POINTS_PER_REMAINING_SECOND = 50;
    const POINTS_PER_DIAMOND = 100;
    const BONUS_TALLY_SECONDS_PER_ROW = 0.95;
    const BONUS_TALLY_TICKS_PER_ROW = 14;
    const BG_GREEN_MIN_MMOL_L = 3.9;
    const BG_GREEN_MAX_MMOL_L = 10;
    const DEX_PROFILE = Object.freeze({ weight: 70, isf: 3, icr: 10 });
    // Høj BG giver ikke længere Game Over. Over målområdet bliver monsteret
    // i stedet lineært døsigere mellem 10 og 19 mmol/L. Over 19 fastholdes
    // minimumsfaktorerne; der tilføjes ikke en automatisk redningsmekanik.
    const HIGH_BG_FATIGUE_START_MMOL_L = 10;
    const HIGH_BG_FATIGUE_FULL_MMOL_L = 19;
    const HIGH_BG_MIN_SPEED_FACTOR = 0.50;
    const HIGH_BG_MIN_ACCELERATION_FACTOR = 0.42;
    const HIGH_BG_MIN_JUMP_HEIGHT_FACTOR = 0.46;
    const PLAYER_WIDTH = 17;
    const PLAYER_HEIGHT = 23;
    const PLAYER_START_X = 34;
    // De genererede figur-PNG'er har transparent luft under fødderne. Ved den
    // lille spilstørrelse svarer det til cirka 2,5 pixels. Tegneoffsettet får
    // de synlige fødder ned på platformen uden at ændre kollisionsfysikken.
    const CHARACTER_GROUND_OFFSET = 2.5;
    // Pizza-renderingen har lidt mere transparent luft under skoene end de
    // øvrige fjender. Det særskilte offset forhindrer, at Pizza Man svæver,
    // uden at flytte de allerede justerede kage- og sodavandsmonstre.
    const PIZZA_GROUND_OFFSET = 3.5;
    const GRAVITY = 520;
    const JUMP_SPEED = -218;
    // Ved tidligt slip begrænses opstigningen; holdt tast bevarer det fulde hop.
    const SHORT_JUMP_SPEED_FACTOR = 0.45;
    const ENEMY_BOUNCE_SPEED = -255;
    const MAX_RUN_SPEED = 88;
    const RUN_ACCELERATION = 560;
    const GROUND_FRICTION = 720;
    const EAT_ANIMATION_SECONDS = 0.92;
    const EATING_SPEED_FACTOR = 0.18;
    const ENEMY_BITE_FRAME_SECONDS = 0.66;
    // Flere, kortere led giver en glattere bøjning uden at gøre halen længere.
    // Den svagere retningsfjeder lader spidsen fortsætte bevægelsen efter sving.
    const TAIL_SEGMENT_COUNT = 9;
    const TAIL_SEGMENT_LENGTH = 1.85;
    const TAIL_MOTION_DAMPING = 0.80;
    const TAIL_DIRECTIONAL_STIFFNESS = 0.032;
    const FIZZ_SHAKE_SECONDS = 2;
    const FIZZ_WARNING_SECONDS = 1;
    const FIZZ_FIRST_DELAY_SECONDS = 2.8;
    const FIZZ_MIN_COOLDOWN_SECONDS = 4;
    const FIZZ_COOLDOWN_VARIATION_SECONDS = 3;
    const FIZZ_SHAKE_BOUNCE_SPEED = -310;
    // Auto-pumpen arbejder med de samme diskrete 1 E-doser som den manuelle
    // pumpe. En pause mellem doserne gør automatikken aflæselig og forhindrer,
    // at alle tre lagerpladser tømmes i samme frame over tærsklen.
    const AUTO_PUMP_TRIGGER_BG_MMOL_L = 7;
    const AUTO_PUMP_DOSE_COOLDOWN_SECONDS = 8;
    // En klassisk attract loop skifter automatisk mellem titel, credits og en
    // kort computerstyret bane, når ingen spiller rører tastaturet.
    const ATTRACT_TITLE_SECONDS = 8;
    const ATTRACT_CREDITS_SECONDS = 6;
    const ATTRACT_DEMO_SECONDS = 16;
    const DEMO_JUMP_INTERVAL_SECONDS = 1.45;
    const PIZZA_THROW_WINDUP_SECONDS = 1.4;
    const PIZZA_THROW_MIN_COOLDOWN_SECONDS = 3.6;
    const PIZZA_THROW_COOLDOWN_VARIATION_SECONDS = 1.8;
    const PIZZA_THROW_RANGE = 240;
    const CHEESE_PROJECTILE_GRAVITY = 180;
    const EGG_ROLL_SPEED = 65;
    const EGG_ROLL_RADIUS = 9.2;
    // Skallens omrids i renderingens 512 x 512-koordinater. Tegning og
    // gulvkontakt deler konturen, så et æg på siden ikke svæver over gulvet.
    const EGG_SHELL_CURVES = [
        [323,88,382,177,388,246], [407,332,346,397,266,396],
        [188,394,143,351,145,274], [148,194,215,91,269,89],
    ];
    const EGG_SHELL_POINTS = (()=>{
        const points=[];let x=269,y=89;
        for(const [cx1,cy1,cx2,cy2,endX,endY] of EGG_SHELL_CURVES){
            for(let n=0;n<=32;n++){
                const t=n/32,u=1-t;
                points.push({x:u*u*u*x+3*u*u*t*cx1+3*u*t*t*cx2+t*t*t*endX-270,
                    y:u*u*u*y+3*u*u*t*cy1+3*u*t*t*cy2+t*t*t*endY-244});
            }
            x=endX;y=endY;
        }
        return points;
    })();

    // FOOD_MONSTER_PROFILES er den fælles ernæringskilde for alle madmonstre.
    // Hver profil beskriver en dokumenteret referenceportion fra simulatorens
    // madkatalog. Banerne angiver fortsat kun monsterets kulhydratportion; den
    // samlede vægt samt protein, fedt og spisetid skaleres automatisk. Når en ny
    // madvare tilføjes, skal hele dens makroprofil derfor defineres her i stedet
    // for blot at sende kulhydrat til fysiologimotoren.
    const FOOD_MONSTER_PROFILES = {
        ...DEXTRO_NEW_FOODS,
        cake: {
            name: 'CRUMBLER',
            stompMessage: 'CRUMBLER CRUSH!',
            stompPoints: 250,
            referenceNutrition: {
                carbs: 60,
                protein: 5,
                fat: 25,
                weight: 150,
                eatTimeMin: 4,
            },
            carbParams: {
                simpleFraction: 0.05,
                fiberPerGram: 0.05,
                retentionFactor: 1,
            },
        },
        soda: {
            name: 'FIZZLER',
            stompMessage: 'FIZZLER POP!',
            stompPoints: 300,
            referenceNutrition: {
                carbs: 27,
                protein: 0,
                fat: 0,
                weight: 250,
                eatTimeMin: 1,
            },
            carbParams: {
                simpleFraction: 1,
                fiberPerGram: 0,
                retentionFactor: 0.4,
            },
        },
        pizza: {
            name: 'PIZZA LADY',
            stompMessage: 'PIZZA SMASH!',
            stompPoints: 400,
            // 100 g pepperonipizza med almindelig bund. Fedt og protein sendes
            // med til fysiologimotoren og giver et langsommere forløb end sodavand.
            referenceNutrition: {
                carbs: 32,
                protein: 11.7,
                fat: 11.9,
                weight: 100,
                eatTimeMin: 4,
            },
            carbParams: {
                simpleFraction: 0.05,
                fiberPerGram: 0.02,
                retentionFactor: 1,
            },
        },
    };

    // Ægte Full HD-tegneflade. CSS skalerer til vinduet med samme 16:9-forhold.
    canvas.width = 1920;
    canvas.height = 1080;
    context.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    context.imageSmoothingEnabled = true;

    const backgroundImage = new Image();
    backgroundImage.src = 'assets/retro-landscape-hd.png';
    const biomeImages = {};
    for (const [key, theme] of Object.entries(DEXTRO_THEMES)) {
        if (theme.background) { biomeImages[key] = new Image(); biomeImages[key].src = theme.background; }
    }

    // Ét færdigt, sammenhængende PNG-lag leverer hele mellemlandskabet. Dets
    // alfakanal følger den tegnede junglesilhuet; der bruges ingen efterfølgende
    // canvasmaske, farveflade eller global gennemsigtighed.
    const middleGroundImage = new Image();
    middleGroundImage.src = 'assets/parallax-mid-continuous-v2.png?v=0.1.3';
    const orchardMiddleImage = new Image();
    orchardMiddleImage.src = 'assets/parallax-orchard-clean.png';
    const stageMiddleImages = [orchardMiddleImage];
    for(let stage=2;stage<=5;stage++){
        const image=new Image();image.src=`assets/parallax-stage-${stage}.png`;
        stageMiddleImages.push(image);
    }

    // Store kildebilleder i høj opløsning, og skalér dem glat ned til spillets
    // lille canvas. Derved bevarer insulinpen og bolsje hver sin klare silhuet.
    const pickupImages = {
        insulin: new Image(),
        candy: new Image(),
        pump: new Image(),
        autoPump: new Image(),
    };
    pickupImages.insulin.src = 'assets/insulin-pen.png';
    pickupImages.candy.src = 'assets/candy-spin-16.png';
    // Begge samleobjekter gennemløber 16 frames på ét sekund.
    const PICKUP_ANIMATION_FPS = 16;
    const PICKUP_ANIMATION_FRAMES = 16;

    function getPickupAnimationFrame(seconds, offset = 0) {
        return Math.floor(seconds * PICKUP_ANIMATION_FPS + offset) % PICKUP_ANIMATION_FRAMES;
    }
    pickupImages.pump.src = 'assets/insulin-pump.png';
    pickupImages.autoPump.src = 'assets/insulin-pump-auto-clean.png?v=clean-1';

    const characterImages = {
        idle: new Image(),
        run: new Image(),
        runPass: new Image(),
        eat: new Image(),
        devour: new Image(),
        pumpOverlay: new Image(),
        cgmOverlay: new Image(),
        drowsyMouthOverlay: new Image(),
        cake: new Image(),
        soda: new Image(),
        pizza: new Image(),
    };
    // Versionsmærket sikrer, at browseren ikke genbruger de tidligere,
    // halvgennemsigtige udgaver efter at billedernes alfakanal er rettet.
    characterImages.idle.src = 'assets/player-monster.png?v=opaque-1';
    characterImages.run.src = 'assets/player-monster-run.png?v=opaque-1';
    characterImages.runPass.src = 'assets/player-monster-run-pass.png?v=1';
    characterImages.eat.src = 'assets/player-monster-eat.png?v=opaque-1';
    characterImages.devour.src = 'assets/player-monster-devour.png?v=1';
    characterImages.pumpOverlay.src = 'assets/player-pump-overlay.png?v=1';
    characterImages.cgmOverlay.src = 'assets/player-cgm-round.png';
    characterImages.drowsyMouthOverlay.src =
        'assets/player-drowsy-mouth-overlay.png?v=1';
    characterImages.cake.src = 'assets/cake-monster.png';
    characterImages.soda.src = 'assets/soda-monster.png';
    characterImages.pizza.src = 'assets/pizza-monster.png?v=2';
    for (const type of ['apple','egg','banana','avocado','burger','pizza']) {
        characterImages[type] = new Image();
        characterImages[type].src = `assets/food-${type}.png`;
    }

    const audio = new GlucoseRunnerAudio();
    const levels = DEXTRO_CAMPAIGN;
    const keys = { left: false, right: false };
    const MUSIC_STORAGE_KEY = 'dextro-dash-2000-music';
    const SOUND_STORAGE_KEY = 'dextro-dash-2000-effects';
    const TUTORIAL_STORAGE_KEY = 'dextro-dash-2000-tutorial';
    const tutorialToggle = document.getElementById('tutorialToggle');
    let tutorialEnabled = true;
    const discoveredTutorials = new Set();
    const playKeyboardMap = document.getElementById('playKeyboardMap');
    playKeyboardMap.innerHTML = document.getElementById('titleKeyboardMap').innerHTML;
    // Hjælpeskitsen har sin egen realtidstæller og aktiverer ikke slowmotion.
    // Tre relevante opsamlinger tælles samlet pr. nyt spil, ikke pr. liv/bane.
    let keyboardIntroWaiting = false;
    let keyboardIntroSeconds = 0;
    let keyboardActionSeconds = 0;
    let keyboardActionPickups = 0;

    function remindActionKeys() {
        if (!tutorialEnabled || demoMode || keyboardActionPickups >= 3) return;
        keyboardActionPickups += 1;
        keyboardActionSeconds = 6;
    }

    function updateKeyboardSketch(deltaSeconds) {
        if (gameState !== 'playing' || demoMode || !tutorialEnabled) return;
        // Først når kameraet forlader banestarten, fader introen væk.
        // Et hop eller en piletast ved venstre kant er ikke nok i sig selv.
        if (keyboardIntroWaiting && cameraX > 0) {
            keyboardIntroWaiting = false;
            keyboardIntroSeconds = 0.8;
        }
        // Fasthold skitsen under læsetips, så slowmotion-panelet ikke bruger
        // hele visningstiden. Tællerne bruger ellers uændret realtid.
        if (activeHint) return;
        keyboardIntroSeconds = Math.max(0, keyboardIntroSeconds - deltaSeconds);
        keyboardActionSeconds = Math.max(0, keyboardActionSeconds - deltaSeconds);
    }

    function drawKeyboardSketch() {
        const intro = currentLevelIndex === 0 && (keyboardIntroWaiting || keyboardIntroSeconds > 0);
        const visible = gameState === 'playing' && !demoMode && tutorialEnabled
            && (intro || keyboardActionSeconds > 0);
        playKeyboardMap.hidden = !visible;
        playKeyboardMap.classList.toggle('actions-only', !intro);
        playKeyboardMap.classList.toggle('over-dex', intro);
        playKeyboardMap.style.left = intro
            ? `${clamp((player.x + PLAYER_WIDTH / 2 - cameraX) / SCREEN_WIDTH * 100, 10, 88)}%`
            : 'auto';
        playKeyboardMap.style.top = intro
            ? `${(player.y - 6) / SCREEN_HEIGHT * 100}%`
            : 'auto';
        // A/Z-påmindelsen står fast nederst til højre, over bundpanelet.
        // Introens fulde tastatur beholder sin placering over DEX.
        playKeyboardMap.style.right = intro ? 'auto' : '3%';
        playKeyboardMap.style.bottom = intro ? 'auto' : '18%';
        playKeyboardMap.style.opacity = intro && !keyboardIntroWaiting
            ? String(clamp(keyboardIntroSeconds / 0.8, 0, 1)) : '1';
        playKeyboardMap.setAttribute('aria-label', intro
            ? 'Keyboard controls: A, Z and arrow keys' : 'Action keys: A and Z');
    }

    let gameState = 'title';
    let attractPhase = 'title';
    let attractElapsedSeconds = 0;
    let attractAudioUnlocked = false;
    let demoMode = false;
    let demoElapsedSeconds = 0;
    let demoJumpCooldownSeconds = 0;
    let lastDemoLevelIndex = -1;
    let demoSequence = 0;
    let demoLesson = null;
    let previousFrameTime = performance.now();
    let accumulatedTime = 0;
    let cameraX = 0;
    let currentLevelIndex = 0;
    let score = 0;
    let collectedDiamondCount = 0;
    let lives = 3;
    let candyStock = 0;
    let pumpActive = false;
    let autoPumpActive = false;
    let autoPumpCooldownSeconds = 0;
    let pumpInsulinStored = 0;
    let candyHUDUnlocked = false;
    let pumpHUDUnlocked = false;
    let candyHintShown = false;
    let pumpHintShown = false;
    let autoPumpHintShown = false;
    let remainingTimeSeconds = LEVEL_TIME_SECONDS;
    let bgAlarmZone = 'normal';
    let bgAlarmCooldownSeconds = 0;
    let lastLowLampCycle = -1;
    let activeHint = null;
    let hintQueue = [];
    let physiologyEngine = null;
    let dexActivity = null;
    let physiologyState = null;
    let elapsedRealSeconds = 0;
    let lastBGSampleTime = 0;
    let bgSamples = [];
    let message = '';
    let messageTime = 0;
    let messageDuration = 0;
    let messageAnchorX = 0;
    let messageAnchorY = 0;
    let deathTime = 0;
    let deathReason = '';
    let items = [];
    let diamonds = [];
    let enemies = [];
    let cheeseProjectiles = [];
    let bananaPeels = [];
    let particles = [];
    let tailSegments = [];
    let hudPickupFlights = [];
    let stageClearTally = null;
    let platforms = [];
    let cacheBlocks = [];
    let stageCues = [];

    const player = {
        x: PLAYER_START_X,
        y: levels[0].groundY - PLAYER_HEIGHT,
        previousY: 0,
        vx: 0,
        vy: 0,
        onGround: true,
        facing: 1,
        invulnerableTime: 0,
        animationTime: 0,
        runAnimationDistance: 0,
        eatAnimationTime: 0,
        eatAnticipation: 0,
        candyUseTime: 0,
        insulinUseTime: 0,
        insulinUseSource: 'pen',
    };

    function getCurrentLevel() {
        return levels[currentLevelIndex];
    }

    function createPhysiologyEngine() {
        const modules = {
            dawn: 0,
            dawnVariability: 0,
            stressResponse: 0,
            glucotoxicity: 0,
            ketones: 0,
            sleepDisruption: 0,
            cgmSensorFaults: false,
            insulinVariability: 0,
            // Madmonstrene bruger komplette makroprofiler. Begge moduler skal
            // derfor være aktive, så især kagens fedt og protein påvirker både
            // mavetømning og den senere insulinvirkning.
            fatProtein: true,
            ffaResistance: 1,
        };

        const engine = T1DPhysiologyEngine.createEngine(DEX_PROFILE, {
            steadyState: false,
            noise: false,
            seed: 1987,
            modules,
        });

        // Banen starter fastende og i fysiologisk ligevægt. Motoren beregner den
        // basale insulintilførsel, der holder sand BG omkring 6,0 mmol/L, mens
        // mave- og tarmkompartmenterne er tomme (COB 0 g).
        engine.initSteadyState({ targetBG: 6 });
        engine.consumeEvents();
        baselineBGAction = engine.getPhysiologySnapshot().insulin.x1 || 1;
        baselineDisposalAction = engine.getPhysiologySnapshot().insulin.x2;
        bgHUDSignals = {cob:0,food:0,out:0,action:1,insulinClearance:0};
        hudMeals.length = 0;
        bgHUDRenderer?.reset();
        return engine;
    }

    function copyLevelObjects() {
        const level = getCurrentLevel();
        platforms = level.platforms.map(p => ({...p, crumbleTime:null, collapsed:false}));
        cacheBlocks = (level.blocks || []).map(b => ({...b, solid:true, used:false, bumpTime:0}));
        stageCues = (level.tutorialCues || []).map(c => ({...c, triggered:false}));
        items = level.items.map((item) => ({ ...item, collected: false }));
        diamonds = level.diamonds.map(([x, y]) => ({ x, y, collected: false }));
        enemies = level.enemies.map(createEnemy);
    }

    // Samme initialisering for banens faste monstre og dem, der kommer ud af kasser.
    function createEnemy(enemy, index) {
        return {
            ...enemy,
            y: enemy.y - 8,
            width: 22,
            height: 22,
            direction: index % 2 === 0 ? 1 : -1,
            alive: true,
            biteAnimationTime: 0,
            // Kun Fizzler bruger tilstandsmaskinen. Det forskudte første skift
            // forhindrer flere sodavandsmonstre i at begynde at ryste samtidig.
            fizzState: 'normal',
            fizzTimer: enemy.type === 'soda'
                ? FIZZ_FIRST_DELAY_SECONDS + (index % 4) * 0.65
                : 0,
            fizzCycleIndex: 0,
            cheeseThrowTimer: enemy.type === 'pizza'
                ? 2.2 + (index % 3) * 0.55
                : 0,
            cheeseWindupTime: 0,
            peelTimer: 3.5 + (index % 3),
            cheeseThrowCycleIndex: 0,
            eggState: enemy.eggDrop ? 'perched' : 'idle', eggTimer:0,
            eggHomeX:enemy.x, eggHomeY:enemy.y-8, eggRotation:0, eggVelocityY:0, eggTuck:0,
        };
    }

    function resetRun(options = {}) {
        if (dexRenderer) dexRenderer.reset();
        if (!options.keepScore) {
            score = 0;
            collectedDiamondCount = 0;
        }
        if (!options.keepLives) lives = 3;
        candyStock = 0;
        pumpActive = false;
        autoPumpActive = false;
        autoPumpCooldownSeconds = 0;
        pumpInsulinStored = 0;
        if (!options.keepDiscoveries) {
            candyHUDUnlocked = false;
            pumpHUDUnlocked = false;
            candyHintShown = false;
            pumpHintShown = false;
            autoPumpHintShown = false;
        }
        remainingTimeSeconds = getCurrentLevel().timeSeconds || LEVEL_TIME_SECONDS;
        audio.setTheme(DEXTRO_THEMES[getCurrentLevel().theme || 'orchard'].music);
        bgAlarmZone = 'normal';
        bgAlarmCooldownSeconds = 0;
        lastLowLampCycle = -1;
        activeHint = null;
        hintQueue = [];
        cameraX = 0;
        elapsedRealSeconds = 0;
        lastBGSampleTime = 0;
        bgSamples = [];
        message = '';
        messageTime = 0;
        messageDuration = 0;
        messageAnchorX = 0;
        messageAnchorY = 0;
        particles = [];
        muscleDust.reset();
        cheeseProjectiles = [];
        bananaPeels = [];
        hudPickupFlights = [];
        stageClearTally = null;
        dexActivity?.stop();
        physiologyEngine = createPhysiologyEngine();
        dexActivity = new DexActivity(physiologyEngine);
        physiologyState = physiologyEngine.getState();
        copyLevelObjects();
        const level = getCurrentLevel();

        Object.assign(player, {
            x: PLAYER_START_X,
            y: level.groundY - PLAYER_HEIGHT,
            previousY: level.groundY - PLAYER_HEIGHT,
            vx: 0,
            vy: 0,
            onGround: true,
            jumpCanBeShortened: false,
            exerting: false,
            // Udstyrets fysiologiske kobling er klar; ingen supersko er
            // placeret i banerne, før selve opgraderingen implementeres.
            superShoesActive: false,
            facing: 1,
            invulnerableTime: 1.2,
            animationTime: 0,
            runAnimationDistance: 0,
            eatAnimationTime: 0,
            eatAnticipation: 0,
            candyUseTime: 0,
            insulinUseTime: 0,
            insulinUseSource: 'pen',
        });
        resetPlayerTail();
    }

    function getPlayerTailAnchor() {
        const pose = getPlayerAnimationPose();
        const forwardOffset = pose.forward || 0;
        return {
            x: player.x + PLAYER_WIDTH / 2
                + player.facing * forwardOffset
                - player.facing * 5,
            y: player.y + PLAYER_HEIGHT + CHARACTER_GROUND_OFFSET - 11,
        };
    }

    function resetPlayerTail() {
        const anchor = getPlayerTailAnchor();
        tailSegments = [];
        for (let index = 0; index < TAIL_SEGMENT_COUNT; index += 1) {
            const x = anchor.x - player.facing * TAIL_SEGMENT_LENGTH * index;
            const y = anchor.y + index * 0.25;
            tailSegments.push({ x, y, previousX: x, previousY: y });
        }
    }

    function updatePlayerTail(deltaSeconds) {
        if (tailSegments.length !== TAIL_SEGMENT_COUNT) resetPlayerTail();

        const anchor = getPlayerTailAnchor();
        const bg = getGameBG();
        // BG påvirker kun halens opdrift. CGM-sensoren på kinden viser nu
        // alarmfarven; selve halens farver er derfor altid de samme.
        const verticalAcceleration = bg < BG_GREEN_MIN_MMOL_L
            ? 95
            : bg > BG_GREEN_MAX_MMOL_L ? -72 : 18;

        tailSegments[0].x = anchor.x;
        tailSegments[0].y = anchor.y;
        tailSegments[0].previousX = anchor.x;
        tailSegments[0].previousY = anchor.y;

        // Verlet-integration gemmer den forrige position i stedet for en
        // særskilt hastighed. Resultatet er en blød hale med naturlig inerti.
        for (let index = 1; index < tailSegments.length; index += 1) {
            const segment = tailSegments[index];
            const velocityX = (segment.x - segment.previousX) * TAIL_MOTION_DAMPING;
            const velocityY = (segment.y - segment.previousY) * TAIL_MOTION_DAMPING;
            segment.previousX = segment.x;
            segment.previousY = segment.y;
            segment.x += velocityX;
            segment.y += velocityY + verticalAcceleration * deltaSeconds * deltaSeconds;

            // En svag retningsfjeder holder halen bag kroppen. Den fjerner den
            // meget løse snorfornemmelse, men er blød nok til at halen stadig
            // slæber efter ved acceleration og svinger igennem ved vending.
            const preferredX = anchor.x
                - player.facing * TAIL_SEGMENT_LENGTH * index;
            const bgCurve = bg < BG_GREEN_MIN_MMOL_L
                ? index * 0.34
                : bg > BG_GREEN_MAX_MMOL_L ? -index * 0.30 : index * 0.05;
            const preferredY = anchor.y + bgCurve;
            segment.x += (preferredX - segment.x) * TAIL_DIRECTIONAL_STIFFNESS;
            segment.y += (preferredY - segment.y) * TAIL_DIRECTIONAL_STIFFNESS * 0.7;
        }

        // Flere bløde afstandskorrektioner holder segmenterne sammen, men
        // tillader en lille elastisk forlængelse ved acceleration og vending.
        for (let iteration = 0; iteration < 5; iteration += 1) {
            tailSegments[0].x = anchor.x;
            tailSegments[0].y = anchor.y;
            for (let index = 1; index < tailSegments.length; index += 1) {
                const parent = tailSegments[index - 1];
                const segment = tailSegments[index];
                const deltaX = segment.x - parent.x;
                const deltaY = segment.y - parent.y;
                const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
                const correction = (distance - TAIL_SEGMENT_LENGTH) / distance * 0.72;
                segment.x -= deltaX * correction;
                segment.y -= deltaY * correction;
            }
        }

        // På en platform må den bløde hale gerne lægge sig langs jorden, men
        // ikke passere ned gennem den. I luften får den lov at hænge frit.
        if (player.onGround) {
            const groundLimit = player.y + PLAYER_HEIGHT + CHARACTER_GROUND_OFFSET - 1;
            for (let index = 1; index < tailSegments.length; index += 1) {
                tailSegments[index].y = Math.min(tailSegments[index].y, groundLimit);
            }
        }
    }

    function startGame() {
        startLevel(0);
    }

    // Talgenvejene er et udviklingsværktøj: en direkte banestart skal altid
    // begynde som et nyt spil, så fysiologi, point og liv er reproducerbare.
    function startLevel(levelIndex) {
        audio.start().then(() => {
            // Piletasten er også en gyldig browser-gesture. Husk derfor den
            // aktive kontekst, så en senere titelskærm ikke beder om lyd igen.
            if (audio.context && audio.context.state === 'running') {
                attractAudioUnlocked = true;
                overlay.dataset.audioState = 'running';
            }
        }).catch(() => {
            overlay.dataset.audioState = 'blocked';
        });
        demoMode = false;
        demoBadge.classList.add('hidden');
        demoBadge.setAttribute('aria-hidden', 'true');
        currentLevelIndex = clamp(levelIndex, 0, levels.length - 1);
        resetRun();
        gameState = 'playing';
        keyboardIntroWaiting = currentLevelIndex === 0 && tutorialEnabled;
        keyboardIntroSeconds = 0;
        keyboardActionSeconds = 0;
        keyboardActionPickups = 0;
        hideOverlay();
        canvas.focus();
        announce(`Stage ${currentLevelIndex + 1} started`);
    }

    function startNextLevel() {
        demoMode = false;
        demoBadge.classList.add('hidden');
        demoBadge.setAttribute('aria-hidden', 'true');
        currentLevelIndex += 1;
        keyboardIntroWaiting = false;
        keyboardIntroSeconds = 0;
        keyboardActionSeconds = 0;
        collectedDiamondCount = 0;
        resetRun({ keepScore: true, keepLives: true, keepDiscoveries: true });
        gameState = 'playing';
        hideOverlay();
        canvas.focus();
        announce(`Stage ${currentLevelIndex + 1} started`);
    }

    function showOverlay(title, subtitle, prompt, mode = 'game') {
        overlay.classList.toggle('gallery-screen', mode === 'gallery');
        overlayTitle.textContent = title;
        overlaySubtitle.textContent = subtitle;
        overlaySubtitle.classList.remove('stage-tally');
        overlayPrompt.textContent = prompt;
        overlay.classList.toggle('title-screen', mode === 'title');
        overlay.classList.toggle('credits-screen', mode === 'credits');
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
    }

    function showAttractTitle() {
        dexActivity?.stop();
        demoMode = false;
        keys.left = false;
        keys.right = false;
        attractPhase = 'title';
        attractElapsedSeconds = 0;
        gameState = 'title';
        demoBadge.classList.add('hidden');
        demoBadge.setAttribute('aria-hidden', 'true');
        showOverlay(
            'DEXTRO DASH 2000',
            'STARRING DEX\nA MONSTER WITH TYPE 1 DIABETES',
            'PRESS A BUTTON TO PLAY',
            'title',
        );
        if (attractAudioUnlocked) audio.attractTitle();
        announce('DEXTRO DASH 2000. Starring DEX, a monster with type 1 diabetes. Press an arrow key to play.');
    }

    function showAttractCredits() {
        attractPhase = 'credits';
        attractElapsedSeconds = 0;
        showOverlay(
            'CREDITS',
            'CONCEPT & DIRECTION: KRISTIAN RAUHE HARREBY\nDEVELOPMENT & CREATIVE COLLABORATION: OPENAI CODEX\nPHYSIOLOGY ENGINE: T1D SIMULATOR\nORIGINAL GAME ART, CODE & MUSIC\nLICENSE: GNU GPL V3',
            'DEMO MODE STARTING...',
            'credits',
        );
        if (attractAudioUnlocked) audio.attractCredits();
    }

    let galleryPaint=[];
    function showAttractGallery(monsters=false){
        attractPhase=monsters?'monsters':'items';attractElapsedSeconds=0;
        showOverlay(monsters?'MEET THE FOOD MONSTERS':'PICKUPS & PARTICLES',
            monsters?'Eating changes DEX’s simulated glucose. Stomping earns points.':'Discover what each item does.',
            'PRESS A BUTTON TO PLAY','gallery');
        const notes={apple:'A walking fruit snack.',banana:'Drops slippery banana peel.',egg:'Watch out when he falls and rolls!',avocado:'Mostly fat, with little carbohydrate.',burger:'A mixed meal with carbohydrate, fat and protein.',cake:'A rich cake with carbohydrate and fat.',soda:'Warns before shaking. Shaking contact explodes; stomping gives a boost.',pizza:'Aims before throwing melted cheese.'};
        const entries=monsters?Object.entries(FOOD_MONSTER_PROFILES).map(([type,p])=>[type,p.name,notes[type]||'A food monster.']):[
            ['diamond','DIAMONDS','Collected diamonds add bonus points at level completion.'],
            ['candy','CANDY','Stored for DEX. Press A to eat one.'],
            ['insulin','INSULIN','Used on pickup, or stored in a pump with free space.'],
            ['heart','EXTRA LIFE','A rare heart gives DEX one extra life.'],
            ['superShoes','SUPER SHOES','More speed, higher jumps, faster falls and more activity.'],
            ['pump','MANUAL PUMP','Stores three charges. Press Z to use a stored charge.'],
            ['autoPump','AUTO PUMP','Stores three charges and acts automatically for DEX.'],
            ['sugarCane','SUGAR CANE','Eaten on contact, unlike stored candy.'],
            ['glucose','CARB / GLUCOSE PARTICLES','Gold particles show carbohydrate absorption and glucose movement.'],
            ['insulinParticle','INSULIN PARTICLES','Turquoise particles represent insulin in the game display.']];
        const gallery=document.getElementById('attractGallery');gallery.classList.toggle('monster-gallery',monsters);gallery.innerHTML='';galleryPaint=[];
        for(const [type,name,note] of entries){
            const card=document.createElement('div'),icon=document.createElement('canvas');
            icon.width=120;icon.height=100;icon.setAttribute('aria-hidden','true');
            const title=document.createElement('strong'),description=document.createElement('p');
            title.textContent=name;description.textContent=note;
            card.append(icon,title,description);gallery.append(card);
            galleryPaint.push(()=>{
                const c=icon.getContext('2d');c.clearRect(0,0,120,100);
                if(monsters){const img=characterImages[type];if(img?.complete&&img.naturalWidth)c.drawImage(img,15,5,90,90);}
                else if(type==='glucose'||type==='insulinParticle'){
                    for(let n=0;n<7;n++){
                        const x=60+Math.sin(attractElapsedSeconds+n*2.3)*33,y=50+Math.cos(attractElapsedSeconds*.7+n)*28;
                        const glyph=type==='glucose'?DexGlucoseParticles.drawGlyph:DexGlucoseParticles.drawInsulinGlyph;
                        glyph(c,x,y,4,1);
                    }
                }else if(type==='diamond'){
                    c.fillStyle='#44ddff';c.strokeStyle='white';c.lineWidth=3;c.beginPath();c.moveTo(60,8);c.lineTo(83,40);c.lineTo(60,90);c.lineTo(37,40);c.closePath();c.fill();c.stroke();
                }else if(type==='sugarCane'){
                    c.save();c.translate(60,50);c.scale(3.5,3.5);drawPickup(type,0,0,75,true,c);c.restore();
                }else drawPickup(type,60,50,75,true,c);
            });
        }
        galleryPaint.forEach(paint=>paint());
    }

    function getDemoStartPositions() {
        const level = getCurrentLevel();
        const starts = [];
        for (const floor of platforms) {
            // Vis udsnit inde i banen med lidt tilløb mod højre. Ingen start
            // på smuldregulve, i lavahuller eller helt henne ved målstregen.
            if (floor.crumble || floor.collapsed || floor.y < PLAYER_HEIGHT+12) continue;
            const firstX = Math.max(SCREEN_WIDTH*.75, floor.x+24);
            const lastX = Math.min(floor.x+floor.width-PLAYER_WIDTH-60,
                level.finishX-SCREEN_WIDTH);
            for (let x=firstX; x<=lastX; x+=48) {
                const y = floor.y-PLAYER_HEIGHT;
                // Kontrollér også plads over hovedet og umiddelbart foran DEX.
                // Faste tunnelloft/-vægge kan ligge oven i jordens x-interval.
                const blocked = [...platforms,...cacheBlocks].some(obstacle =>
                    obstacle!==floor && !obstacle.collapsed && obstacle.solid!==false
                    && rectanglesOverlap(x-6,y-8,PLAYER_WIDTH+66,PLAYER_HEIGHT+8,
                        obstacle.x,obstacle.y,obstacle.width,obstacle.height));
                const enemyNearby = enemies.some(enemy => enemy.alive
                    && rectanglesOverlap(x-30,y-35,PLAYER_WIDTH+100,PLAYER_HEIGHT+35,
                        enemy.x,enemy.y,enemy.width,enemy.height));
                const pickupOverlap = items.some(item => !item.collected
                    && rectanglesOverlap(x-6,y-6,PLAYER_WIDTH+12,PLAYER_HEIGHT+12,
                        item.x-10,item.y-10,20,20));
                if (!blocked && !enemyNearby && !pickupOverlap) starts.push({x,y});
            }
        }
        return starts;
    }

    function startAttractDemo() {
        // Alle baner kan vises, men aldrig samme bane to demoer i træk.
        const excludeLast = levels.length>1 && lastDemoLevelIndex>=0;
        currentLevelIndex = Math.floor(Math.random()*(levels.length-(excludeLast?1:0)));
        if (excludeLast && currentLevelIndex>=lastDemoLevelIndex) currentLevelIndex+=1;
        lastDemoLevelIndex = currentLevelIndex;
        resetRun();
        const starts = getDemoStartPositions();
        // En fremtidig meget kort bane uden egnede steder beholder sin normale
        // start. Søgningen er endelig og kan aldrig hænge attract-loopet.
        const start = starts[Math.floor(Math.random()*starts.length)];
        if (start) {
            Object.assign(player,{x:start.x,y:start.y,previousY:start.y});
            cameraX=clamp(start.x-80,0,Math.max(0,getCurrentLevel().width-SCREEN_WIDTH));
            resetPlayerTail();
            if (dexRenderer) dexRenderer.reset();
        }
        demoMode = true;
        demoLesson=null;
        const lessonKind=['explore','food','insulin'][demoSequence++%3];
        if(lessonKind!=='explore')setupDemoLesson(lessonKind);
        demoElapsedSeconds = 0;
        demoJumpCooldownSeconds = 0.55;
        gameState = 'playing';
        hideOverlay();
        demoBadge.classList.remove('hidden');
        demoBadge.setAttribute('aria-hidden', 'false');
        keys.left = false;
        keys.right = true;
        // Efter det første brugerinput fortsætter den samme chiptune gennem
        // titel, credits og demo. En kort fanfare markerer demoens start.
        audio.start();
        if (attractAudioUnlocked) audio.demoStart();
        announce('Demo mode. Press a key to play.');
    }

    async function unlockAttractAudio() {
        if (attractAudioUnlocked) return;
        try {
            await audio.start();
            attractAudioUnlocked = true;
            overlay.dataset.audioState = audio.context
                ? audio.context.state
                : 'unavailable';
            audio.attractTitle();
            if (gameState === 'title') overlayPrompt.textContent = 'PRESS A BUTTON TO PLAY';
        } catch (error) {
            // Enkelte browserpolitikker kan fortsat afvise lydstart. Tilstanden
            // gør dette synligt for browsertesten uden at påvirke spillet.
            overlay.dataset.audioState = 'blocked';
        }
    }

    function updateAttractLoop(deltaSeconds) {
        attractElapsedSeconds += deltaSeconds;
        if(attractPhase==='items'||attractPhase==='monsters'){
            galleryPaint.forEach(paint=>paint());
            if(attractElapsedSeconds>=18){if(attractPhase==='items')showAttractGallery(true);else startAttractDemo();}
            return;
        }
        if (attractPhase === 'title'
            && attractElapsedSeconds >= ATTRACT_TITLE_SECONDS) {
            showAttractCredits();
            return;
        }
        if (attractPhase === 'credits'
            && attractElapsedSeconds >= ATTRACT_CREDITS_SECONDS) {
            showAttractGallery();
        }
    }

    function updateDemoController(deltaSeconds) {
        demoElapsedSeconds += deltaSeconds;
        if(demoLesson){
            const done=demoLesson.kind==='food'?!demoLesson.target.alive:demoLesson.target.collected;
            keys.left=false;keys.right=!done;
            if(done&&demoLesson.contactBG===null)demoLesson.contactBG=getGameBG();
            if(demoElapsedSeconds>=28)showAttractTitle();
            return;
        }
        demoJumpCooldownSeconds -= deltaSeconds;
        keys.left = false;
        keys.right = true;

        // DEX hopper regelmæssigt, men fremskynder næste hop, når en fjende
        // eller afslutningen på den aktuelle jordplatform nærmer sig.
        const obstacleAhead = enemies.some((enemy) => (
            enemy.alive
            && enemy.x > player.x
            && enemy.x - player.x < 42
        ));
        const supportingPlatform = platforms.filter(platform => !platform.collapsed).find((platform) => (
            player.x + PLAYER_WIDTH / 2 >= platform.x
            && player.x + PLAYER_WIDTH / 2 <= platform.x + platform.width
            && Math.abs(player.y + PLAYER_HEIGHT - platform.y) < 5
        ));
        const edgeAhead = supportingPlatform
            && supportingPlatform.x + supportingPlatform.width - player.x < 45;
        if (player.onGround
            && (demoJumpCooldownSeconds <= 0 || obstacleAhead || edgeAhead)) {
            jump();
            demoJumpCooldownSeconds = DEMO_JUMP_INTERVAL_SECONDS;
        }

        if (demoElapsedSeconds >= ATTRACT_DEMO_SECONDS) showAttractTitle();
    }

    // Forfattede vignetter, kun i demo. Normal banestart genskaber alle
    // objekter og standard-BG. Ingen efterfølgende manipulation af BG-kurven.
    function setupDemoLesson(kind){
        const x=400,floorY=154;
        platforms=[{x:x-100,y:floorY,width:600,height:40,collapsed:false}];
        cacheBlocks=[];items=[];enemies=[];diamonds=[];stageCues=[];
        Object.assign(player,{x,y:floorY-PLAYER_HEIGHT,previousY:floorY-PLAYER_HEIGHT,vx:0,vy:0,onGround:true});
        physiologyEngine.initSteadyState({targetBG:kind==='food'?4.4:11});
        physiologyEngine.consumeEvents();physiologyState=physiologyEngine.getState();
        let target;
        if(kind==='food'){
            target=createEnemy({type:'apple',x:x+72,y:floorY-14,minX:x+72,maxX:x+72,speed:0},0);
            enemies.push(target);
        }else{
            target={type:'insulin',x:x+72,y:floorY-14,collected:false};items.push(target);
        }
        demoLesson={kind,target,contactBG:null};
        cameraX=x-80;resetPlayerTail();dexRenderer?.reset();
    }

    function drawDemoCaption(){
        if(!demoMode||gameState!=='playing')return;
        let text;
        if(demoLesson){
            const {kind,contactBG}=demoLesson;
            if(contactBG===null)text=kind==='food'?'DEX IS RUNNING. RUNNING USES GLUCOSE.':'DEX IS APPROACHING AN INSULIN PICKUP.';
            else if(kind==='food')text=getGameBG()>contactBG+.2?'DEX IS RESTING. HIS BG IS RISING.':'DEX ATE AN APPLE. FOOD IS STILL BEING ABSORBED.';
            else text=getGameBG()<contactBG-.2?'DEX IS RESTING. INSULIN IS STILL ACTING.':'DEX COLLECTED INSULIN. ITS EFFECT TAKES TIME.';
        }else{
            const tips=['ARROWS MOVE DEX. A SHORT UP PRESS MAKES A SMALL HOP.',
                'EATING FOOD CHANGES BG. STOMPING MONSTERS GIVES POINTS.',
                'PRESS "A" TO USE STORED CANDY. PRESS "Z" TO USE THE MANUAL PUMP.',
                'INSULIN PICKUPS CAN ALSO MAKE DEX\'S BG TOO LOW.'];
            text=tips[Math.min(3,Math.floor(demoElapsedSeconds/4))];
        }
        context.save();context.fillStyle='rgba(12,10,35,.88)';
        context.fillRect(8,27,SCREEN_WIDTH-16,17);
        context.font='bold 4.2px monospace';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#e2f9ff';
        context.fillText(text,SCREEN_WIDTH/2,34,SCREEN_WIDTH-28);
        context.font='3px monospace';context.fillStyle='#b8b4d3';
        context.fillText('DEMO — FICTIONAL DEX · PRESS A KEY TO PLAY',SCREEN_WIDTH/2,41);
        context.restore();
    }

    function announce(text) {
        liveStatus.textContent = '';
        window.setTimeout(() => { liveStatus.textContent = text; }, 20);
    }

    function readAudioPreference(storageKey) {
        try {
            return window.localStorage.getItem(storageKey) !== 'off';
        } catch (error) {
            // Direkte åbning af lokale filer kan blokere localStorage i enkelte
            // browsere. Spillet fungerer stadig; lyd starter da som standard til.
            return true;
        }
    }

    function setMusicEnabled(enabled, savePreference = true) {
        audio.setMusicEnabled(enabled);
        musicToggle.textContent = enabled ? 'MUSIC: ON' : 'MUSIC: OFF';
        musicToggle.setAttribute('aria-pressed', String(enabled));

        if (enabled) audio.start();

        if (savePreference) {
            try {
                window.localStorage.setItem(MUSIC_STORAGE_KEY, enabled ? 'on' : 'off');
            } catch (error) {
                // Se kommentaren i readAudioPreference().
            }
        }

        announce(enabled ? 'Music on' : 'Music off');
    }

    function setSoundEnabled(enabled, savePreference = true) {
        audio.setEffectsEnabled(enabled);
        soundToggle.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
        soundToggle.setAttribute('aria-pressed', String(enabled));

        // Effektkanalen kræver også en aktiv AudioContext. Når musikken er
        // slukket, opretter start() konteksten uden at starte melodien.
        if (enabled) audio.start();

        if (savePreference) {
            try {
                window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
            } catch (error) {
                // Se kommentaren i readAudioPreference().
            }
        }

        announce(enabled ? 'Sound on' : 'Sound off');
    }

    function toggleMusic() {
        setMusicEnabled(!audio.musicEnabled);
    }

    function toggleSound() {
        setSoundEnabled(!audio.effectsEnabled);
    }

    function jump() {
        if (gameState !== 'playing' || !player.onGround) return;
        const highBGFatigue = getHighBGFatigue();
        const jumpHeightFactor = 1
            - highBGFatigue * (1 - HIGH_BG_MIN_JUMP_HEIGHT_FACTOR);
        // Hoppehøjden er proportional med starthastighedens kvadrat. Roden
        // gør selve højden lineær i BG, ikke kun den indledende hastighed.
        player.vy = JUMP_SPEED * Math.sqrt(jumpHeightFactor) * (player.superShoesActive?1.18:1);
        player.shortJumpSpeed = player.vy * SHORT_JUMP_SPEED_FACTOR;
        player.jumpCanBeShortened = true;
        player.onGround = false;
        audio.jump();
    }

    function releaseJump() {
        // Kun almindelige hop kan afkortes, ikke fjendespring eller dødsanimation.
        // En hastighedsgrænse giver gradvist højere hop jo senere tasten slippes.
        if (gameState === 'playing' && player.jumpCanBeShortened && player.vy < 0) {
            player.vy = Math.max(player.vy, player.shortJumpSpeed);
        }
        player.jumpCanBeShortened = false;
    }

    function useCandy() {
        if (gameState !== 'playing' || candyStock <= 0) {
            if (gameState === 'playing') setMessage('NO CANDY', 0.7);
            return false;
        }
        const accepted = physiologyEngine.addFood({
            carbs: 10,
            weight: 10,
            eatTimeMin: 0.5,
            carbParams: {
                simpleFraction: 1,
                fiberPerGram: 0,
                retentionFactor: 1,
            },
        });
        if (!accepted) {
            setMessage('DEX IS FULL', 0.9);
            return false;
        }
        candyStock -= 1;
        rememberHUDMeal('candy');
        player.candyUseTime = 0.9;
        player.eatAnimationTime = EAT_ANIMATION_SECONDS;
        score += 50;
        setMessage('10g SUGAR', 0.8);
        spawnParticles(player.x + 6, player.y + 8, '#ffb13b');
        audio.candy();
        return true;
    }

    function usePumpInsulin() {
        if (gameState !== 'playing') return false;
        if (!pumpActive) {
            setMessage('NO PUMP', 0.7);
            return false;
        }
        if (autoPumpActive) {
            setMessage('AUTO MODE', 0.7);
            return false;
        }
        if (pumpInsulinStored <= 0) {
            setMessage('PUMP EMPTY', 0.7);
            return false;
        }

        pumpInsulinStored -= 1;
        deliverInsulin('pump');
        setMessage('PUMP 1 U', 0.8);
        spawnParticles(player.x + PLAYER_WIDTH / 2, player.y + 8, '#70f4ff', 8);
        return true;
    }

    // Én indgang til en faktisk dosis: lageropsamling må ikke starte denne
    // animation. Effekten vises på DEX, også hvis pen-pickup sker ved fuldt lager.
    function deliverInsulin(source) {
        physiologyEngine.addRapidInsulin({ units: 1 });
        player.insulinUseTime = 1;
        player.insulinUseSource = source;
        audio.insulin();
    }

    function updateAutoPump(deltaSeconds) {
        if (!autoPumpActive || gameState !== 'playing') return;
        autoPumpCooldownSeconds = Math.max(
            0,
            autoPumpCooldownSeconds - deltaSeconds,
        );
        if (pumpInsulinStored <= 0 || autoPumpCooldownSeconds > 0) return;

        // En pen tælles først som tilgængelig, når dens HUD-flyvetur er slut.
        // Det forhindrer, at en nyopsamlet pen både flyver mod et lagerfelt og
        // samtidig bliver brugt af automatikken undervejs.
        const insulinIsFlyingToStorage = hudPickupFlights.some(
            (flight) => flight.type === 'insulin' && flight.delaysHUDValue,
        );
        if (insulinIsFlyingToStorage || getGameBG() <= AUTO_PUMP_TRIGGER_BG_MMOL_L) {
            return;
        }

        // Kun en intern controller for DEX' faste, fiktive spilprofil. Dette
        // er ikke en klinisk pumpealgoritme eller et dosisforslag til spilleren.
        // Fratræk allerede givet hurtiginsulin, og genberegn efter hver pause;
        // der gemmes aldrig en plan om at affyre flere doser i rækkefølge.
        const activeInsulin = Math.max(0, physiologyState.displayIOB ?? physiologyState.iob ?? 0);
        const remainingCarbs = Math.max(0, physiologyState.cob || 0);
        const simulatedDemand = (getGameBG() - AUTO_PUMP_TRIGGER_BG_MMOL_L) / DEX_PROFILE.isf
            + remainingCarbs / DEX_PROFILE.icr - activeInsulin;
        if (!Number.isFinite(simulatedDemand) || simulatedDemand < 1) return;

        pumpInsulinStored -= 1;
        autoPumpCooldownSeconds = AUTO_PUMP_DOSE_COOLDOWN_SECONDS;
        deliverInsulin('pump');
        setMessage('AUTO PUMP 1 U', 0.9);
        spawnParticles(player.x + 3, player.y + 9, '#ffbd45', 10);
    }

    function setMessage(text, duration) {
        if (text.startsWith('HINT:')) {
            if (!tutorialEnabled || demoMode) return;
            const hintDuration = Math.max(12, duration) * HINT_TIME_SCALE;
            const hint = { text: text.replace(/^HINT:\s*/, ''), remaining: hintDuration, duration: hintDuration };
            if (!activeHint) activeHint = hint;
            else hintQueue.push(hint);
            return;
        }
        message = text;
        // Korte hændelser har eget spor og kan aldrig afbryde et betjeningstip.
        messageDuration = duration;
        messageTime = messageDuration;
        // Korte hændelsestekster fastholdes dér, hvor hændelsen skete. De
        // bliver derfor ikke ved med at følge DEX gennem banen.
        messageAnchorX = player.x - cameraX + PLAYER_WIDTH / 2;
        messageAnchorY = player.y - 5;
    }

    function updateHints(deltaSeconds) {
        if (!activeHint) return;
        activeHint.remaining -= deltaSeconds;
        if (activeHint.remaining <= 0) activeHint = hintQueue.shift() || null;
    }

    function setTutorialEnabled(enabled, persist = true) {
        tutorialEnabled = Boolean(enabled);
        tutorialToggle.textContent = `TUTORIAL: ${tutorialEnabled ? 'ON' : 'OFF'}`;
        tutorialToggle.setAttribute('aria-pressed', String(tutorialEnabled));
        if (!tutorialEnabled) {
            activeHint = null; hintQueue = [];
            keyboardIntroWaiting = false; keyboardIntroSeconds = 0; keyboardActionSeconds = 0;
        }
        drawKeyboardSketch();
        if (persist) {
            try { window.localStorage.setItem(TUTORIAL_STORAGE_KEY, tutorialEnabled ? 'on' : 'off'); } catch (_) { /* Privat tilstand kan afvise lagring. */ }
        }
    }

    function updateTutorialCues() {
        if (!tutorialEnabled || demoMode) return;
        for (const cue of stageCues) {
            if (cue.triggered || player.x < cue.x) continue;
            cue.triggered = true;
            if (discoveredTutorials.has(cue.id)) continue;
            discoveredTutorials.add(cue.id);
            setMessage(`HINT: ${cue.text}`, 12);
        }
    }

    function loseLife(reason, ignoreInvulnerability = false) {
        if (gameState !== 'playing') return;
        if (player.invulnerableTime > 0 && !ignoreInvulnerability) return;
        if (demoMode) {
            showAttractTitle();
            return;
        }
        lives -= 1;
        gameState = 'dying';
        dexActivity?.stop();
        deathTime = 1.7;
        deathReason = reason;
        player.vx = -player.facing * 22;
        player.vy = -155;
        player.onGround = false;
        audio.sadDeath();
    }

    function finishDeath() {
        if (lives <= 0) {
            gameState = 'game-over';
            showOverlay(
                'GAME OVER',
                deathReason,
                `SCORE ${score}  ·  PRESS Z / ARROW`,
            );
            announce(`Game over: ${deathReason}`);
            return;
        }

        gameState = 'life-lost';
        const livesLabel = lives === 1 ? '1 LIFE LEFT' : `${lives} LIVES LEFT`;
        showOverlay('LIFE LOST', deathReason, `${livesLabel}  ·  PRESS Z / ARROW`);
        announce(`Life lost: ${deathReason}`);
    }

    function updateDeath(deltaSeconds) {
        deathTime -= deltaSeconds;
        player.animationTime += deltaSeconds;
        player.vy += GRAVITY * 0.82 * deltaSeconds;
        player.x += player.vx * deltaSeconds;
        player.y += player.vy * deltaSeconds;
        updatePlayerTail(deltaSeconds);
        updateParticles(deltaSeconds);

        if (deathTime <= 0 || player.y > SCREEN_HEIGHT + 35) finishDeath();
    }

    function respawn() {
        if (dexRenderer) dexRenderer.reset();
        const savedScore = score;
        const savedLives = lives;
        resetRun({ keepScore: true, keepLives: true });
        score = savedScore;
        lives = savedLives;
        gameState = 'playing';
        hideOverlay();
    }

    function winLevel() {
        if (gameState !== 'playing') return;
        dexActivity?.stop();
        if (demoMode) {
            showAttractTitle();
            return;
        }
        const hasNextLevel = currentLevelIndex < levels.length - 1;
        const timeBonus = Math.floor(remainingTimeSeconds) * POINTS_PER_REMAINING_SECOND;
        const diamondBonus = collectedDiamondCount * POINTS_PER_DIAMOND;

        // Bonusserne gemmes som to regnskabslinjer og føres først ind i den
        // faktiske score, mens optællingen kører. Derfor tikker både HUD'en,
        // hver enkelt linje og TOTAL frem med præcis de samme heltal.
        stageClearTally = {
            hasNextLevel,
            scoreBefore: score,
            finalScore: score + timeBonus + diamondBonus,
            activeRowIndex: 0,
            rowElapsedSeconds: 0,
            lastTickIndex: -1,
            awards: [
                {
                    label: `TIME ${Math.floor(remainingTimeSeconds)} x ${POINTS_PER_REMAINING_SECOND}`,
                    value: timeBonus,
                    displayedValue: 0,
                },
                {
                    label: `DIAMONDS ${collectedDiamondCount} x ${POINTS_PER_DIAMOND}`,
                    value: diamondBonus,
                    displayedValue: 0,
                },
            ],
        };
        gameState = 'bonus-counting';
        showOverlay(
            `LEVEL ${currentLevelIndex + 1} COMPLETED`,
            '',
            'COUNTING BONUS...',
        );
        renderStageClearTally();
        announce('Level clear. Counting bonus points.');
    }

    function updateStageClearTally(deltaSeconds) {
        if (!stageClearTally) return;
        const tally = stageClearTally;
        const award = tally.awards[tally.activeRowIndex];
        if (!award) return;

        tally.rowElapsedSeconds += deltaSeconds;
        const progress = clamp(
            tally.rowElapsedSeconds / BONUS_TALLY_SECONDS_PER_ROW,
            0,
            1,
        );
        award.displayedValue = Math.round(award.value * progress);
        score = tally.scoreBefore
            + tally.awards.reduce((total, row) => total + row.displayedValue, 0);

        // Lyden begrænses til et fast antal små tik pr. række. Store bonusser
        // giver dermed ikke hundredvis af overlappende toner.
        const tickIndex = Math.floor(progress * BONUS_TALLY_TICKS_PER_ROW);
        if (tickIndex > tally.lastTickIndex && award.value > 0) {
            tally.lastTickIndex = tickIndex;
            audio.tallyTick(tally.activeRowIndex + tickIndex);
        }
        renderStageClearTally();

        if (progress < 1) return;
        award.displayedValue = award.value;
        tally.activeRowIndex += 1;
        tally.rowElapsedSeconds = 0;
        tally.lastTickIndex = -1;

        if (tally.activeRowIndex < tally.awards.length) return;
        score = tally.finalScore;
        gameState = 'won';
        audio.tallyComplete();
        renderStageClearTally();
        overlayPrompt.textContent = tally.hasNextLevel
            ? `TOTAL ${score}  ·  PRESS Z / ARROW FOR STAGE ${currentLevelIndex + 2}`
            : `TOTAL ${score}  ·  PRESS Z / ARROW TO PLAY AGAIN`;
        announce(`Total score ${score}`);
    }

    function renderStageClearTally() {
        if (!stageClearTally) return;
        const tally = stageClearTally;
        const rows = tally.awards.map((award) => {
            const paddedLabel = award.label.padEnd(19, ' ');
            return `${paddedLabel}+${String(award.displayedValue).padStart(6, ' ')}`;
        });
        const currentTotal = tally.scoreBefore
            + tally.awards.reduce((total, award) => total + award.displayedValue, 0);
        overlaySubtitle.classList.add('stage-tally');
        overlaySubtitle.textContent = [
            `SCORE BEFORE       ${String(tally.scoreBefore).padStart(6, ' ')}`,
            ...rows,
            '---------------------------',
            `TOTAL              ${String(currentTotal).padStart(6, ' ')}`,
        ].join('\n');
    }

    // Arkadespillet bruger altid modellens sande blodglukose. CGM-signalet
    // findes fortsat internt i fysiologimotoren, men dets forsinkelse og
    // eventuelle sensorstøj må ikke påvirke HUD, trendpil eller gameplay.
    function getGameBG() {
        return physiologyState && Number.isFinite(physiologyState.trueBG)
            ? physiologyState.trueBG
            : 9;
    }

    // Lineær degradering: 10 = ingen, 14,5 = halvdelen, 19 = fuld svækkelse.
    function getHighBGFatigue() {
        return clamp(
            (getGameBG() - HIGH_BG_FATIGUE_START_MMOL_L)
                / (HIGH_BG_FATIGUE_FULL_MMOL_L - HIGH_BG_FATIGUE_START_MMOL_L),
            0,
            1,
        );
    }

    function handleKeyDown(event) {
        const key = event.key.toLowerCase();
        const selectedLevelIndex = key === '0' ? 9 : Number.parseInt(key, 10) - 1;
        const isLevelShortcut = Number.isInteger(selectedLevelIndex)
            && selectedLevelIndex >= 0
            && selectedLevelIndex < levels.length;
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'z', ' '].includes(key)
            || isLevelShortcut) {
            event.preventDefault();
        }

        // I attract-demoen overtager den første spiltast øjeblikkeligt. Et
        // tal vælger fortsat bane, mens øvrige taster starter bane 1.
        const isGameplayControl = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'z', ' ']
            .includes(key) || isLevelShortcut;
        // Den første spiltast er samtidig den brugerhandling, som browseren
        // kræver for at tillade lyd. Spilleren behøver derfor intet ekstra klik.
        if (isGameplayControl && !event.repeat && !attractAudioUnlocked) {
            void unlockAttractAudio();
        }
        if (demoMode && isGameplayControl && !event.repeat) {
            const requestedLevel = isLevelShortcut ? selectedLevelIndex : 0;
            startLevel(requestedLevel);
            keys.left = key === 'arrowleft';
            keys.right = key === 'arrowright';
            if (key === 'arrowup' || key === ' ') jump();
            return;
        }

        // 1 og 2 vælger bane direkte fra enhver spiltilstand. Kontrollen
        // ligger før de almindelige starttaster, så tal aldrig bruger bolsje
        // eller fortsætter en afsluttet bane ved en fejl.
        if (isLevelShortcut && !event.repeat) {
            startLevel(selectedLevelIndex);
            return;
        }

        if (key === 'arrowleft') keys.left = true;
        if (key === 'arrowright') keys.right = true;

        const canStartOrRestart = gameState === 'title'
            || gameState === 'won'
            || gameState === 'game-over'
            || gameState === 'life-lost';
        const isStartKey = key === 'z'
            || key === 'a'
            || key === 'arrowleft'
            || key === 'arrowright'
            || key === 'arrowup'
            || key === 'arrowdown';
        if (canStartOrRestart && isStartKey && !event.repeat) {
            if (gameState === 'life-lost') {
                respawn();
            } else if (gameState === 'won' && currentLevelIndex < levels.length - 1) {
                startNextLevel();
            } else {
                startGame();
            }
            // Pil op starter banen med et hop. Venstre og højre er allerede sat
            // i keys ovenfor, så figuren løber straks i den valgte retning.
            if (key === 'arrowup') jump();
            return;
        }

        if (event.repeat) return;
        if (key === 'm') {
            toggleMusic();
            return;
        }
        if (key === 'l') {
            toggleSound();
            return;
        }
        if (key === 'arrowup' || key === ' ') jump();
        if (key === 'z') usePumpInsulin();
        if (key === 'a') useCandy();
    }

    function handleKeyUp(event) {
        const key = event.key.toLowerCase();
        if (key === 'arrowup' || key === ' ') releaseJump();
        if (key === 'arrowleft') keys.left = false;
        if (key === 'arrowright') keys.right = false;
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => {
        releaseJump();
        keys.left = false;
        keys.right = false;
    });
    canvas.addEventListener('pointerdown', () => {
        canvas.focus();
        if (gameState === 'title' || demoMode) startGame();
    });
    overlay.addEventListener('pointerdown', () => {
        // Klik på attract-skærmene bruges alene til at låse browserlyden op.
        // Banen starter fortsat med piletasterne som angivet på forsiden.
        unlockAttractAudio();
        canvas.focus();
    });
    musicToggle.addEventListener('click', () => {
        toggleMusic();
        canvas.focus();
    });
    soundToggle.addEventListener('click', () => {
        toggleSound();
        canvas.focus();
    });
    tutorialToggle.addEventListener('click', () => { setTutorialEnabled(!tutorialEnabled); canvas.focus(); });

    function update(deltaSeconds) {
        if (gameState === 'title') {
            updateAttractLoop(deltaSeconds);
            return;
        }
        if (gameState === 'dying') {
            updateDeath(deltaSeconds);
            return;
        }
        if (gameState === 'bonus-counting') {
            updateStageClearTally(deltaSeconds);
            return;
        }
        if (gameState === 'life-lost') return;
        if (gameState !== 'playing') return;

        if (demoMode) {
            updateDemoController(deltaSeconds);
            if (gameState !== 'playing') return;
        }

        updateTutorialCues();
        updateKeyboardSketch(deltaSeconds);
        // Tipsets læsetid følger væguret. Hele spilverdenen, inklusive BG,
        // projektiler, faldende gulve og tidsbonus, bruger samme slowmotion.
        const tutorialSlow = tutorialEnabled && !demoMode && activeHint;
        // Den sidste del øger hastigheden blødt fra 6% til normal.
        // Alle spilure deler faktoren; tipsets nedtælling bruger fortsat væguret.
        const resumeProgress = tutorialSlow ? clamp(1 - activeHint.remaining / HINT_RESUME_SECONDS, 0, 1) : 1;
        const tutorialSpeed = 0.06 + 0.94 * resumeProgress * resumeProgress * (3 - 2 * resumeProgress);
        updateHints(deltaSeconds);
        if (tutorialSlow) deltaSeconds *= tutorialSpeed;
        elapsedRealSeconds += deltaSeconds;
        const previousTimerSecond = Math.ceil(remainingTimeSeconds);
        remainingTimeSeconds = Math.max(0, remainingTimeSeconds - deltaSeconds);
        const timerSecond = Math.ceil(remainingTimeSeconds);
        // Ét bip ved hvert nyt sekund, ikke ved hver frame. Følger spillets
        // eget ur, så pause og tutorial-slowmotion også gælder advarslen.
        if (timerSecond > 0 && timerSecond <= 10 && timerSecond < previousTimerSecond) {
            audio.countdownBeep();
        }
        if (remainingTimeSeconds <= 0) {
            loseLife('TIME UP');
            return;
        }
        player.animationTime += deltaSeconds;
        player.eatAnimationTime = Math.max(0, player.eatAnimationTime - deltaSeconds);
        player.candyUseTime = Math.max(0, player.candyUseTime - deltaSeconds);
        player.insulinUseTime = Math.max(0, player.insulinUseTime - deltaSeconds);
        player.invulnerableTime = Math.max(0, player.invulnerableTime - deltaSeconds);
        messageTime = Math.max(0, messageTime - deltaSeconds);
        updateStageObstacles(deltaSeconds);
        updatePlayer(deltaSeconds);
        updatePlayerTail(deltaSeconds);
        updateEnemies(deltaSeconds);
        updateBananaPeels(deltaSeconds);
        if(gameState !== 'playing') return;
        updateCheeseProjectiles(deltaSeconds);
        if(gameState !== 'playing') return;
        collectObjects();
        updateParticles(deltaSeconds);
        updateHUDPickupFlights(deltaSeconds);
        updatePhysiology(deltaSeconds);
        // Kontraktionsoptag er allerede indeholdt i motorens Q2-ligning.
        // Det driver kun glimmeret her, ikke endnu et BG-fradrag.
        if(gameState==='playing')muscleDust.update(deltaSeconds,
            physiologyEngine.hovorka.beta*physiologyEngine.hovorka.state[HOVORKA_STATE_IDX.E1],
            {x:player.x+PLAYER_WIDTH/2,y:player.y+PLAYER_HEIGHT});
        if (dexRenderer) dexRenderer.advance(deltaSeconds, player,
            physiologyEngine.smoothHeartRate,physiologyEngine.hovorka.HR_base);
        updateAutoPump(deltaSeconds);
        updateCamera();

        if (player.y > SCREEN_HEIGHT - HUD_HEIGHT - 8) {
            loseLife(DEXTRO_THEMES[getCurrentLevel().theme || 'orchard'].lava ? 'FELL INTO LAVA' : 'FELL INTO A PIT', true);
        }
        if (player.x >= getCurrentLevel().finishX) winLevel();
    }

    function updatePlayer(deltaSeconds) {
        player.previousY = player.y;
        const eating = player.eatAnimationTime > 0;
        const highBGFatigue = getHighBGFatigue();
        const fatigueSpeedFactor = 1
            - highBGFatigue * (1 - HIGH_BG_MIN_SPEED_FACTOR);
        const fatigueAccelerationFactor = 1
            - highBGFatigue * (1 - HIGH_BG_MIN_ACCELERATION_FACTOR);
        const currentMaxRunSpeed = MAX_RUN_SPEED
            * (eating ? EATING_SPEED_FACTOR : 1)
            * fatigueSpeedFactor * (player.superShoesActive?1.25:1);
        const currentRunAcceleration = RUN_ACCELERATION
            * (eating ? 0.18 : 1)
            * fatigueAccelerationFactor;
        const direction = Number(keys.right) - Number(keys.left);
        if (direction !== 0) {
            player.vx += direction * currentRunAcceleration * deltaSeconds;
            player.vx = clamp(player.vx, -currentMaxRunSpeed, currentMaxRunSpeed);
            player.facing = direction;
        } else {
            const friction = GROUND_FRICTION * (eating ? 1.45 : 1) * deltaSeconds;
            if (Math.abs(player.vx) <= friction) player.vx = 0;
            else player.vx -= Math.sign(player.vx) * friction;
        }

        // Hvis spilleren rammer et måltid med fuld fart, begrænses den
        // resterende hastighed også uden at fjerne momentum helt.
        player.vx = clamp(player.vx, -currentMaxRunSpeed, currentMaxRunSpeed);

        const previousX = player.x;
        player.x += player.vx * deltaSeconds;
        resolveSolidSides(previousX);
        // Kameraets venstre kant må ikke fungere som en usynlig mur. Figuren
        // kan gå tilbage gennem hele den allerede besøgte bane, men aldrig
        // længere til venstre end sit oprindelige startpunkt.
        if (player.x <= PLAYER_START_X) {
            player.x = PLAYER_START_X;
            if (player.vx < 0) player.vx = 0;
        }
        player.x = Math.min(getCurrentLevel().width - PLAYER_WIDTH, player.x);

        player.vy += GRAVITY * (player.superShoesActive&&player.vy>0?1.25:1) * deltaSeconds;
        player.y += player.vy * deltaSeconds;
        player.onGround = false;
        resolvePlatformCollisions();
        // Mål reel bevægelse efter vægkollisioner, ikke blot en holdt tast.
        // Hop opad er også arbejde; et passivt fald er ikke et cardio-pas.
        const horizontalSpeed=deltaSeconds>0?Math.abs(player.x-previousX)/deltaSeconds:0;
        player.exerting=(direction!==0 && horizontalSpeed>1)
            || (!player.onGround && player.vy < -1);
        if (player.onGround && Math.abs(player.vx) > 1) {
            // Løbecyklussen følger den faktisk tilbagelagte afstand. Dermed
            // passer fodarbejdet til banens bevægelse ved alle hastigheder.
            player.runAnimationDistance += Math.abs(player.vx) * deltaSeconds;
        }
    }

    function resolvePlatformCollisions() {
        const previousBottom = player.previousY + PLAYER_HEIGHT;
        const currentBottom = player.y + PLAYER_HEIGHT;

        for (const platform of [...platforms, ...cacheBlocks]) {
            if (platform.collapsed) continue;
            const horizontalOverlap = player.x + PLAYER_WIDTH > platform.x + 1
                && player.x < platform.x + platform.width - 1;
            const crossedTop = previousBottom <= platform.y + 2 && currentBottom >= platform.y;
            if (platform.solid && horizontalOverlap && player.vy < 0
                && player.previousY >= platform.y + platform.height
                && player.y <= platform.y + platform.height) {
                player.y = platform.y + platform.height;
                player.vy = 0;
                player.jumpCanBeShortened = false;
                if ('reward' in platform) hitCacheBlock(platform);
                return;
            }
            if (horizontalOverlap && crossedTop && player.vy >= 0) {
                player.y = platform.y - PLAYER_HEIGHT;
                player.vy = 0;
                player.onGround = true;
                player.jumpCanBeShortened = false;
                if (platform.crumble && platform.crumbleTime === null) platform.crumbleTime = 1.1;
                return;
            }
        }
    }

    function resolveSolidSides(previousX) {
        for (const wall of [...platforms, ...cacheBlocks]) {
            if (!wall.solid || wall.collapsed || player.y + PLAYER_HEIGHT <= wall.y + 0.1
                || player.y >= wall.y + wall.height - 0.1) continue;
            if (previousX + PLAYER_WIDTH <= wall.x && player.x + PLAYER_WIDTH > wall.x) {
                player.x = wall.x - PLAYER_WIDTH; player.vx = 0;
            } else if (previousX >= wall.x + wall.width && player.x < wall.x + wall.width) {
                player.x = wall.x + wall.width; player.vx = 0;
            }
        }
    }

    function hitCacheBlock(block) {
        if (block.used) return;
        block.used = true; block.bumpTime = 0.2;
        // Lodtræk først ved slaget, uafhængigt af banens faste seed og DEX's BG.
        // Puljen beholder banens eksisterende udstyrstrin og madtyper.
        const level = getCurrentLevel();
        const rewards = [...new Set((level.blocks || []).map(b=>b.reward))];
        const landingX = block.x + block.width / 2 + 48 - 11;
        const canLand = platforms.some(p=>!p.collapsed && !p.crumble
            && p.y>=block.y+block.height && p.x<=landingX && p.x+p.width>=landingX+22);
        const eligible = rewards.filter(reward=>reward!=='monster'||canLand);
        block.reward = eligible[Math.floor(Math.random()*eligible.length)] || 'diamonds';
        if(block.reward==='monster'){
            block.monsterType=level.roster[Math.floor(Math.random()*level.roster.length)];
        }
        audio.pickup();
        if (block.reward === 'diamonds') {
            collectedDiamondCount += 5;
            spawnScoreParticle(block.x+9,block.y,5*POINTS_PER_DIAMOND,' BONUS');
            // En tydelig diamant springer ud, mens bonus stadig kun bogføres én gang.
            particles.push({x:block.x+9,y:block.y-4,vx:0,vy:-48,life:0.8,maximumLife:0.8,
                color:'#a1f4ff',text:'◆',fontSize:12});
        } else if (block.reward === 'monster') {
            const centerX = block.x + block.width / 2;
            // Find den landingsflade, der gjorde monsterudfaldet muligt.
            const landingX = centerX + 48 - 11;
            const floor = platforms.filter(p => !p.collapsed && !p.crumble
                && p.y >= block.y + block.height && p.x <= landingX
                && p.x+p.width >= landingX+22).sort((a,b)=>a.y-b.y)[0];
            if (floor) {
                const enemy = createEnemy({type:block.monsterType,x:landingX,y:floor.y-14,
                    speed:20+currentLevelIndex,minX:Math.max(floor.x,landingX-35),
                    maxX:Math.min(floor.x+floor.width,landingX+95)},enemies.length);
                enemy.cacheEntrance = {age:0,x:centerX-11,y:block.y,
                    landingX,landingY:floor.y-22};
                enemy.x=centerX-11; enemy.y=block.y;
                enemy.direction=1;
                enemies.push(enemy);
            }
        } else {
            // Genstanden springer ud ovenpå kassen og skal stadig samles op.
            items.push({type:block.reward,x:block.x+9,y:block.y-12,collected:false});
        }
        spawnParticles(block.x+9,block.y,'#baecff',12);
    }

    function updateStageObstacles(dt) {
        for (const block of cacheBlocks) block.bumpTime = Math.max(0,block.bumpTime-dt);
        for (const p of platforms) {
            if (!p.crumble) continue;
            // Et sammenstyrtet gulv gendannes kun ved banens genstart.
            if (!p.collapsed && p.crumbleTime !== null) {
                p.crumbleTime -= dt;
                if (p.crumbleTime <= 0) {
                    p.collapsed=true;
                    spawnParticles(p.x+p.width/2,p.y,'#aa988a',16);
                }
            }
        }
    }

    function updateEnemies(deltaSeconds) {
        // Nærhedsgraden beregnes på ny hver frame. Den bruges kun til at åbne
        // munden før kontakt; kulhydrat tilføjes fortsat først ved kollision.
        player.eatAnticipation = 0;
        for (const [enemyIndex, enemy] of enemies.entries()) {
            if (enemy.biteAnimationTime > 0) {
                const previousBiteTime = enemy.biteAnimationTime;
                enemy.biteAnimationTime = Math.max(0, enemy.biteAnimationTime - deltaSeconds);
                // Én lille saftsky ved selve slurpet, også hvis en langsom
                // frame krydser tidspunktet. Ingen ekstra mad registreres her.
                if (previousBiteTime > ENEMY_BITE_FRAME_SECONDS * 0.35
                    && enemy.biteAnimationTime <= ENEMY_BITE_FRAME_SECONDS * 0.35) {
                    const mouth = getEatingMouthPosition();
                    spawnFoodPulp(mouth.x, mouth.y, enemy.type, player.facing, 12);
                }
                continue;
            }
            if (!enemy.alive) continue;

            if (enemy.cacheEntrance) {
                const entrance=enemy.cacheEntrance;
                entrance.age += deltaSeconds;
                // Først løftes figuren ud af åbningen, derefter hopper den
                // til støttet jord. Ingen kontakt/angreb inde i selve kassen.
                if (entrance.age < 0.35) {
                    const t=entrance.age/0.35;
                    enemy.y=entrance.y-enemy.height*t*t*(3-2*t);
                } else {
                    const t=clamp((entrance.age-0.35)/0.65,0,1);
                    enemy.x=entrance.x+(entrance.landingX-entrance.x)*t;
                    enemy.y=entrance.y-enemy.height
                        +(entrance.landingY-(entrance.y-enemy.height))*t
                        -Math.sin(t*Math.PI)*32;
                    if(t===1) enemy.cacheEntrance=null;
                }
                continue;
            }

            updateFizzState(enemy, enemyIndex, deltaSeconds);
            updatePizzaThrowState(enemy, enemyIndex, deltaSeconds);
            updateEggState(enemy, deltaSeconds);
            if (!enemy.alive) continue;

            // En rystende Fizzler og et Pizza Monster i kasteoptræk står stille.
            // Spilleren kan derfor aflæse begge angreb før kontaktøjeblikket.
            const enemySpeedFactor = enemy.fizzState === 'shaking'
                || enemy.cheeseWindupTime > 0 || enemy.eggDrop || enemy.peelThrow
                ? 0
                : 1;
            enemy.x += enemy.speed * enemy.direction * enemySpeedFactor * deltaSeconds;
            // Stillestående monstre kan være placeret præcis ved minX.
            // De må ikke spejlvendes hver frame. Gående monstre vender kun
            // ved den kant, de bevæger sig imod, ikke den de netop forlod.
            const reachedPatrolEdge = enemy.direction < 0
                ? enemy.x <= enemy.minX
                : enemy.x + enemy.width >= enemy.maxX;
            if (enemy.speed > 0 && enemySpeedFactor > 0 && reachedPatrolEdge) {
                enemy.direction *= -1;
                enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.width);
            }
            if(enemy.type==='banana') updateBananaDrop(enemy,deltaSeconds);

            if (player.eatAnimationTime <= 0
                && player.onGround) {
                const facingRight = player.facing > 0;
                const forwardGap = facingRight
                    ? enemy.x - (player.x + PLAYER_WIDTH)
                    : player.x - (enemy.x + enemy.width);
                const sameGroundBand = Math.abs(
                    (player.y + PLAYER_HEIGHT) - (enemy.y + enemy.height),
                ) < 12;
                if (sameGroundBand && forwardGap >= 0 && forwardGap < 30) {
                    player.eatAnticipation = Math.max(
                        player.eatAnticipation,
                        1 - forwardGap / 30,
                    );
                }
            }

            if (!rectanglesOverlap(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
                enemy.x, enemy.y, enemy.width, enemy.height)) continue;

            if (enemy.type === 'egg' && ['falling','rolling'].includes(enemy.eggState)) {
                loseLife('HIT BY A ROLLING EGG', true); continue;
            }

            const previousBottom = player.previousY + PLAYER_HEIGHT;
            if (player.vy > 0 && previousBottom <= enemy.y + 7) {
                // Et præcist tramp fungerer som et super-hop. Figuren placeres
                // oven på fjenden før afsættet, så den ikke starter inde i den.
                player.y = enemy.y - PLAYER_HEIGHT;
                player.jumpCanBeShortened = false;
                player.vy = enemy.fizzState === 'shaking'
                    ? FIZZ_SHAKE_BOUNCE_SPEED
                    : ENEMY_BOUNCE_SPEED;
                player.onGround = false;

                if (enemy.fizzState === 'shaking') {
                    // Under rystelsen fungerer Fizzler som et kraftigt, men
                    // sikkert springbræt ved kontakt ovenfra. Den overlever,
                    // så faren ikke pludselig ændres midt i opspringet.
                    setMessage('FIZZ BOOST!', 0.75);
                    spawnParticles(enemy.x + 11, enemy.y + 7, '#ffb34d', 14);
                    audio.stomp();
                    continue;
                }

                enemy.alive = false;
                const monsterProfile = FOOD_MONSTER_PROFILES[enemy.type];
                score += monsterProfile.stompPoints;
                setMessage(
                    `${monsterProfile.stompMessage} +${monsterProfile.stompPoints}`,
                    0.75,
                );
                spawnParticles(enemy.x + 11, enemy.y + 7, '#7cf5ff', 10);
                spawnScoreParticle(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    monsterProfile.stompPoints,
                );
                audio.stomp();
            } else {
                if (enemy.fizzState === 'shaking') {
                    // Fra siden starter den normale spisehandling, men den
                    // rystede sodavand eksploderer straks i stedet for at give
                    // kulhydrat. Det er den eneste farlige Fizzler-tilstand.
                    enemy.alive = false;
                    player.eatAnticipation = 0;
                    spawnFizzlerExplosion(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                    );
                    loseLife('FIZZLER EXPLODED', true);
                    continue;
                }
                eatEnemy(enemy);
            }
        }
    }

    function updateEggState(enemy, dt) {
        if (!enemy.eggDrop || !enemy.alive || !Number.isFinite(dt) || dt<=0) return;
        const floors=[...platforms,...cacheBlocks].filter(p=>!p.collapsed);
        // Små fysiktrin samt kontrol af den krydsede overflade forhindrer, at
        // en langsom frame springer gennem et tyndt gulv eller en væg.
        for(let remaining=dt;remaining>0 && enemy.alive;) {
            const step=Math.min(remaining,1/120);remaining-=step;
            if(enemy.eggState==='perched') {
                if(Math.abs(player.x-enemy.x)<145) {
                    enemy.eggState='warning';enemy.eggTimer=1.4;
                    enemy.direction=player.x<enemy.x?-1:1;
                }
                continue;
            }
            if(enemy.eggState==='warning') {
                enemy.eggTimer-=step;
                enemy.eggTuck=clamp(1-enemy.eggTimer/.24,0,1);
                if(enemy.eggTimer<=0) {
                    // Rul først hen til kanten af afsatsen. Ignorér aldrig
                    // afsatsen for at tvinge et fald gennem den.
                    enemy.eggState='rolling';enemy.eggTimer=2.6;enemy.eggVelocityY=0;
                }
                continue;
            }
            const rolling=enemy.eggState==='rolling'||enemy.eggState==='falling';
            const oldX=enemy.x,oldBottom=enemy.y+enemy.height;
            if(rolling) enemy.x+=enemy.direction*EGG_ROLL_SPEED*step;
            for(const wall of floors) {
                if(!wall.solid || enemy.y>=wall.y+wall.height || oldBottom<=wall.y+.01) continue;
                if(enemy.x>oldX && oldX+enemy.width<=wall.x+.01 && enemy.x+enemy.width>=wall.x) {
                    enemy.x=wall.x-enemy.width;enemy.direction=-1;
                } else if(enemy.x<oldX && oldX>=wall.x+wall.width-.01 && enemy.x<=wall.x+wall.width) {
                    enemy.x=wall.x+wall.width;enemy.direction=1;
                }
            }
            const maximumX=getCurrentLevel().width-enemy.width;
            if(enemy.x<0){enemy.x=0;enemy.direction=1;}
            if(enemy.x>maximumX){enemy.x=maximumX;enemy.direction=-1;}
            if(rolling) enemy.eggRotation+=(enemy.x-oldX)/EGG_ROLL_RADIUS;
            enemy.eggVelocityY+=220*step;
            enemy.y+=enemy.eggVelocityY*step;
            const landing=floors.filter(floor=>oldBottom<=floor.y+.01
                && enemy.y+enemy.height>=floor.y
                && enemy.x+enemy.width>floor.x+1 && enemy.x<floor.x+floor.width-1)
                .sort((a,b)=>a.y-b.y)[0];
            if(landing) {
                enemy.y=landing.y-enemy.height;enemy.eggVelocityY=0;
                if(rolling) {
                    enemy.eggTimer-=step;
                    enemy.eggState=enemy.eggTimer>0?'rolling':'resting';
                }
            } else enemy.eggState='falling';
            if(enemy.eggState==='resting') {
                // Ret skallen op før benene foldes ud igen, uden et brat
                // spring fra den aktuelle rotation til nul grader.
                const angle=Math.atan2(Math.sin(enemy.eggRotation),Math.cos(enemy.eggRotation));
                enemy.eggRotation-=angle*Math.min(1,step*14);
                if(Math.abs(angle)<.2) enemy.eggTuck=Math.max(0,enemy.eggTuck-step*5);
            } else enemy.eggTuck=Math.min(1,enemy.eggTuck+step*6);
            // Rigtige huller er stadig huller; der findes ikke et usynligt
            // gulv i groundY. Fjern først ægget, når det er ude af billedet.
            if(enemy.y>SCREEN_HEIGHT-HUD_HEIGHT+100) enemy.alive=false;
        }
    }

    function updateFizzState(enemy, enemyIndex, deltaSeconds) {
        if (enemy.type !== 'soda') return;

        enemy.fizzTimer = Math.max(0, enemy.fizzTimer - deltaSeconds);
        if (enemy.fizzTimer > 0) return;

        if (enemy.fizzState === 'normal') {
            // Forvarslet er stadig spiseligt; kun den efterfølgende rystelse er farlig.
            enemy.fizzState = 'warning';
            enemy.fizzTimer = FIZZ_WARNING_SECONDS;
            return;
        }
        if (enemy.fizzState === 'warning') {
            enemy.fizzState = 'shaking';
            enemy.fizzTimer = FIZZ_SHAKE_SECONDS;
            return;
        }

        // Efter rystelsen går Fizzler tilbage til normal gang. Den
        // deterministiske variation føles uforudsigelig uden at gøre en
        // playtest afhængig af Math.random().
        enemy.fizzState = 'normal';
        const cooldownVariation = (
            enemyIndex * 1.7 + enemy.fizzCycleIndex * 1.3
        ) % FIZZ_COOLDOWN_VARIATION_SECONDS;
        enemy.fizzTimer = FIZZ_MIN_COOLDOWN_SECONDS + cooldownVariation;
        enemy.fizzCycleIndex += 1;
    }

    function updatePizzaThrowState(enemy, enemyIndex, deltaSeconds) {
        if (enemy.type !== 'pizza') return;
        // Senere pizzamøder må ikke bombardere starten fra flere skærme væk.
        // Et allerede varslet kast færdiggøres stadig mod det låste mål.
        if (enemy.cheeseWindupTime <= 0 && Math.abs(enemy.x-player.x)>190) return;

        if (enemy.cheeseWindupTime > 0) {
            enemy.cheeseWindupTime = Math.max(
                0,
                enemy.cheeseWindupTime - deltaSeconds,
            );
            if (enemy.cheeseWindupTime === 0) {
                launchCheeseProjectile(enemy);
                const variation = (
                    enemyIndex * 0.73 + enemy.cheeseThrowCycleIndex * 1.17
                ) % PIZZA_THROW_COOLDOWN_VARIATION_SECONDS;
                enemy.cheeseThrowTimer = PIZZA_THROW_MIN_COOLDOWN_SECONDS
                    + variation;
                enemy.cheeseThrowCycleIndex += 1;
            }
            return;
        }

        enemy.cheeseThrowTimer = Math.max(0, enemy.cheeseThrowTimer - deltaSeconds);
        if (enemy.cheeseThrowTimer > 0) return;

        const enemyCenterX = enemy.x + enemy.width / 2;
        const playerCenterX = player.x + PLAYER_WIDTH / 2;
        if (Math.abs(playerCenterX - enemyCenterX) > PIZZA_THROW_RANGE) return;

        // Monsteret stopper og sigter i 1,4 sekunder. Målet låses allerede nu,
        // så spilleren kan undvige under optrækket uden at blive fulgt af sigtet.
        enemy.direction = playerCenterX >= enemyCenterX ? 1 : -1;
        enemy.cheeseTargetX = playerCenterX;
        enemy.cheeseTargetY = player.y + PLAYER_HEIGHT / 2;
        enemy.cheeseWindupTime = PIZZA_THROW_WINDUP_SECONDS;
    }

    function launchCheeseProjectile(enemy) {
        const startX = enemy.x + enemy.width / 2 + enemy.direction * 11;
        const startY = enemy.y + 8;
        const targetX = enemy.cheeseTargetX;
        const targetY = enemy.cheeseTargetY;
        const deltaX = targetX - startX;
        const deltaY = targetY - startY;
        const flightSeconds = clamp(Math.abs(deltaX) / 105, 0.72, 1.35);

        cheeseProjectiles.push({
            x: startX,
            y: startY,
            vx: deltaX / flightSeconds,
            vy: (deltaY - 0.5 * CHEESE_PROJECTILE_GRAVITY
                * flightSeconds * flightSeconds) / flightSeconds,
            rotation: 0,
            life: 2.4,
            active: true,
        });
        spawnParticles(startX, startY, '#ffd45b', 7);
    }

    function updateCheeseProjectiles(deltaSeconds) {
        for (const projectile of cheeseProjectiles) {
            if (!projectile.active) continue;
            projectile.x += projectile.vx * deltaSeconds;
            projectile.y += projectile.vy * deltaSeconds;
            projectile.vy += CHEESE_PROJECTILE_GRAVITY * deltaSeconds;
            projectile.rotation += deltaSeconds * 7 * Math.sign(projectile.vx || 1);
            projectile.life -= deltaSeconds;

            if (rectanglesOverlap(
                player.x,
                player.y,
                PLAYER_WIDTH,
                PLAYER_HEIGHT,
                projectile.x - 4,
                projectile.y - 3,
                8,
                7,
            )) {
                projectile.active = false;
                spawnParticles(projectile.x, projectile.y, '#ffd45b', 14);
                loseLife('HIT BY MELTED CHEESE');
                continue;
            }

            if (projectile.life <= 0
                || projectile.y >= getCurrentLevel().groundY
                || projectile.x < -30
                || projectile.x > getCurrentLevel().width + 30) {
                projectile.active = false;
                if (projectile.y >= getCurrentLevel().groundY) {
                    spawnParticles(projectile.x, getCurrentLevel().groundY - 2, '#ffd45b', 5);
                }
            }
        }
        cheeseProjectiles = cheeseProjectiles.filter((projectile) => projectile.active);
    }

    function eatEnemy(enemy) {
        enemy.alive = false;
        enemy.biteAnimationTime = ENEMY_BITE_FRAME_SECONDS;
        // Figuren vender altid den store mund mod måltidet, også hvis
        // sidekollisionen sker lige efter et retningsskift.
        player.facing = enemy.x + enemy.width / 2 >= player.x + PLAYER_WIDTH / 2
            ? 1 : -1;
        // Indtrækningen får 0,66 sekunder og efterfølges af en kort tygning.
        // 3D-munden holdes åben til sidste del af indtrækningen er overstået.
        player.eatAnimationTime = EAT_ANIMATION_SECONDS * 0.9;
        player.eatAnticipation = 0;
        player.vx *= 0.34;

        const monsterProfile = FOOD_MONSTER_PROFILES[enemy.type];
        const referenceNutrition = monsterProfile.referenceNutrition;
        const portionScale = enemy.portionScale ?? (enemy.carbs === undefined ? 1 : enemy.carbs / referenceNutrition.carbs);
        const portionCarbs = referenceNutrition.carbs * portionScale;
        const accepted = physiologyEngine.addFood({
            carbs: portionCarbs,
            protein: referenceNutrition.protein * portionScale,
            fat: referenceNutrition.fat * portionScale,
            weight: referenceNutrition.weight * portionScale,
            eatTimeMin: referenceNutrition.eatTimeMin * portionScale,
            carbParams: monsterProfile.carbParams,
        });
        if (accepted) rememberHUDMeal(enemy.type);

        setMessage(
            `${monsterProfile.name} +${portionCarbs}g CARBS`,
            1,
        );
        spawnFoodPulp(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.type,
            player.facing,
            5,
        );
        audio.eat();
        spawnMacroParticles(enemy.x+11,enemy.y,{carbs:portionCarbs,
            protein:referenceNutrition.protein*portionScale,fat:referenceNutrition.fat*portionScale});
    }

    function spawnMacroParticles(x,y,values) {
        Object.entries(values).forEach(([key,value],index) => {
            if (value < 0.05) return;
            particles.push({kind:'macro',text:`${value.toFixed(1).replace(/\.0$/,'')}g ${key.toUpperCase()}`,
                x,y:y-index*7,vx:7,vy:-12,gravity:0,life:2,maximumLife:2,color:DEXTRO_MACRO_COLORS[key]});
        });
    }

    function collectObjects() {
        for (const item of items) {
            if (item.collected || !rectanglesOverlap(player.x, player.y, PLAYER_WIDTH,
                PLAYER_HEIGHT, item.x - 11, item.y - 11, 22, 22)) continue;

            // Den manuelle pumpe bliver liggende, når rygsækken er aktiv.
            // Spring over før point, lyd, tips og pickup-animationer.
            if (item.type === 'pump' && autoPumpActive) continue;
            item.collected = true;
            score += 100;
            if(item.type==='heart'){
                lives+=1;
                spawnParticles(item.x,item.y,'#ff365b',14);
                setMessage('EXTRA LIFE',1);audio.pickup();
            }else if(item.type==='superShoes'){
                player.superShoesActive=true;
                spawnParticles(item.x,item.y,'#ffd85b',14);
                setMessage('SUPER SHOES\nFaster running. Higher jumps. Faster falls.',2);audio.pickup();
            }else if (item.type === 'sugarCane') {
                const accepted = physiologyEngine.addFood({carbs:12,protein:0,fat:0,weight:12,eatTimeMin:0.4,
                    carbParams:{simpleFraction:1,fiberPerGram:0,retentionFactor:0.4}});
                if (accepted) rememberHUDMeal('sugarCane');
                player.candyUseTime=0.8; spawnMacroParticles(item.x,item.y,{carbs:12}); audio.candy();
            } else if (item.type === 'autoPump') {
                startHUDPickupFlight('autoPump', item.x, item.y, 123, 23);
                pumpActive = true;
                autoPumpActive = true;
                autoPumpCooldownSeconds = 0;
                pumpHUDUnlocked = true;
                // Auto-pumpen er en opgradering. Eventuelle doser i den
                // manuelle pumpe flyttes med over i rygsækkens tre pladser.
                if (!autoPumpHintShown) {
                    setMessage('HINT: AUTO PUMP\nStores 3 ampoules. Uses stored insulin automatically.\nExtra ampoules are used on contact when full.', 12);
                    autoPumpHintShown = true;
                } else {
                    setMessage('AUTO PUMP READY', 0.9);
                }
                spawnParticles(item.x, item.y, '#ffbd45', 14);
                audio.pickup();
            } else if (item.type === 'pump') {
                // At løbe tilbage til en gammel pumpe må ikke nedgradere
                // rygsækken eller kassere de doser, der allerede er samlet.
                if (pumpActive) {
                    setMessage('PUMP ALREADY EQUIPPED', 0.8);
                    audio.pickup();
                    continue;
                }
                startHUDPickupFlight('pump', item.x, item.y, 123, 23);
                pumpActive = true;
                pumpHUDUnlocked = true;
                remindActionKeys();
                if (!pumpHintShown) {
                    setMessage('HINT: MANUAL PUMP\nStores 3 ampoules. Press "Z" to use stored insulin.\nExtra ampoules are used on contact when full.', 12);
                    pumpHintShown = true;
                } else {
                    setMessage('PUMP READY', 0.8);
                }
                spawnParticles(item.x, item.y, '#70f4ff', 12);
                audio.pickup();
            } else if (item.type === 'insulin' && pumpActive && pumpInsulinStored < 3) {
                // Lagerpladsen beregnes før tælleren hæves, så pennen flyver
                // direkte ind i den første, anden eller tredje tomme ramme.
                startHUDPickupFlight(
                    'insulin',
                    item.x,
                    item.y,
                    139 + pumpInsulinStored * 12,
                    23,
                    true,
                );
                pumpInsulinStored += 1;
                if (!autoPumpActive) remindActionKeys();
                setMessage(`PUMP ${pumpInsulinStored}/3`, 0.7);
                spawnParticles(item.x, item.y, '#79efff');
                audio.pickup();
            } else if (item.type === 'insulin') {
                // Uden pumpen gives dosis straks. Flyveturen ender derfor ved
                // IOB-tallet i stedet for i en lagerplads.
                startHUDPickupFlight('insulin', item.x, item.y, 299, 48);
                deliverInsulin('pen');
                setMessage(pumpActive ? 'FULL PACK: 1 U USED' : '1 U INSULIN', 0.8);
                spawnParticles(item.x, item.y, '#79efff');
            } else {
                startHUDPickupFlight('candy', item.x, item.y, 123, 8, true);
                candyStock += 1;
                remindActionKeys();
                candyHUDUnlocked = true;
                if (!candyHintShown) {
                    setMessage('HINT: CANDY COLLECTED\nPress "A" to eat a stored candy.', 12);
                    candyHintShown = true;
                } else {
                    setMessage('+1 CANDY', 0.65);
                }
                spawnParticles(item.x, item.y, '#ffc24a');
                audio.pickup();
            }
        }

        for (const diamond of diamonds) {
            if (diamond.collected || !rectanglesOverlap(player.x, player.y, PLAYER_WIDTH,
                PLAYER_HEIGHT, diamond.x - 5, diamond.y - 6, 10, 12)) continue;
            diamond.collected = true;
            collectedDiamondCount += 1;
            spawnParticles(diamond.x, diamond.y, '#67f5ff', 7);
            // Vis optjent slutbonus uden at lægge den i scoren to gange.
            spawnScoreParticle(diamond.x, diamond.y, POINTS_PER_DIAMOND, ' BONUS');
            audio.pickup();
        }
    }

    function updatePhysiology(deltaSeconds) {
        if(gameState!=='playing'||!(deltaSeconds>0))return;
        dexActivity.update({moving:player.exerting,superShoes:player.superShoesActive});
        physiologyEngine.step(deltaSeconds * SIMULATION_MINUTES_PER_REAL_SECOND);
        physiologyState = physiologyEngine.getState();
        // Netto Q1-transport og basal/renal clearance; Q2 tælles ikke igen.
        const p = physiologyEngine.getPhysiologySnapshot(), h = physiologyEngine.hovorka;
        const q1 = h.state[HOVORKA_STATE_IDX.Q1], q2 = h.state[HOVORKA_STATE_IDX.Q2];
        bgHUDSignals = {
            // D1+D2 i gram: beholderen er ikke tom, mens optagelsen fortsætter.
            // Motorens tidsestimat og pumpens interne COB forbliver uændret.
            cob: (p.food.carbsInStomach+p.food.carbsInGut)*.18,
            food: Math.max(0, p.food.carbAbsorption),
            out: Math.max(0, p.insulin.x1*q1-h.k_12*q2) + Math.max(0,p.brain.f01c) + Math.max(0,h._lastFR||0),
            action: p.insulin.x1/baselineBGAction,
            // Kun ekstra disposal over startens basalvirkning; ikke Q1-transport.
            extraDisposal: Math.max(0,p.insulin.x2-baselineDisposalAction)*q2,
            insulinClearance: h.k_e*Math.max(0,(h.state[HOVORKA_STATE_IDX.I]-h.state[HOVORKA_STATE_IDX.Ib])*h.V_I)/1000,
        };

        // HUD, alarmer og trendpil deler den samme sande BG-værdi. Der er derfor
        // hverken CGM-forsinkelse eller sensorstøj i arkadespillets feedback.
        const gameBG = getGameBG();
        updateBGAlarms(deltaSeconds);

        if (elapsedRealSeconds - lastBGSampleTime >= 0.5) {
            lastBGSampleTime = elapsedRealSeconds;
            bgSamples.push({ time: elapsedRealSeconds, value: gameBG });
            while (bgSamples.length > 8) bgSamples.shift();
        }

        if (physiologyState.trueBG < 2.8) loseLife('LOW BLOOD SUGAR');
    }

    // Spilsignaler, ikke medicinske alarmer. Hysterese omkring grænserne
    // forhindrer gentagne startlyde, når BG ligger og vipper ved en grænse.
    function updateBGAlarms(deltaSeconds) {
        if (gameState !== 'playing' || demoMode) return;
        const bg = getGameBG();
        let nextZone = bg < BG_GREEN_MIN_MMOL_L ? 'low'
            : bg > BG_GREEN_MAX_MMOL_L ? 'high' : 'normal';
        if (bgAlarmZone === 'low' && bg < 4.2) nextZone = 'low';
        if (bgAlarmZone === 'high' && bg > 9.7 && nextZone !== 'low') nextZone = 'high';
        if (nextZone !== bgAlarmZone) {
            bgAlarmZone = nextZone;
            bgAlarmCooldownSeconds = 0;
        }
        if(bgAlarmZone==='low'){
            const signal=window.DexGameRenderer.lowSignal(elapsedRealSeconds);
            if(signal.cycle!==lastLowLampCycle){
                lastLowLampCycle=signal.cycle;audio.lowBGAlarm();
            }
            return;
        }
        lastLowLampCycle=-1;
        bgAlarmCooldownSeconds = Math.max(0, bgAlarmCooldownSeconds - deltaSeconds);
        if (bgAlarmZone === 'normal' || bgAlarmCooldownSeconds > 0) return;
        if (bgAlarmZone === 'low') audio.lowBGAlarm();
        else audio.highBGAlarm();
        bgAlarmCooldownSeconds = bgAlarmZone === 'low' ? 3 : 5.5;
    }

    function updateCamera() {
        // En bred dødzone lader figuren bevæge sig naturligt på skærmen. Når
        // den passerer højre eller venstre følgepunkt, bevæger kameraet sig i
        // samme retning. Dermed kan kameraet også følge hele vejen tilbage.
        const playerScreenX = player.x - cameraX;
        if (playerScreenX > 105) {
            cameraX = player.x - 105;
        } else if (playerScreenX < 55) {
            cameraX = player.x - 55;
        }
        cameraX = clamp(cameraX, 0, getCurrentLevel().width - SCREEN_WIDTH);
    }

    function spawnParticles(x, y, color, count = 7) {
        for (let index = 0; index < count; index += 1) {
            const angle = (Math.PI * 2 * index) / count;
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * (18 + index * 2),
                vy: Math.sin(angle) * (18 + index * 2) - 15,
                life: 0.45,
                color,
            });
        }
    }

    function spawnFoodPulp(x, y, type, facing, count) {
        // Indmadens farver, ikke skrællens. Små stiliserede madstykker og
        // saftdråber; ingen blodfarver eller ændringer i makronæringsstoffer.
        const palette = {
            apple: ['#fff0bc', '#f3d88c', '#fff9df'],
            banana: ['#fff3b0', '#e8cf76', '#fff9d8'],
            avocado: ['#d8e883', '#a6c85b', '#edf2bc'],
            egg: ['#fff8df', '#ffc543', '#fffef1'],
            cake: ['#e7bd7b', '#fff1ce', '#c28a52'],
            burger: ['#e4b565', '#83b94e', '#a97442'],
            pizza: ['#ffda72', '#edb344', '#f4d09b'],
            soda: ['#ffc24e', '#ffdf92', '#f59b35'],
        }[type] || ['#fff0bc', '#e7bd7b'];
        for (let index = 0; index < count; index += 1) {
            const maximumLife = .35 + (index % 4) * .065;
            particles.push({kind:'food-pulp', x, y,
                vx:facing * (10 + (index * 17 % 31)), vy:-17-(index * 13 % 29),
                gravity:105, life:maximumLife, maximumLife,
                size:.7+(index % 3)*.4, color:palette[index % palette.length],
                rotation:index*1.7, spin:(index % 2 ? 1 : -1)*7,
                droplet:type==='soda'||index % 3===0});
        }
    }

    function spawnScoreParticle(x, y, points, suffix = '') {
        // Pointtallet bruger samme partikelliste som eksplosionsskyen. Det
        // bliver stående længe nok til at kunne læses og flyder derefter op.
        particles.push({
            x,
            y,
            vx: 0,
            vy: -13,
            gravity: 0,
            life: 0.85,
            maximumLife: 0.85,
            color: '#fff39a',
            text: `+${points}${suffix}`,
        });
    }

    function spawnFizzlerExplosion(x, y) {
        // Fizzlers farlige eksplosion skal kunne skelnes tydeligt fra den
        // almindelige lille partikelsky. Flere lag giver først et hvidt glimt,
        // derefter sodavandsdråber, dåsestumper og tre voksende trykbølger.
        const dropletColors = ['#7cf5ff', '#19c9d8', '#fff3a3', '#ff7a3d'];
        for (let index = 0; index < 38; index += 1) {
            const angle = Math.PI * 2 * index / 38 + (index % 3) * 0.11;
            const speed = 35 + (index % 7) * 8;
            particles.push({
                kind: 'fizz-droplet',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 31,
                gravity: 92,
                life: 0.62 + (index % 4) * 0.06,
                maximumLife: 0.8,
                size: 1.5 + (index % 3) * 0.65,
                color: dropletColors[index % dropletColors.length],
            });
        }

        for (let index = 0; index < 9; index += 1) {
            const angle = Math.PI * 2 * index / 9 + 0.18;
            particles.push({
                kind: 'fizz-shard',
                x,
                y,
                vx: Math.cos(angle) * (42 + index * 3),
                vy: Math.sin(angle) * (35 + index * 2) - 27,
                gravity: 105,
                life: 0.78,
                maximumLife: 0.78,
                rotation: angle,
                spin: index % 2 === 0 ? 13 : -13,
                color: index % 2 === 0 ? '#16d3db' : '#ff7a3d',
            });
        }

        particles.push({
            kind: 'fizz-flash', x, y, vx: 0, vy: 0, gravity: 0,
            life: 0.2, maximumLife: 0.2, color: '#ffffff',
        });
        for (let index = 0; index < 3; index += 1) {
            particles.push({
                kind: 'fizz-shockwave',
                x,
                y,
                vx: 0,
                vy: 0,
                gravity: 0,
                life: 0.62 + index * 0.1,
                maximumLife: 0.62 + index * 0.1,
                delay: index * 0.07,
                startRadius: 4 + index * 2,
                endRadius: 30 + index * 8,
                color: index === 1 ? '#ff9a45' : '#8ff9ff',
            });
        }
    }

    function updateParticles(deltaSeconds) {
        for (const particle of particles) {
            particle.x += particle.vx * deltaSeconds;
            particle.y += particle.vy * deltaSeconds;
            particle.vy += (particle.gravity ?? 70) * deltaSeconds;
            if (particle.rotation !== undefined) {
                particle.rotation += (particle.spin ?? 0) * deltaSeconds;
            }
            particle.life -= deltaSeconds;
        }
        particles = particles.filter((particle) => particle.life > 0);
    }

    function startHUDPickupFlight(type, worldX, worldY, targetX, targetY, delaysHUDValue = false) {
        hudPickupFlights.push({
            type,
            startX: worldX - cameraX,
            startY: worldY,
            // Lagerets lokale koordinater flyttes sammen med panelet.
            targetX: targetX === 299 ? BG_HUD_X + 140
                : targetX + (type === 'candy' ? CANDY_HUD_X : PUMP_HUD_X),
            targetY: targetX === 299 ? HUD_TOP + 15
                : targetY + HUD_TOP + (type === 'candy' ? 14 : 0),
            elapsedSeconds: 0,
            durationSeconds: 0.58,
            delaysHUDValue,
        });
    }

    function updateHUDPickupFlights(deltaSeconds) {
        for (const flight of hudPickupFlights) {
            flight.elapsedSeconds += deltaSeconds;
        }
        hudPickupFlights = hudPickupFlights.filter(
            (flight) => flight.elapsedSeconds < flight.durationSeconds,
        );
    }

    function render() {
        context.save();
        context.translate(0, -HUD_HEIGHT);
        drawBackground();
        context.restore();
        context.save();
        context.beginPath();
        context.rect(0, 0, SCREEN_WIDTH, HUD_TOP);
        context.clip();
        // Kameraet beholder decimalerne. Med Full HD-skalaen ville afrunding
        // til logiske pixels give synlige spring i alle parallaxlag.
        context.translate(-cameraX, 0);
        drawLevel();
        drawFinish();
        drawDiamonds();
        drawItems();
        drawEnemies();
        drawCheeseProjectiles();
        drawBananaPeels();
        drawPlayer();
        drawEatenEnemyInMouth();
        drawPlayerActionEffects();
        drawParticles();
        context.restore();
        drawHUD();
        drawDemoCaption();
        // Støvet må fortsætte gennem den nederste HUD og ud over skærmkanten,
        // i stedet for at forsvinde bag panelet ved jordlinjen.
        context.save();context.translate(-cameraX,0);muscleDust.draw(context);context.restore();
        drawHUDPickupFlights();
        drawMessage();
    }

    // En dødelig skræl skal kunne passeres med et lille hop. Undgå lave
    // tunneler, også når en kasse eller et gulv ligger tæt ved landingsstedet.
    function bananaPeelHasHeadroom(x,floor){
        const margin=PLAYER_WIDTH+10;
        return ![...platforms,...cacheBlocks].some(p=>p!==floor&&!p.collapsed
            && p.x<x+margin&&p.x+p.width>x-margin
            && p.y<floor.y&&p.y+p.height>floor.y-PLAYER_HEIGHT-14);
    }

    function updateBananaDrop(enemy,dt) {
        if(enemy.peelThrow){
            const action=enemy.peelThrow,previous=action.age;
            action.age+=dt;
            // Slip først strimlen, når hånden er nået gennem kasteoptrækket.
            if(previous<.85 && action.age>=.85 && !action.floor.collapsed
                && bananaPeelHasHeadroom(action.x,action.floor)){
                const hand=getBananaHandPose(.85),size=37;
                bananaPeels.push({x:action.x,y:action.floor.y,age:0,floor:action.floor,
                    direction:enemy.direction,
                    startX:enemy.x+enemy.width/2+enemy.direction*hand.x*size/512,
                    startY:enemy.y+enemy.height+size*23/512+hand.y*size/512});
            }
            if(action.age>=1.15)enemy.peelThrow=null;
            return;
        }
        if(Math.abs(enemy.x-player.x)>SCREEN_WIDTH*.7 || enemy.speed<=0)return;
        enemy.peelTimer-=dt;
        if(enemy.peelTimer>0)return;
        enemy.peelTimer=5.5;
        const x=enemy.x+enemy.width/2-enemy.direction*26;
        const floor=[...platforms,...cacheBlocks].find(p=>!p.collapsed
            && Math.abs(p.y-enemy.y-enemy.height)<2 && x-5>=p.x && x+5<=p.x+p.width);
        if(!floor||bananaPeels.length>=12||!bananaPeelHasHeadroom(x,floor))return;
        enemy.peelThrow={age:0,x,floor};
    }

    function updateBananaPeels(dt) {
        for(const peel of bananaPeels){
            peel.age+=dt;
            if(peel.floor.collapsed){peel.age=14;continue;}
            // Kort synlig landingsanimation før skrællen bliver glat.
            if(peel.age<.8||peel.age>=12||player.invulnerableTime>0)continue;
            if(Math.abs(player.y+PLAYER_HEIGHT-peel.y)<=2
                && player.x+PLAYER_WIDTH-3>peel.x-4&&player.x+3<peel.x+4){
                loseLife('BANANA SLIP');break;
            }
        }
        bananaPeels=bananaPeels.filter(p=>p.age<12);
    }

    function drawBananaPeels() {
        for(const peel of bananaPeels){
            const t=clamp(peel.age/.65,0,1);
            context.save();context.translate(
                peel.startX+(peel.x-peel.startX)*t,
                peel.startY+(peel.y-2-peel.startY)*t-Math.sin(t*Math.PI)*8);
            context.scale(peel.direction*37/512,37/512);
            context.rotate(t*Math.PI*2.5);
            context.globalAlpha=clamp((12-peel.age)/1.5,0,1);
            // Samme strimmel som i hånden; rotationen lægger den fladt
            // ved landingen i stedet for at forvandle den til en hel skræl.
            context.fillStyle='#ffd43b';context.strokeStyle='#b67c16';context.lineWidth=3;
            context.beginPath();context.moveTo(-8,0);
            context.bezierCurveTo(-36,60,-7,90,25,90);
            context.bezierCurveTo(40,72,28,42,10,0);
            context.closePath();context.fill();context.stroke();
            context.strokeStyle='#fff2a0';context.lineWidth=7;context.beginPath();
            context.moveTo(0,14);context.quadraticCurveTo(-8,65,25,83);context.stroke();
            context.restore();
        }
    }

    function drawBackground() {
        context.fillStyle = '#26245e';
        context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const biome=biomeImages[getCurrentLevel().theme];
        if (biome && biome.complete && biome.naturalWidth>0) {
            // Ét ubrudt, opakt højopløst billede. Overscan undgår flisesamlinger.
            const travel=Math.max(0,getCurrentLevel().width-SCREEN_WIDTH)*0.018;
            const width=SCREEN_WIDTH+travel;
            const height=Math.max(SCREEN_HEIGHT-HUD_HEIGHT,width*biome.naturalHeight/biome.naturalWidth);
            context.drawImage(biome,-cameraX*0.018,SCREEN_HEIGHT-height,width,height);
            if(stageMiddleImages[currentLevelIndex])drawMiddleGroundLayer();
            else window.DextroScenery?.drawMiddle(context,{width:SCREEN_WIDTH,bottom:SCREEN_HEIGHT,
                camera:cameraX,theme:getCurrentLevel().theme});
        } else {
            drawOverscannedBaseBackground();
            drawMiddleGroundLayer();
        }
    }

    function drawOverscannedBaseBackground() {
        if (!backgroundImage.complete || backgroundImage.naturalWidth <= 0) return;

        // Grundbilledet er ikke lavet som en sømløs flise. I stedet for at
        // gentage det (som gav en lodret samling) overskaleres ét eksemplar,
        // så hele banens langsomme kamerarejse rummes inden for samme billede.
        const speed = 0.02;
        const maximumCameraX = Math.max(0, getCurrentLevel().width - SCREEN_WIDTH);
        const drawWidth = SCREEN_WIDTH + maximumCameraX * speed + 4;
        const drawHeight = drawWidth
            * backgroundImage.naturalHeight / backgroundImage.naturalWidth;
        const drawX = -cameraX * speed;
        const drawY = SCREEN_HEIGHT - drawHeight;

        context.save();
        context.beginPath();
        context.rect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
        context.clip();
        context.filter = 'grayscale(32%) saturate(68%) contrast(91%) brightness(102%)';
        context.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
        context.restore();
    }

    function drawMiddleGroundLayer() {
        const layerImage = stageMiddleImages[currentLevelIndex] || middleGroundImage;
        if (!layerImage.complete || layerImage.naturalWidth <= 0) return;

        // Laget bevæger sig lidt hurtigere end basisbaggrunden (0,02), men
        // langsomt nok til at bevare indtrykket af et egentligt mellemlag.
        // Den lave faktor holder samtidig junglesilhuetten under gameplayet.
        const speed = 0.055;
        // Den øverste halvdel af kildefilen er ren alfatransparens. Den
        // beskæres kun for at undgå at skalere tomme pixels; selve naturens
        // organiske overkant og alle detaljer forbliver urørte.
        const sourceY = Math.floor(layerImage.naturalHeight * (currentLevelIndex>0&&currentLevelIndex<5?.32:.48));
        const sourceHeight = layerImage.naturalHeight - sourceY;
        const maximumCameraX = Math.max(0, getCurrentLevel().width - SCREEN_WIDTH);
        const drawWidth = SCREEN_WIDTH + maximumCameraX * speed + 6;
        const naturalDrawHeight = drawWidth * sourceHeight / layerImage.naturalWidth;
        const drawHeight = currentLevelIndex>0&&currentLevelIndex<5 ? Math.min(currentLevelIndex===3?92:70,naturalDrawHeight) : naturalDrawHeight;
        const drawX = -cameraX * speed;
        // Trælagene i de første to baner hæves 12 logiske pixels. Bunden
        // når stadig under jordkanten, så der ikke opstår svævende træøer.
        const drawY = SCREEN_HEIGHT - drawHeight + (currentLevelIndex<2||currentLevelIndex===3?0:12);

        context.save();
        context.beginPath();
        context.rect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
        context.clip();
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            layerImage,
            0,
            sourceY,
            layerImage.naturalWidth,
            sourceHeight,
            drawX,
            drawY,
            drawWidth,
            drawHeight,
        );
        context.restore();
    }

    function drawPitFire(x, width, y) {
        // Flammerne er forankret i hullet, ikke partikler som driver over gulvet.
        const left=Math.max(x,cameraX-8),right=Math.min(x+width,cameraX+SCREEN_WIDTH+8);
        if(right<=left)return;
        context.save();context.beginPath();
        context.rect(x,y-14,width,SCREEN_HEIGHT-HUD_HEIGHT-y+14);context.clip();
        const glow=context.createLinearGradient(0,y-12,0,y+14);
        glow.addColorStop(0,'rgba(255,100,0,0)');glow.addColorStop(.5,'#df4015');glow.addColorStop(1,'#ffbd32');
        context.fillStyle=glow;context.fillRect(left,y-12,right-left,30);
        for(let n=Math.floor(left/5);n<=Math.ceil(right/5);n++){
            const phase=elapsedRealSeconds*5+n*2.37;
            const height=8+Math.sin(phase)*3+Math.sin(phase*1.7)*2;
            const cx=n*5,sway=Math.sin(phase*.8)*2;
            for(let layer=0;layer<2;layer++){
                const h=height*(layer?.65:1),w=layer?1.7:3.6;
                context.fillStyle=layer?'#fff1a0':'#ff8c20';context.beginPath();
                context.moveTo(cx-w,y+7);
                context.bezierCurveTo(cx-w-1,y,cx+sway-2,y-h/2,cx+sway,y-h);
                context.bezierCurveTo(cx+sway+1,y-h/2,cx+w+1,y+1,cx+w,y+7);
                context.closePath();context.fill();
            }
            const rise=(elapsedRealSeconds*.65+n*.31)%1;
            context.globalAlpha=1-rise;context.fillStyle='#ffe69a';
            context.fillRect(cx+Math.sin(phase)*2,y+3-rise*17,.7,1.2);context.globalAlpha=1;
        }
        context.restore();
    }

    function drawLevel() {
        // Afgrundene starter ved den synlige jordkant. Tegn kun i hullerne,
        // før platformene, så markeringen hverken lander under canvas eller
        // mørklægger de solide jordstykker.
        const ground = platforms
            .filter(platform => !platform.collapsed)
            .filter(platform => platform.y === getCurrentLevel().groundY)
            .slice().sort((a, b) => a.x - b.x);
        let groundEnd = 0;
        const theme=DEXTRO_THEMES[getCurrentLevel().theme || 'orchard'];
        context.fillStyle = theme.lava ? '#ed6329' : '#0b1024';
        for (const platform of ground) {
            if (platform.x > groundEnd) {
                context.fillRect(groundEnd, getCurrentLevel().groundY,
                    platform.x - groundEnd, SCREEN_HEIGHT - HUD_HEIGHT - getCurrentLevel().groundY);
                if(theme.lava)drawPitFire(groundEnd,platform.x-groundEnd,getCurrentLevel().groundY);
            }
            groundEnd = Math.max(groundEnd, platform.x + platform.width);
        }
        for (const platform of platforms) {
            if (platform.collapsed) continue;
            drawEarthPlatform(platform);
            if(platform.crumble) {
                context.strokeStyle=platform.crumbleTime===null?'#e7cf9f':'#ff906b';
                context.lineWidth=1;
                context.beginPath();context.moveTo(platform.x+8,platform.y+1);
                context.lineTo(platform.x+15,platform.y+5);context.lineTo(platform.x+11,platform.y+8);
                context.lineTo(platform.x+22,platform.y+12);context.stroke();
            }
        }
        context.save();
        for(const block of cacheBlocks) {
            const y=block.y-Math.sin(block.bumpTime/0.2*Math.PI)*2;
            if(block.x+block.width<cameraX || block.x>cameraX+SCREEN_WIDTH) continue;
            const face=context.createLinearGradient(block.x,y,block.x,y+block.height);
            face.addColorStop(0,block.used?'#515365':'#6a4eaa');
            face.addColorStop(1,block.used?'#303341':'#29224f');
            context.fillStyle=face;context.fillRect(block.x,y,block.width,block.height);
            context.strokeStyle=block.used?'#747585':'#8fefff';context.lineWidth=0.8;
            context.strokeRect(block.x+0.6,y+0.6,block.width-1.2,block.height-1.2);
            context.fillStyle=block.used?'#747585':'#ffe5a0';
            for(const dx of [2,block.width-3]) for(const dy of [2,block.height-3])
                context.fillRect(block.x+dx,y+dy,1,1);
            context.save();
            const phase=elapsedRealSeconds*3+block.x*0.035;
            context.translate(block.x+block.width/2,y+block.height/2+0.5);
            if(!block.used) {
                context.translate(0,Math.sin(phase)*0.65);
                context.scale(0.87+0.13*Math.cos(phase),1);
                context.shadowColor='#6df4ff';context.shadowBlur=2+Math.sin(phase)*0.6;
            }
            context.font='bold 12px monospace';context.textAlign='center';context.textBaseline='middle';
            context.fillStyle=block.used?'#8a8c9f':'#fff1bb';
            context.fillText(block.used?'·':'?',0,0);
            context.restore();
        }
        context.restore();
    }

    function drawEarthPlatform(platform) {
        const { x, y, width, height } = platform;
        const theme=DEXTRO_THEMES[getCurrentLevel().theme || 'orchard'];
        if (x + width < cameraX || x > cameraX + SCREEN_WIDTH) return;
        context.save();
        // Alt bliver inde i kollisionsrektanglet. Ingen rødder eller tekstur
        // kan flyde ud over højrekanten eller skjule et hul mellem plateauer.
        context.beginPath();
        context.rect(x, y, width, height);
        context.clip();
        const soil = context.createLinearGradient(0, y, 0, y + height);
        soil.addColorStop(0, theme.soil[0]);
        soil.addColorStop(0.4, theme.soil[1]);
        soil.addColorStop(1, theme.soil[2]);
        context.fillStyle = soil;
        context.fillRect(x, y, width, height);

        // Faste verdenskoordinater giver samme detaljer ved tilbageløb.
        // Kun synlige felter tegnes; kameraet må aldrig styre deres mønster.
        const firstTile = Math.max(0, Math.floor((cameraX - x) / 12));
        const lastTile = Math.min(Math.ceil(width / 12), Math.ceil((cameraX + SCREEN_WIDTH - x) / 12));
        for (let tile = firstTile; tile < lastTile; tile++) {
            const tx = x + tile * 12;
            const seed = Math.abs(Math.sin(tile * 12.9898 + x * 0.17 + y) * 43758.5453) % 1;
            // Ujævn moskant under en ubrudt, let aflæselig landingsoverflade.
            context.fillStyle = theme.soil[1];
            context.fillRect(tx, y + 2, 12, 2 + seed * 2);
            context.fillStyle = theme.top;
            context.fillRect(tx + 1, y + 2, 3 + seed * 4, 2);
            context.strokeStyle = theme.detail;
            context.lineWidth = 0.45;
            context.beginPath();
            context.moveTo(tx + 4, y + 4);
            context.lineTo(tx + 3 + seed * 3, y + 7);
            context.lineTo(tx + 5, y + Math.min(height - 1, 10 + seed * 5));
            context.moveTo(tx + 4, y + 7);
            context.lineTo(tx + 7, y + 8);
            context.stroke();
            for (let row = 0; row < Math.ceil(height / 6); row++) {
                const sy = y + 6 + row * 6 + seed * 1.5;
                const sx = tx + 7 + Math.sin(tile + row * 3) * 2;
                // Sten følger banens palet, så is/kælder ikke har brune jordpletter.
                context.fillStyle = row % 2 ? theme.soil[1] : theme.detail;
                context.beginPath();
                context.moveTo(sx - 1.8, sy);
                context.lineTo(sx, sy - 1);
                context.lineTo(sx + 2.3, sy - 0.3);
                context.lineTo(sx + 1.5, sy + 1.4);
                context.lineTo(sx - 1.2, sy + 1);
                context.closePath();
                context.fill();
                context.fillStyle = theme.top;
                context.fillRect(sx - 0.5, sy - 0.5, 1.5, 0.4);
                context.fillStyle = '#342b2c';
                context.fillRect(tx + 1 + seed * 2, sy + 1, 0.9, 0.7);
            }
        }
        context.fillStyle = theme.top;
        context.fillRect(x, y, width, 2);
        context.fillStyle = theme.trim;
        context.fillRect(x, y, width, 0.65);
        // Sparsomme slidspor, fliser og revner inden for den faste hitbox.
        // Samme mønster ved hvert besøg; hverken tilfældige huller eller kanter.
        for(let tile=firstTile;tile<lastTile;tile++){
            const tx=x+tile*12;
            const detailSeed=Math.abs(Math.sin(tx*.61+y*1.7)*9321)%1;
            if(detailSeed<.28){
                context.strokeStyle=theme.soil[2];context.lineWidth=.4;
                context.beginPath();context.moveTo(tx+2,y+2.4);context.lineTo(tx+5,y+5);
                context.lineTo(tx+4,y+8);context.stroke();
            }else if(detailSeed>.72){
                context.fillStyle=theme.detail;
                context.fillRect(tx+3,y+3.1,5,1);
                context.fillStyle=theme.soil[2];context.fillRect(tx+3,y+4.1,5,.45);
            }
        }
        // Diskrete side- og bundskygger gør også de tynde svæveplatforme solide.
        context.fillStyle = 'rgba(13, 20, 25, 0.35)';
        context.fillRect(x, y + 3, 0.8, height - 3);
        context.fillRect(x + width - 1, y + 3, 1, height - 3);
        context.fillRect(x, y + height - 1, width, 1);
        context.restore();
    }

    function drawFinish() {
        const level = getCurrentLevel();
        // Målstregen ligger under DEX' centrum, når hans venstre kant passerer
        // det eksisterende finishX. Portalen er kun pynt, ikke en ny forhindring.
        const centerX = level.finishX + PLAYER_WIDTH / 2;
        const groundY = level.groundY;
        const left = centerX - 32, right = centerX + 32;
        const top = groundY - 66;
        if (right < cameraX - 10 || left > cameraX + SCREEN_WIDTH + 10) return;

        context.save();
        context.lineJoin = 'round';

        // Smalle metalstandere og tunge fødder forankrer målet i banens gulv.
        for (const poleX of [left, right]) {
            const metal = context.createLinearGradient(poleX - 2, 0, poleX + 2, 0);
            metal.addColorStop(0, '#28364f');
            metal.addColorStop(0.35, '#f1f4ff');
            metal.addColorStop(0.65, '#8894b5');
            metal.addColorStop(1, '#35415c');
            context.fillStyle = metal;
            context.fillRect(poleX - 2, top - 4, 4, groundY - top + 4);
            context.fillStyle = '#242640';
            context.fillRect(poleX - 4, groundY - 2, 8, 2);
            context.fillStyle = '#a8b6d5';
            context.fillRect(poleX - 3, groundY - 2, 6, 0.6);
            for (let band = 0; band < 7; band++) {
                context.fillStyle = band % 2 ? '#eef4ff' : '#242640';
                context.fillRect(poleX - 1.6, groundY - 32 + band * 4, 3.2, 4);
            }
            context.fillStyle = '#ffce63';
            context.beginPath();
            context.arc(poleX, top - 4, 2.5, 0, Math.PI * 2);
            context.fill();
        }

        // Et sammenhængende stofbanner med ganske let bevægelse i underkanten.
        // Teksten bevæges ikke, så FINISH forbliver læselig under løb.
        const flutter = Math.sin(elapsedRealSeconds * 3.2) * 0.65;
        const banner = context.createLinearGradient(0, top, 0, top + 17);
        banner.addColorStop(0, '#ffd66e');
        banner.addColorStop(0.16, '#ff864d');
        banner.addColorStop(1, '#bc245d');
        context.beginPath();
        context.moveTo(left, top);
        context.quadraticCurveTo(centerX, top + 2, right, top);
        context.lineTo(right, top + 16);
        context.quadraticCurveTo(centerX, top + 19 + flutter, left, top + 16);
        context.closePath();
        context.fillStyle = banner;
        context.fill();
        context.strokeStyle = '#ffe8a4';
        context.lineWidth = 0.7;
        context.stroke();

        // Sort/hvide tern i begge ender giver et løbsmål-signal på afstand.
        for (const flagX of [left + 2, right - 8]) {
            for (let row = 0; row < 4; row++) {
                for (let column = 0; column < 2; column++) {
                    context.fillStyle = (row + column) % 2 ? '#242640' : '#fff7e8';
                    context.fillRect(flagX + column * 3, top + 2 + row * 3, 3, 3);
                }
            }
        }
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = 'italic 900 9px monospace';
        context.lineWidth = 1.2;
        context.strokeStyle = '#692348';
        context.strokeText('FINISH', centerX, top + 9, 43);
        context.fillStyle = '#fff9db';
        context.fillText('FINISH', centerX, top + 9, 43);

        // En kort ternet streg på selve løbefladen erstatter hyttens dør.
        for (let row = 0; row < 2; row++) {
            for (let column = 0; column < 6; column++) {
                context.fillStyle = (row + column) % 2 ? '#242640' : '#fff7e8';
                context.fillRect(centerX - 6 + column * 2, groundY - 1 + row * 1.5, 2, 1.5);
            }
        }
        context.restore();
    }

    function drawDiamonds() {
        for (const diamond of diamonds) {
            if (diamond.collected) continue;

            // Facetterne drejer med samme frame-rate som bolchet. Forskudte
            // faser undgår, at alle diamanter blinker samtidigt.
            const frame = getPickupAnimationFrame(elapsedRealSeconds, diamond.x * 0.07);
            const angle = frame / PICKUP_ANIMATION_FRAMES * Math.PI * 2;
            const bob = Math.sin(angle) * 0.8;
            const width = 2 + 3 * Math.abs(Math.cos(angle));
            const facetX = Math.sin(angle) * width * 0.65;
            const shine = Math.pow(Math.max(0, Math.cos(angle - 0.8)), 6);
            const sparkleSide = Math.sin(angle) >= 0 ? 1 : -1;

            context.save();
            context.translate(diamond.x, diamond.y + bob);
            context.shadowColor = '#79f7ff';
            context.shadowBlur = 3 + shine * 6;

            context.beginPath();
            context.moveTo(0, -6);
            context.lineTo(width, -2);
            context.lineTo(0, 6);
            context.lineTo(-width, -2);
            context.closePath();
            const gemGradient = context.createLinearGradient(-width, -6, width, 6);
            gemGradient.addColorStop(0, '#d6ffff');
            gemGradient.addColorStop(0.45, '#42e4ff');
            gemGradient.addColorStop(1, '#6157d9');
            context.fillStyle = gemGradient;
            context.fill();
            context.strokeStyle = '#f4ffff';
            context.lineWidth = 0.8;
            context.stroke();

            // To farveflader gør diamanten læsbar som en ædelsten selv i fart.
            context.shadowBlur = 0;
            context.beginPath();
            context.moveTo(0, -5);
            context.lineTo(width - 1, -2);
            context.lineTo(facetX, 0);
            context.closePath();
            context.fillStyle = '#e8ffff';
            context.fill();
            context.beginPath();
            context.moveTo(facetX, 0);
            context.lineTo(width - 1, -2);
            context.lineTo(0, 5);
            context.closePath();
            context.fillStyle = '#376fd4';
            context.fill();

            if (shine > 0.05) {
                const sparkleX = sparkleSide * 7;
                const ray = 1 + shine * 2.5;
                context.globalAlpha = shine;
                context.fillStyle = '#ffffff';
                context.beginPath();
                context.moveTo(sparkleX, -2 - ray);
                context.lineTo(sparkleX + 0.5, -2.5);
                context.lineTo(sparkleX + ray, -2);
                context.lineTo(sparkleX + 0.5, -1.5);
                context.lineTo(sparkleX, -2 + ray);
                context.lineTo(sparkleX - 0.5, -1.5);
                context.lineTo(sparkleX - ray, -2);
                context.lineTo(sparkleX - 0.5, -2.5);
                context.closePath();
                context.fill();
            }
            context.restore();
        }
    }

    function drawItems() {
        for (const item of items) {
            if (item.collected) continue;
            const phase = elapsedRealSeconds * 5 + item.x * 0.08;
            const y = item.y + Math.sin(phase) * 2.2;
            const pumpPickup = item.type === 'pump' || item.type === 'autoPump';
            const rotation = Math.sin(phase * 0.72) * (pumpPickup ? 0.08 : 0.13);
            const pulse = 1 + Math.sin(phase * 1.35) * 0.045;
            context.save();
            context.translate(item.x, y);
            context.rotate(rotation);
            context.scale(pulse, 2 - pulse);
            drawPickup(item.type, 0, 0, pumpPickup ? 27 : 25, true);
            context.restore();
        }
    }

    function drawPickup(type, x, y, size, showGlow, painter = context) {
        const context = painter;
        if(type==='heart'){
            context.save();context.translate(x,y);
            const beat=showGlow?1+.10*Math.sin(elapsedRealSeconds*6):1;
            context.scale(size*beat/24,size*beat/24);
            context.shadowColor='#ff214b';context.shadowBlur=showGlow?7:0;
            const red=context.createLinearGradient(-7,-8,7,10);
            red.addColorStop(0,'#ff8ca4');red.addColorStop(.45,'#f82c55');red.addColorStop(1,'#9b1236');
            context.fillStyle=red;context.beginPath();context.moveTo(0,10);
            context.bezierCurveTo(-19,-2,-9,-15,0,-6);
            context.bezierCurveTo(9,-15,19,-2,0,10);context.fill();
            context.shadowBlur=0;context.strokeStyle='#ffcfdb';context.lineWidth=1;
            context.beginPath();context.moveTo(-7,-3);context.quadraticCurveTo(-8,-7,-4,-7);context.stroke();
            context.restore();return;
        }
        if(type==='superShoes'){
            context.save();context.translate(x,y);context.scale(size/25,size/25);
            context.rotate(showGlow?Math.sin(elapsedRealSeconds*3)*.12:0);
            for(const [dx,dy] of [[-4,-3],[3,4]]){
                context.save();context.translate(dx,dy);
                context.shadowColor='#40f5ff';context.shadowBlur=showGlow?5:0;
                context.fillStyle='#159baa';context.beginPath();context.moveTo(-8,-6);
                context.lineTo(-1,-6);context.lineTo(2,-1);context.quadraticCurveTo(10,-1,10,4);
                context.lineTo(-9,4);context.closePath();context.fill();
                context.shadowBlur=0;context.fillStyle='#f4f5ce';context.fillRect(-9,3,19,2);
                context.strokeStyle='#ffdc4d';context.lineWidth=2;context.beginPath();
                context.moveTo(-3,-5);context.lineTo(-5,-1);context.lineTo(0,-1);context.lineTo(-2,3);context.stroke();
                context.restore();
            }
            context.restore();return;
        }
        if(type==='insulin') {
            // Ensfarvet kapsel: en rumligt roterende midterakse med runde ender.
            // Projektionen forkorter længden, men ikke tykkelsen. Dermed ligner
            // rotationen et fast objekt i dybden og ikke et fladt ikon, der klemmes.
            context.save();context.translate(x,y);context.scale(size/20,size/20);
            const phase=showGlow?elapsedRealSeconds*Math.PI/2.8:0;
            const axisX=Math.sin(phase)*.72,axisY=-Math.cos(phase);
            const halfLength=5.2*Math.hypot(axisX,axisY),radius=3.5;
            const angle=Math.atan2(axisX,-axisY)+.25;
            context.rotate(angle);
            const capsulePath=()=>{
                context.beginPath();
                context.moveTo(-radius,-halfLength);
                context.arc(0,-halfLength,radius,Math.PI,Math.PI*2);
                context.lineTo(radius,halfLength);
                context.arc(0,halfLength,radius,0,Math.PI);
                context.closePath();
            };
            context.shadowColor='#12f5dc';context.shadowBlur=showGlow?13:5;
            const face=context.createLinearGradient(-radius,0,radius,0);
            face.addColorStop(0,'#078f99');face.addColorStop(.27,'#38f3df');
            face.addColorStop(.52,'#16dacd');face.addColorStop(1,'#057984');
            context.fillStyle=face;capsulePath();context.fill();
            context.shadowBlur=0;
            context.save();capsulePath();context.clip();
            // Refleksen flytter sig hen over den samme turkise overflade.
            const sheenX=-1.1+Math.sin(phase)*.7;
            const shine=context.createRadialGradient(sheenX,-halfLength,0,sheenX,-halfLength,6);
            shine.addColorStop(0,'rgba(89,255,229,.75)');
            shine.addColorStop(1,'rgba(24,235,215,0)');
            context.fillStyle=shine;context.fillRect(-radius,-halfLength-radius,radius*2,(halfLength+radius)*2);
            context.strokeStyle='rgba(104,255,235,.65)';context.lineWidth=.65;context.lineCap='round';
            context.beginPath();context.moveTo(sheenX,-halfLength-1);
            context.lineTo(sheenX,halfLength-1.5);context.stroke();context.restore();
            context.strokeStyle='rgba(44,255,223,.7)';context.lineWidth=.3;
            capsulePath();context.stroke();
            context.restore();return;
        }
        if(type==='sugarCane') {
            context.save(); context.translate(x,y); context.rotate(-0.2);
            context.lineWidth=3.6; context.strokeStyle='#fff7ef';context.lineCap='round';
            context.beginPath();context.moveTo(2,9);context.lineTo(2,-5);context.arc(-2,-5,4,0,Math.PI,true);context.stroke();
            context.strokeStyle='#ec3e5c';context.lineWidth=1.8;
            for(let k=-4;k<9;k+=4) {context.beginPath();context.moveTo(0.5,k);context.lineTo(3.5,k+1.5);context.stroke();}
            context.restore(); return;
        }
        const image = pickupImages[type];
        const halfSize = Math.round(size / 2);
        const pumpPickup = type === 'pump' || type === 'autoPump';

        if (image.complete && image.naturalWidth > 0) {
            context.imageSmoothingEnabled = true;
            if (type === 'candy') {
                // Seksten renderinger: tynde kantframes hører også til
                // rotationen. HUD og spiseanimering bruger den læsbare front.
                // PNG'en har rigtig alfa; ingen medaljon eller cirkelmaske.
                const frameIndex = showGlow ? getPickupAnimationFrame(elapsedRealSeconds) : 0;
                context.drawImage(
                    image,
                    (frameIndex % 4) * 384,
                    Math.floor(frameIndex / 4) * 384,
                    384,
                    384,
                    x - halfSize,
                    y - halfSize,
                    size,
                    size,
                );
            } else if (pumpPickup) {
                // Begge pumper har ægte transparens, men kildefilerne har lidt
                // forskellig luft omkring silhuetten. Tæt kildebeskæring gør
                // dem tydelige både som pickup og som lille HUD-ikon.
                const automatic = type === 'autoPump';
                const sourceX = Math.round(image.naturalWidth * (automatic ? 0.15 : 0.162));
                const sourceY = Math.round(image.naturalHeight * (automatic ? 0.13 : 0.135));
                const sourceWidth = Math.round(image.naturalWidth * (automatic ? 0.73 : 0.677));
                const sourceHeight = Math.round(image.naturalHeight * (automatic ? 0.74 : 0.717));
                context.save();
                // Pumpen vises frit uden en farvet boble eller ydre glød.
                context.drawImage(
                    image,
                    sourceX,
                    sourceY,
                    sourceWidth,
                    sourceHeight,
                    x - halfSize,
                    y - halfSize,
                    size,
                    size,
                );
                context.restore();
            } else {
                // Pennens PNG har en ægte alfakanal. En Canvas-skygge følger de
                // synlige pixels og giver derfor glød uden en firkantet baggrund.
                context.save();
                if (showGlow) {
                    context.shadowColor = 'rgba(83, 240, 255, 0.92)';
                    context.shadowBlur = 10;
                }
                context.drawImage(image, x - halfSize, y - halfSize, size, size);
                context.restore();
            }
            return;
        }

        // Enkle fallbacks vises kun, mens PNG-assetet indlæses.
        if (type === 'insulin') drawInsulinFallback(x, y);
        else if (pumpPickup) drawPumpFallback(x, y, type === 'autoPump');
        else drawCandyFallback(x, y);
    }

    function drawInsulinFallback(x, y) {
        context.fillStyle = '#f4fbff';
        context.fillRect(x - 3, y - 9, 6, 15);
        context.fillStyle = '#64e4ff';
        context.fillRect(x - 2, y - 6, 4, 11);
        context.fillStyle = '#156f84';
        context.fillRect(x - 4, y - 11, 8, 3);
    }

    function drawCandyFallback(x, y) {
        context.fillStyle = '#f7f2e8';
        context.beginPath();
        context.arc(x, y, 9, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#e51f31';
        context.lineWidth = 4;
        context.beginPath();
        context.arc(x, y, 7, -0.7, 1.8);
        context.stroke();
        context.beginPath();
        context.arc(x, y, 3, 2.4, 5.6);
        context.stroke();
        context.strokeStyle = '#a71225';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(x, y, 9, 0, Math.PI * 2);
        context.stroke();
    }

    function drawPumpFallback(x, y, automatic = false) {
        context.fillStyle = automatic ? '#172c58' : '#f4fbff';
        context.fillRect(x - 8, y - 6, 16, 12);
        context.fillStyle = automatic ? '#28d96f' : '#27c8d4';
        context.fillRect(x - 5, y - 3, 8, 6);
        context.fillStyle = automatic ? '#ffbd45' : '#8cffff';
        context.fillRect(x + 5, y - 3, 2, 2);
    }

    function drawEnemies() {
        for (const [enemyIndex, enemy] of enemies.entries()) {
            if (!enemy.alive && enemy.biteAnimationTime <= 0) continue;
            // Hele indtrækningen tegnes efter DEX med mund-/læbeklip,
            // så den hverken forsvinder bag kroppen eller dækker øjnene.
            if (enemy.biteAnimationTime > 0) continue;
            context.save();
            try {
            if(enemy.cacheEntrance && enemy.cacheEntrance.age<0.35) {
                // Klip kun indgangsanimationen ved kassens åbning, ikke alpha på figuren.
                context.beginPath();context.rect(enemy.x-20,-100,65,enemy.cacheEntrance.y+100);
                context.clip();
            }
            const enemyGroundOffset = enemy.type === 'pizza'
                ? PIZZA_GROUND_OFFSET
                : CHARACTER_GROUND_OFFSET;
            const image = characterImages[enemy.type];
            if(enemy.type==='egg' && enemy.eggDrop && image && image.complete && image.naturalWidth>0) {
                drawRollingEgg(enemy,image);
                continue;
            }
            if (image && image.complete && image.naturalWidth > 0) {
                if(enemy.type==='banana'){
                    // En større, jordfast figur. Samme koordinater bruges af
                    // hånden og kastet, så skrællen ikke springer ved slip.
                    context.save();
                    context.translate(enemy.x+enemy.width/2,enemy.y+enemy.height+37*23/512);
                    context.scale(enemy.direction,1);
                    drawWalkingEnemySprite(image,37,'banana',elapsedRealSeconds*10+enemyIndex*1.7,
                        enemy.speed>0&&!enemy.peelThrow,enemy.peelThrow?.age);
                    context.restore();continue;
                }
                const spriteSize = 31;
                    const motionFrames = [
                        { scaleX: 1.06, scaleY: 0.94, lift: 0, rotation: -0.035 },
                        { scaleX: 1.02, scaleY: 0.98, lift: 0.5, rotation: -0.018 },
                        { scaleX: 0.97, scaleY: 1.04, lift: 1.3, rotation: 0.012 },
                        { scaleX: 0.95, scaleY: 1.06, lift: 1.7, rotation: 0.032 },
                        { scaleX: 0.99, scaleY: 1.01, lift: 0.8, rotation: 0.012 },
                        { scaleX: 1.05, scaleY: 0.95, lift: 0, rotation: -0.025 },
                    ];
                    const frameIndex = Math.floor(elapsedRealSeconds * 9 + enemyIndex * 1.7)
                        % motionFrames.length;
                    const pose = motionFrames[frameIndex];
                    const centerX = enemy.x + enemy.width / 2;
                    const bottomY = enemy.y + enemy.height + enemyGroundOffset;
                    const isShaking = enemy.fizzState === 'shaking';
                    const isThrowingCheese = enemy.type === 'pizza'
                        && enemy.cheeseWindupTime > 0;
                    const throwProgress = isThrowingCheese
                        ? 1 - enemy.cheeseWindupTime / PIZZA_THROW_WINDUP_SECONDS
                        : 0;
                    const shakeX = isShaking
                        ? Math.sin(elapsedRealSeconds * 58 + enemyIndex) * 1.65
                        : 0;
                    const shakeY = isShaking
                        ? Math.sin(elapsedRealSeconds * 83 + enemyIndex) * 0.45
                        : 0;
                    const shakeRotation = isShaking
                        ? Math.sin(elapsedRealSeconds * 51 + enemyIndex) * 0.055
                        : enemy.fizzState === 'warning'
                            ? Math.sin(elapsedRealSeconds * 18) * 0.025 : 0;
                    context.save();
                    if (enemy.eggState==='warning') {
                        context.fillStyle='#ffd664';context.font='bold 9px monospace';
                        context.fillText('!',centerX,bottomY-spriteSize-3);
                    }
                    context.translate(
                        centerX + shakeX - enemy.direction * throwProgress * 1.4,
                        bottomY - pose.lift + shakeY,
                    );
                    context.rotate(
                        pose.rotation * enemy.direction
                        + shakeRotation
                        - enemy.direction * Math.sin(throwProgress * Math.PI) * 0.11,
                    );
                    // Kildebillederne vender mod højre. Et negativt x-scale
                    // spejler både krop og ben, når fjenden går mod venstre.
                    context.scale(
                        enemy.direction * pose.scaleX * (1 + throwProgress * 0.07),
                        pose.scaleY * (1 - throwProgress * 0.05),
                    );
                    drawWalkingEnemySprite(
                        image,
                        spriteSize,
                        enemy.type,
                        elapsedRealSeconds * 10 + enemyIndex * 1.7,
                        !isShaking && !isThrowingCheese && !enemy.eggDrop && enemy.speed>0,
                    );
                    context.restore();
                    drawFizzStateEffect(enemy, centerX, bottomY, spriteSize, enemyIndex);
                    drawPizzaThrowWindup(enemy, centerX, bottomY, spriteSize);
                    continue;
            }

            context.fillStyle = enemy.type === 'soda'
                ? '#39cfdb'
                : enemy.type === 'pizza' ? '#f2b33d' : '#ffb34d';
            context.fillRect(enemy.x, enemy.y + 3, enemy.width, enemy.height - 3);
            context.fillStyle = '#33204f';
            const fallbackStep = enemy.fizzState === 'shaking'
                ? 0
                : Math.sin(elapsedRealSeconds * 10 + enemyIndex * 1.7) * 2;
            context.fillRect(enemy.x + 2 + fallbackStep, enemy.y + enemy.height - 2, 6, 2);
            context.fillRect(
                enemy.x + enemy.width - 8 - fallbackStep,
                enemy.y + enemy.height - 2,
                6,
                2,
            );
            drawFizzStateEffect(
                enemy,
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height + enemyGroundOffset,
                31,
                enemyIndex,
            );
            } finally { context.restore(); }
        }
    }

    function getEggRenderPose(enemy) {
        const tuck=clamp(enemy.eggTuck||0,0,1);
        const angle=enemy.eggState==='warning'
            ? Math.sin(elapsedRealSeconds*35)*.045*(1-tuck) : enemy.eggRotation;
        // Skallens lodrette udstrækning ændrer sig, når ægget ligger på siden.
        // Hold den nederste skalrand ved kontaktfladen, ikke benenes gamle pivot.
        const shellDepth=Math.max(...EGG_SHELL_POINTS.map(point=>
            point.x*enemy.direction*Math.sin(angle)+point.y*Math.cos(angle)))*31/512;
        return {x:enemy.x+enemy.width/2,
            y:enemy.y+enemy.height-shellDepth-4.6*(1-tuck),angle,tuck,shellDepth};
    }

    function drawRollingEgg(enemy,image) {
        const pose=getEggRenderPose(enemy);
        if(enemy.eggState==='warning') {
            context.fillStyle='#ffd664';context.font='bold 9px monospace';
            context.fillText('!',pose.x,enemy.y-5);
        }
        context.save();context.translate(pose.x,pose.y);context.rotate(pose.angle);
        context.scale(enemy.direction*31/512,31/512);
        // Den eksisterende rendering deles i skal og to ben. Benene drejer
        // ind mod kroppen og trækkes bag skallen; de falmer ikke blot væk.
        if(pose.tuck<.999) for(let leg=0;leg<2;leg++) {
            const side=leg===0?-1:1,hipX=leg===0?-86:75,hipY=132-45*pose.tuck;
            context.save();context.translate(hipX,hipY);
            context.rotate(side*pose.tuck*1.4);
            context.scale(1-.3*pose.tuck,1-.85*pose.tuck);
            context.drawImage(image,leg*image.naturalWidth/2,image.naturalHeight*374/512,
                image.naturalWidth/2,image.naturalHeight*138/512,
                leg*256-270-hipX,374-244-132,256,138);
            context.restore();
        }
        // Omridset følger æggeskallen i food-egg.png, så ingen flad afklippet
        // kant eller grønne sko bliver en del af den roterende skal.
        context.translate(-270,-244);context.beginPath();context.moveTo(269,89);
        for(const curve of EGG_SHELL_CURVES) context.bezierCurveTo(...curve);
        context.closePath();context.clip();context.drawImage(image,0,0,512,512);
        context.restore();
    }

    function getBananaHandPose(age) {
        const keys=[[0,-115,-205],[.25,-48,-305],[.65,-158,-245],[.85,-195,-335],[1.15,-115,-205]];
        const t=clamp(age??0,0,1.15);
        for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
            const a=keys[i-1],b=keys[i],u=(t-a[0])/(b[0]-a[0]),s=u*u*(3-2*u);
            return {x:a[1]+(b[1]-a[1])*s,y:a[2]+(b[2]-a[2])*s};
        }
    }

    function drawWalkingEnemySprite(image, spriteSize, enemyType, walkPhase, isMoving, peelAge) {
        if(enemyType==='banana'){
            // Bananens sko starter højere end de andre figurers. To separate
            // udsnit med hofteled giver tydelige skridt uden et ekstra sæt ben.
            context.save();context.scale(spriteSize/512,spriteSize/512);
            const swing=isMoving?Math.sin(walkPhase)*.6:0;
            for(const [sx,sy,w,h,hx,hy,side] of [[140,365,96,111,-45,-139,-1],[282,405,108,84,49,-98,1]]){
                context.save();context.translate(hx,hy);
                context.rotate(side*swing);
                context.drawImage(image,sx/512*image.naturalWidth,sy/512*image.naturalHeight,
                    w/512*image.naturalWidth,h/512*image.naturalHeight,-w/2,0,w,h);
                context.restore();
            }
            // Følg frugtens buede underside; den oprindelige benpose klippes væk.
            context.save();context.beginPath();context.moveTo(-256,-512);context.lineTo(256,-512);
            context.lineTo(256,-172);context.lineTo(118,-172);context.lineTo(125,-107);
            context.quadraticCurveTo(22,-90,-38,-146);context.lineTo(-65,-172);
            // Fjern den indbagte venstre arm; dens handske genbruges på et
            // bevægeligt led i stedet for at vise to arme oven på hinanden.
            context.lineTo(-58,-172);context.lineTo(-58,-228);
            context.lineTo(-53,-280);context.lineTo(-256,-280);
            context.closePath();context.clip();
            context.drawImage(image,-256,-512,512,512);
            context.restore();
            const hand=getBananaHandPose(peelAge);
            if(peelAge!==undefined && peelAge>=.25 && peelAge<.85){
                const pull=clamp((peelAge-.25)/.4,0,1);
                // Strimlen hænger først fast langs siden og løsnes fra top
                // til bund. Den lyse inderside gør bevægelsen aflæselig.
                const rootX=-45+(hand.x+25+45)*pull,rootY=-180+(hand.y+90+180)*pull;
                context.fillStyle='#ffd43b';context.strokeStyle='#b67c16';context.lineWidth=3;
                context.beginPath();context.moveTo(hand.x-8,hand.y);
                context.bezierCurveTo(hand.x-36,hand.y+60,rootX-32,rootY,rootX,rootY);
                context.bezierCurveTo(rootX+15,rootY-18,hand.x+28,hand.y+42,hand.x+10,hand.y);
                context.closePath();context.fill();context.stroke();
                context.strokeStyle='#fff2a0';context.lineWidth=7;context.beginPath();
                context.moveTo(hand.x,hand.y+14);context.quadraticCurveTo(hand.x-8,hand.y+65,rootX,rootY-7);context.stroke();
            }
            const armShade=context.createLinearGradient(-53,-272,hand.x,hand.y+12);
            armShade.addColorStop(0,'#9360ce');armShade.addColorStop(.5,'#67329c');armShade.addColorStop(1,'#402169');
            context.lineCap='round';context.strokeStyle='#4e2681';context.lineWidth=25;
            context.beginPath();context.moveTo(-53,-260);
            context.quadraticCurveTo(hand.x-20,(hand.y-260)/2,hand.x,hand.y);context.stroke();
            context.strokeStyle=armShade;context.lineWidth=19;context.stroke();
            context.drawImage(image,120/512*image.naturalWidth,280/512*image.naturalHeight,
                64/512*image.naturalWidth,64/512*image.naturalHeight,hand.x-32,hand.y-28,64,64);
            context.restore();return;
        }
        // Fjendebillederne er enkelte renderinger. For at få ægte benbevægelse
        // deles den nederste del i to halvdele, der roterer modsat hinanden.
        // Kroppen tegnes bagefter og skjuler samlingen ved hofterne.
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const legStartFraction = ['banana','pizza'].includes(enemyType) ? 0.81
            : enemyType === 'soda' ? 0.65 : 0.67;
        const bodyEndFraction = ['banana','pizza'].includes(enemyType) ? 0.82
            : enemyType === 'soda' ? 0.74 : 0.77;
        const legSourceY = Math.round(sourceHeight * legStartFraction);
        const legSourceHeight = sourceHeight - legSourceY;
        const halfSourceWidth = sourceWidth / 2;
        const legDrawHeight = spriteSize * (1 - legStartFraction);
        const legTopY = -legDrawHeight;
        const swing = isMoving ? Math.sin(walkPhase) * 0.24 : 0;

        for (let legIndex = 0; legIndex < 2; legIndex += 1) {
            const side = legIndex === 0 ? -1 : 1;
            context.save();
            context.translate(side * spriteSize * 0.24, legTopY);
            context.rotate(side * swing);
            context.drawImage(
                image,
                legIndex * halfSourceWidth,
                legSourceY,
                halfSourceWidth,
                legSourceHeight,
                -spriteSize * 0.25,
                0,
                spriteSize * 0.5,
                legDrawHeight,
            );
            context.restore();
        }

        const bodySourceHeight = Math.round(sourceHeight * bodyEndFraction);
        context.drawImage(
            image,
            0,
            0,
            sourceWidth,
            bodySourceHeight,
            -spriteSize / 2,
            -spriteSize,
            spriteSize,
            spriteSize * bodyEndFraction,
        );
    }

    function drawFizzStateEffect(enemy, centerX, bottomY, spriteSize, enemyIndex) {
        if (enemy.type === 'soda' && enemy.fizzState === 'warning') {
            // Samme udråbstegn som æggets forvarsel, uden skjold eller boble.
            context.save();
            context.fillStyle = '#ffd664';
            context.font = 'bold 9px monospace';
            context.textAlign = 'center';
            context.fillText('!', centerX, bottomY - spriteSize - 3);
            context.restore();
            return;
        }
        if (enemy.type !== 'soda' || enemy.fizzState !== 'shaking') return;

        const centerY = bottomY - spriteSize / 2;
        const pulse = (Math.sin(elapsedRealSeconds * 14 + enemyIndex) + 1) / 2;
        context.save();

        // Frie bobler og orange gnister signalerer tryk og ustabilitet uden at
        // danne en cirkel omkring figuren, der kan aflæses som et skjold.
        context.lineWidth = 1;
        for (let index = 0; index < 5; index += 1) {
            const angle = elapsedRealSeconds * 7 + index * Math.PI * 0.72;
            const radius = 11 + (index % 2) * 3 + pulse * 1.5;
            const effectX = centerX + Math.cos(angle) * radius;
            const effectY = centerY + Math.sin(angle) * 8;
            if (index % 2 === 0) {
                context.strokeStyle = '#9cffff';
                context.beginPath();
                context.arc(effectX, effectY, 1.2 + pulse * 0.8, 0, Math.PI * 2);
                context.stroke();
            } else {
                context.fillStyle = '#ff9a43';
                context.fillRect(effectX - 1, effectY - 2, 2, 4);
                context.fillRect(effectX - 2, effectY - 1, 4, 2);
            }
        }
        context.restore();
    }

    function drawPizzaThrowWindup(enemy, centerX, bottomY, spriteSize) {
        if (enemy.type !== 'pizza' || enemy.cheeseWindupTime <= 0) return;

        const progress = clamp(
            1 - enemy.cheeseWindupTime / PIZZA_THROW_WINDUP_SECONDS,
            0,
            1,
        );
        const blobX = centerX + enemy.direction * (spriteSize * 0.38 + progress * 2.2);
        const blobY = bottomY - spriteSize * 0.52 - Math.sin(progress * Math.PI) * 2;
        const radius = 2.2 + progress * 2.4;

        context.save();
        context.fillStyle = '#ffd45b';
        context.strokeStyle = '#d97922';
        context.lineWidth = 0.8;
        context.beginPath();
        context.arc(blobX, blobY, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = 'rgba(255, 255, 220, 0.85)';
        context.beginPath();
        context.arc(blobX - radius * 0.3, blobY - radius * 0.35, radius * 0.28, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function drawCheeseProjectiles() {
        for (const projectile of cheeseProjectiles) {
            context.save();
            context.translate(projectile.x, projectile.y);
            context.rotate(projectile.rotation);

            // En asymmetrisk osteklump med to dråber er tydeligere i bevægelse
            // end en perfekt cirkel og kræver ikke endnu et bitmapasset.
            context.fillStyle = '#ffd45b';
            context.strokeStyle = '#d97922';
            context.lineWidth = 0.9;
            context.beginPath();
            context.moveTo(-4.5, -2.2);
            context.bezierCurveTo(-1.2, -5, 3.8, -3.8, 4.8, -0.5);
            context.bezierCurveTo(5.2, 2.4, 1.5, 3.8, -2.1, 3.1);
            context.bezierCurveTo(-4.4, 2.5, -5.5, 0.2, -4.5, -2.2);
            context.closePath();
            context.fill();
            context.stroke();
            context.fillStyle = '#fff2a8';
            context.beginPath();
            context.arc(-1.2, -1.4, 1.05, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }

    function getEatingMouthPosition() {
        const pose = getPlayerAnimationPose();
        const anchor = dexRenderer && dexRenderer.available ? dexRenderer.mouthAnchor
            : {x:player.facing*(5.8+(pose.forward||0)), y:CHARACTER_GROUND_OFFSET-(pose.lift||0)-18.5};
        return {x:player.x+PLAYER_WIDTH/2+anchor.x, y:player.y+PLAYER_HEIGHT+anchor.y};
    }

    function getEatingFoodPose(enemy, mouth = getEatingMouthPosition()) {
        const progress = clamp(1-enemy.biteAnimationTime/ENEMY_BITE_FRAME_SECONDS, 0, 1);
        const pull = progress*progress*(3-2*progress);
        const startX = enemy.x+enemy.width/2;
        const startY = enemy.y+enemy.height
            +(enemy.type==='pizza'?PIZZA_GROUND_OFFSET:CHARACTER_GROUND_OFFSET)-31/2;
        // Start med hele figuren på dens faktiske plads, løft den mod munden
        // og krymp til præcis nul. Slutpunktet følger DEX, også under bevægelse.
        return {x:startX+(mouth.x-startX)*pull,
            y:startY+(mouth.y-startY)*pull-Math.sin(progress*Math.PI)*2,
            size:31*Math.pow(1-progress,1.15),
            rotation:-player.facing*Math.sin(progress*Math.PI)*.32,
            direction:enemy.direction || 1, progress};
    }

    function drawEatenEnemyInMouth() {
        for (const enemy of enemies) {
            if (enemy.biteAnimationTime<=0) continue;
            const image = characterImages[enemy.type];
            if (!image || !image.complete || image.naturalWidth<=0) continue;
            const food = getEatingFoodPose(enemy);
            if (dexRenderer && dexRenderer.available) {
                dexRenderer.drawFood(context, image, player.x+PLAYER_WIDTH/2,
                    player.y+PLAYER_HEIGHT, food, player.facing);
                continue;
            }
            // Sprite-reserven bruger samme flyvebane og nul-slutstørrelse.
            const mouth = getEatingMouthPosition();
            context.save();context.beginPath();
            context.ellipse(mouth.x,mouth.y,7.5,8.5,0,0,Math.PI*2);
            context.rect(player.facing>0?mouth.x+6:mouth.x-1006,mouth.y-1000,1000,2000);
            context.clip();context.translate(food.x,food.y);context.rotate(food.rotation);
            context.scale(food.direction,1);
            context.drawImage(image,-food.size/2,-food.size/2,food.size,food.size);
            context.restore();
        }
    }

    function drawPlayer() {
        const blinkingDuringDeath = gameState === 'dying'
            && Math.floor(deathTime * 14) % 2 === 0;
        if (blinkingDuringDeath) return;
        if (dexRenderer && dexRenderer.draw(context, player.x + PLAYER_WIDTH / 2,
            player.y + PLAYER_HEIGHT, {player, bg:getGameBG(), fatigue:getHighBGFatigue(),
                gear:autoPumpActive?'backpack':pumpActive?'pump':'none', stock:pumpInsulinStored,
                time:elapsedRealSeconds, lowAlarm:bgAlarmZone==='low', dying:gameState==='dying'})) return;

        const pose = getPlayerAnimationPose();
        const image = pose.image;

        if (image.complete && image.naturalWidth > 0) {
            const spriteSize = pose.spriteSize || 32;
            const centerX = player.x + PLAYER_WIDTH / 2;
            const playerBottom = player.y + PLAYER_HEIGHT;
            const visualBottom = playerBottom + CHARACTER_GROUND_OFFSET;
            drawPlayerGlucoseTail();
            context.save();
            context.globalAlpha = 1;
            if (player.invulnerableTime > 0 && gameState !== 'dying') {
                // En fast glød viser den korte beskyttelse efter start eller
                // respawn uden at gøre monsteret gennemsigtigt eller usynligt.
                context.shadowColor = '#70e2df';
                context.shadowBlur = 3;
            }
            if (gameState === 'dying') {
                context.translate(centerX, player.y + PLAYER_HEIGHT / 2);
                context.rotate(player.animationTime * 5.2);
                context.scale(player.facing, 1);
                context.translate(0, spriteSize / 2);
                drawModularPlayerSprite(pose, spriteSize, getHighBGFatigue());
                context.restore();
                return;
            }

            // Skalering omkring fødderne skaber ekstra synlige frames uden at
            // få figuren til at svæve over eller synke ned i platformen.
            context.translate(
                centerX + player.facing * (pose.forward || 0),
                visualBottom - pose.lift + getHighBGFatigue() * 0.8,
            );
            // En langsom, lille frem-og-tilbage-hældning gør døsigheden synlig
            // på figuren uden at forvrænge de færdigrenderede spriteframes.
            const drowsySway = Math.sin(elapsedRealSeconds * 2.1)
                * getHighBGFatigue()
                * 0.06;
            context.rotate(pose.rotation * player.facing + drowsySway);
            context.scale(player.facing * pose.scaleX, pose.scaleY);
            drawModularPlayerSprite(pose, spriteSize, getHighBGFatigue());
            context.restore();
            return;
        }

        // Enkel fallback, mens monsterbilledet indlæses.
        context.fillStyle = '#7028a7';
        context.fillRect(player.x, player.y + 3, PLAYER_WIDTH, PLAYER_HEIGHT - 3);
        context.fillStyle = '#70e2df';
        context.fillRect(player.x + 2, player.y + PLAYER_HEIGHT - 3, 5, 3);
        context.fillRect(player.x + PLAYER_WIDTH - 7, player.y + PLAYER_HEIGHT - 3, 5, 3);
    }

    function drawModularPlayerSprite(pose, spriteSize, highBGFatigue) {
        const legHeight = spriteSize * 0.29;
        const legImage = pose.image;
        const usesSpecialMouth = pose.name.startsWith('eat-');
        const bodyImage = usesSpecialMouth ? pose.image : characterImages.idle;

        // Auto-pumpens rygsæk ligger bag kroppen, så remmene kan forsvinde
        // naturligt ind bag monsteret, mens selve enheden stikker ud ved ryggen.
        if (autoPumpActive) drawAutoPumpBackpackLayer(spriteSize);

        // Benene tegnes først og klippes til figurens nederste del. Kroppen kan
        // derfor genbruges med alle løbe-, spring- og landingsposer uden nye
        // kombinationsbilleder. Et lille overlap skjuler samlingen ved anklerne.
        context.save();
        context.beginPath();
        context.rect(-spriteSize / 2, -legHeight - 1, spriteSize, legHeight + 2);
        context.clip();
        context.drawImage(
            legImage,
            -spriteSize / 2,
            -spriteSize,
            spriteSize,
            spriteSize,
        );
        context.restore();

        context.save();
        context.beginPath();
        context.rect(
            -spriteSize / 2,
            -spriteSize,
            spriteSize,
            spriteSize - legHeight + 2,
        );
        context.clip();
        context.drawImage(
            bodyImage,
            -spriteSize / 2,
            -spriteSize,
            spriteSize,
            spriteSize,
        );
        context.restore();

        drawDrowsyFaceLayer(spriteSize, highBGFatigue, usesSpecialMouth);
        if (pumpActive && !autoPumpActive) drawWornPumpLayer(spriteSize);
        drawCheekCGM(spriteSize);
    }

    function drawCheekCGM(spriteSize) {
        // Sensoren sidder kun på DEX' højre kind. Når han vender om og løber
        // tilbage mod banens start, ser spilleren den modsatte kind, og CGM'en
        // skal derfor ikke spejles kunstigt over på den side.
        if (player.facing < 0) return;

        // Den færdigrenderede sensor tegnes i figurens lokale koordinater. Den
        // følger dermed automatisk rotation, hop, løb og spiseframes.
        // Den tynde runde front komprimeres let til kindens perspektiv og
        // placeres inden for kroppen uden en fremspringende sidevæg.
        const unit = spriteSize / 32;
        const bg = getGameBG();

        // Farven og pulsmønsteret ændres kontinuerligt med sandt BG. Grøn er
        // rolig midte; under 5,2 mmol/L glider farven mod rød og enkeltpulsen
        // bliver gradvist hurtigere. Over 8 mmol/L glider den mod orange,
        // mens en anden puls vokser ind og danner et tydeligere puls-par.
        const smoothStep = (value) => value * value * (3 - 2 * value);
        const lowSeverity = smoothStep(clamp((5.2 - bg) / 2.4, 0, 1));
        const highSeverity = smoothStep(clamp((bg - 8) / 10, 0, 1));
        const normalColor = [42, 255, 95];
        const lowColor = [255, 73, 103];
        const highColor = [255, 159, 67];
        const targetColor = lowSeverity > 0
            ? lowColor
            : highColor;
        const colorBlend = Math.max(lowSeverity, highSeverity);
        const lampColor = normalColor.map((channel, index) => Math.round(
            channel + (targetColor[index] - channel) * colorBlend,
        ));
        const alarmColor = `rgb(${lampColor.join(', ')})`;

        // En pulscyklus er langsom i normalområdet. Lavere BG forkorter hele
        // cyklussen kontinuerligt; højere BG gør den lidt langsommere, men
        // føjer gradvist den forsinkede anden puls til hvert slag.
        const pulsePeriodSeconds = 1.32 - lowSeverity * 0.78 + highSeverity * 0.18;
        const pulsePhase = (elapsedRealSeconds / pulsePeriodSeconds) % 1;
        const getPulsePeak = (center, width) => {
            const directDistance = Math.abs(pulsePhase - center);
            const wrappedDistance = Math.min(directDistance, 1 - directDistance);
            return Math.exp(-Math.pow(wrappedDistance / width, 2));
        };
        const primaryPulse = getPulsePeak(0.13, 0.075);
        const pairedPulse = getPulsePeak(0.34, 0.075) * highSeverity;
        const pulseStrength = Math.max(primaryPulse, pairedPulse);
        const centerX = -6.7 * unit;
        const centerY = -17.1 * unit;
        const sensorWidth = 5.7 * unit;
        const sensorHeight = 6.1 * unit;

        context.save();
        if (
            characterImages.cgmOverlay.complete
            && characterImages.cgmOverlay.naturalWidth > 0
        ) {
            // Rund udklipning af den renderede front. Perspektivet er kun
            // let komprimeret, og hele sensoren ligger inden for kinden.
            // Klippet udelukker også billedværktøjets baggrund uden for disken.
            context.save();
            context.beginPath();
            context.ellipse(centerX, centerY, sensorWidth / 2, sensorHeight / 2, 0, 0, Math.PI * 2);
            context.clip();
            context.drawImage(
                characterImages.cgmOverlay,
                96, 86, 1062, 1062,
                centerX - sensorWidth / 2,
                centerY - sensorHeight / 2,
                sensorWidth,
                sensorHeight,
            );
            context.restore();
        }

        // Lampen fylder bevidst cirka halvdelen af frontens diameter. Kun lampens
        // farvelag animeres; selve CGM-renderingen forbliver skarp og stabil.
        const lampCenterX = centerX;
        const lampCenterY = centerY;
        // Opaquen mørk bund dækker den fotograferede linse helt. Dermed er
        // slukket faktisk mørk, ikke en gennemsigtig grøn oven på et lyst glas.
        const darkColor = [2, 14, 6];
        const visibleColor = darkColor.map((channel, index) => Math.round(
            channel + (lampColor[index] - channel) * pulseStrength,
        ));
        context.shadowColor = alarmColor;
        context.shadowBlur = pulseStrength * (4.2 + colorBlend * 1.4) * unit;
        context.globalAlpha = 1;
        context.fillStyle = `rgb(${visibleColor.join(', ')})`;
        context.beginPath();
        context.ellipse(
            lampCenterX,
            lampCenterY,
            1.58 * unit,
            1.69 * unit,
            0,
            0,
            Math.PI * 2,
        );
        context.fill();

        context.shadowBlur = 0;
        context.globalAlpha = pulseStrength * 0.95;
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.ellipse(
            lampCenterX - 0.23 * unit,
            lampCenterY - 0.36 * unit,
            0.23 * unit,
            0.31 * unit,
            -0.48,
            0,
            Math.PI * 2,
        );
        context.fill();
        context.restore();
    }

    function drawDrowsyFaceLayer(spriteSize, highBGFatigue, usesSpecialMouth) {
        // Spiseframes beholder den store mund, fordi handlingen skal kunne
        // aflæses. I alle andre tilstande tegnes et fælles træt ansigtslag.
        if (usesSpecialMouth || highBGFatigue <= 0.02) return;
        const unit = spriteSize / 32;
        const fatigue = clamp(highBGFatigue, 0, 1);
        context.save();

        // Hvert låg klippes til sit eget øje. De kan derfor aldrig mødes som
        // en solbrille eller rage uden for hovedets silhuet. Ved stigende
        // træthed flyttes den buede underkant ned gennem øjet.
        drawClippedDrowsyEyelid({
            centerX: 1.7,
            centerY: -20.9,
            radiusX: 4.05,
            radiusY: 3.35,
            rotation: -0.04,
            closure: 0.13 + fatigue * 0.77,
            unit,
        });
        drawClippedDrowsyEyelid({
            centerX: 8.5,
            centerY: -21.05,
            radiusX: 2.5,
            radiusY: 3.05,
            rotation: 0.07,
            closure: 0.12 + fatigue * 0.78,
            unit,
        });

        // En selvstændig rendering dækker hele det permanente grin. Udsnittet
        // ligger inden i renderingens lilla flade, og den ovale maske undgår
        // både billedets yderkant og en synlig rektangulær samling på kinden.
        if (fatigue >= 0.2) {
            const mouthImage = characterImages.drowsyMouthOverlay;
            if (mouthImage.complete && mouthImage.naturalWidth > 0) {
                context.save();
                context.beginPath();
                context.ellipse(
                    3.5 * unit,
                    -13.5 * unit,
                    8.8 * unit,
                    5.2 * unit,
                    0,
                    0,
                    Math.PI * 2,
                );
                context.clip();
                context.globalAlpha = 1;
                context.drawImage(
                    mouthImage,
                    350,
                    350,
                    700,
                    500,
                    -5.3 * unit,
                    -19.8 * unit,
                    17.6 * unit,
                    11.6 * unit,
                );
                context.restore();
            } else {
                // Enkel fuldt dækkende reserve, mens renderingen indlæses.
                context.fillStyle = '#772092';
                context.beginPath();
                context.ellipse(3.5 * unit, -14 * unit, 8.8 * unit, 5.8 * unit, 0, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = '#2a0d35';
                context.lineWidth = 1.25 * unit;
                context.beginPath();
                context.moveTo(-0.4 * unit, -11.8 * unit);
                context.quadraticCurveTo(3.3 * unit, -14.6 * unit, 7.1 * unit, -11.8 * unit);
                context.stroke();
            }
        }
        context.restore();
    }

    function drawClippedDrowsyEyelid({
        centerX,
        centerY,
        radiusX,
        radiusY,
        rotation,
        closure,
        unit,
    }) {
        const scaledCenterX = centerX * unit;
        const scaledCenterY = centerY * unit;
        const scaledRadiusX = radiusX * unit;
        const scaledRadiusY = radiusY * unit;
        const eyeTop = scaledCenterY - scaledRadiusY;
        const lidEdgeY = eyeTop + scaledRadiusY * 2 * clamp(closure, 0, 0.94);

        context.save();
        context.beginPath();
        context.ellipse(
            scaledCenterX,
            scaledCenterY,
            scaledRadiusX,
            scaledRadiusY,
            rotation,
            0,
            Math.PI * 2,
        );
        context.clip();

        context.fillStyle = '#7b249d';
        context.beginPath();
        context.moveTo(scaledCenterX - scaledRadiusX * 1.25, eyeTop - unit);
        context.lineTo(scaledCenterX + scaledRadiusX * 1.25, eyeTop - unit);
        context.lineTo(scaledCenterX + scaledRadiusX * 1.25, lidEdgeY);
        context.quadraticCurveTo(
            scaledCenterX,
            lidEdgeY + 0.55 * unit,
            scaledCenterX - scaledRadiusX * 1.25,
            lidEdgeY,
        );
        context.closePath();
        context.fill();

        context.strokeStyle = '#351044';
        context.lineWidth = 0.85 * unit;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(scaledCenterX - scaledRadiusX, lidEdgeY);
        context.quadraticCurveTo(
            scaledCenterX,
            lidEdgeY + 0.55 * unit,
            scaledCenterX + scaledRadiusX,
            lidEdgeY,
        );
        context.stroke();
        context.restore();
    }

    function drawWornPumpLayer(spriteSize) {
        // Det mørke bælte ligger bag det udklippede pumpebillede. Kurven følger
        // placeringen i den oprindelige rendering med pumpe på monsteret.
        context.save();
        const unit = spriteSize / 32;
        context.strokeStyle = '#30285d';
        context.lineWidth = 1.8 * unit;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(-9.5 * unit, -13 * unit);
        context.bezierCurveTo(
            -7.8 * unit,
            -11.2 * unit,
            -1.5 * unit,
            -8.5 * unit,
            5 * unit,
            -7.8 * unit,
        );
        context.stroke();

        // En smal glans langs remmens overkant holder den i samme malede stil
        // som det originale figurasset, men uden at bruge pickup-ikonet.
        context.strokeStyle = 'rgba(119, 111, 178, 0.75)';
        context.lineWidth = 0.35 * unit;
        context.beginPath();
        context.moveTo(-9.4 * unit, -13.4 * unit);
        context.bezierCurveTo(
            -7.7 * unit,
            -11.6 * unit,
            -1.4 * unit,
            -8.9 * unit,
            5.1 * unit,
            -8.2 * unit,
        );
        context.stroke();

        // Overlayet er klippet direkte ud af player-monster-pump.png. Det har
        // samme 1254 x 1254 koordinatsystem som kroppen og kan derfor tegnes i
        // præcis samme rektangel uden særskilte udgaver til hver animation.
        if (
            characterImages.pumpOverlay.complete
            && characterImages.pumpOverlay.naturalWidth > 0
        ) {
            context.drawImage(
                characterImages.pumpOverlay,
                -spriteSize / 2,
                -spriteSize,
                spriteSize,
                spriteSize,
            );
        }
        context.restore();
    }

    function drawAutoPumpBackpackLayer(spriteSize) {
        const image = pickupImages.autoPump;
        if (!image.complete || image.naturalWidth <= 0) return;

        const unit = spriteSize / 32;
        const sourceX = Math.round(image.naturalWidth * 0.15);
        const sourceY = Math.round(image.naturalHeight * 0.13);
        const sourceWidth = Math.round(image.naturalWidth * 0.73);
        const sourceHeight = Math.round(image.naturalHeight * 0.74);
        context.save();
        context.shadowColor = 'rgba(61, 239, 157, 0.68)';
        context.shadowBlur = 1.2 * unit;
        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            -21.5 * unit,
            -28 * unit,
            17 * unit,
            17 * unit,
        );

        // Dæk de tre altid-lysende rør i kildebilledet. Den synlige yderside
        // får i stedet tre levende kamre, der følger det faktiske lager.
        context.shadowBlur = 0;
        context.fillStyle = '#242544';
        context.fillRect(-14.8 * unit, -24.7 * unit, 5.3 * unit, 9.4 * unit);
        drawPumpReservoirs(-20.7 * unit, -21.6 * unit, unit);

        // Den store ravfarvede lampe er placeret på den synlige yderkant af
        // rygsækken. Pulsen viser, at automatikken er aktiv, også når resten
        // af enheden delvist dækkes af monsterets krop.
        const automaticPulse = 0.48 + (Math.sin(elapsedRealSeconds * 5.4) + 1) * 0.26;
        context.globalAlpha = automaticPulse;
        context.fillStyle = '#ffbd45';
        context.shadowColor = '#ff9f1f';
        context.shadowBlur = 2.2 * unit;
        context.beginPath();
        context.arc(-18.1 * unit, -24.3 * unit, 0.78 * unit, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function drawPumpReservoirs(x, y, unit) {
        // Tre blå rør har både tom/fuld-kontrast og samme rækkefølge som HUD.
        // Rammerne forbliver synlige, så slukket ikke kan forveksles med fravær.
        for (let slot = 0; slot < 3; slot += 1) {
            const tubeY = y + slot * 2.7 * unit;
            context.fillStyle = '#071424';
            context.strokeStyle = '#76909f';
            context.lineWidth = 0.5 * unit;
            context.beginPath();
            context.roundRect(x, tubeY, 4.8 * unit, 2 * unit, 0.65 * unit);
            context.fill();
            context.stroke();
            const filled = slot < pumpInsulinStored;
            const discharge = !filled && slot === pumpInsulinStored
                && player.insulinUseSource === 'pump' ? player.insulinUseTime : 0;
            context.fillStyle = filled || discharge > 0 ? '#33d9ff' : '#153649';
            context.shadowColor = '#26cfff';
            context.shadowBlur = filled ? 2 * unit : 0;
            context.fillRect(x + 0.6 * unit, tubeY + 0.55 * unit,
                3.6 * unit * (filled ? 1 : Math.max(0.1, discharge)), 0.9 * unit);
            context.shadowBlur = 0;
        }
    }

    function drawPlayerActionEffects() {
        if (gameState !== 'playing') return;
        const centerX = player.x + PLAYER_WIDTH / 2;
        const is3D = dexRenderer && dexRenderer.available;
        const feetY = player.y + PLAYER_HEIGHT + (is3D ? 0 : CHARACTER_GROUND_OFFSET);
        const pose = getPlayerAnimationPose();
        context.save();
        context.translate(centerX + (is3D ? 0 : player.facing * (pose.forward || 0)), feetY - (is3D ? 0 : pose.lift));
        context.scale(player.facing, 1);
        if (player.candyUseTime > 0) {
            const progress = 1 - player.candyUseTime / 0.9;
            // Bolsjet flyttes fra hånden ind i den allerede åbnede mund og
            // bliver mindre under biddet. Ingen forsinkelse af modelinputtet.
            const bite = clamp((progress - 0.2) / 0.65, 0, 1);
            const mouth = is3D ? dexRenderer.mouthAnchor : null;
            const candyX = is3D ? 16 + (mouth.x * player.facing - 16) * bite : 16 - bite * 12;
            const candyY = is3D ? -9 + (mouth.y + 9) * bite : -12 - Math.sin(bite * Math.PI / 2) * 4;
            if (!is3D) {
                context.fillStyle = '#9b3bc4';
                context.beginPath();
                context.ellipse(candyX + 1, candyY + 3, 2.7, 1.8, -0.4, 0, Math.PI * 2);
                context.fill();
            }
            drawPickup('candy', candyX, candyY, Math.max(0.2, 9 * (1 - bite)), false);
        }
        if (player.insulinUseTime > 0) {
            const progress = 1 - player.insulinUseTime;
            // Turkise dråber fra udstyret ind i kroppen, aldrig en skjoldring.
            for(let i=0;i<5;i++){
                const t=clamp((progress-i*.09)/.55,0,1);
                if(t<=0||t>=1)continue;
                const source=player.insulinUseSource==='pen'?10:-14;
                window.DexGlucoseParticles.drawInsulinGlyph(context,source*(1-t),-12+Math.sin(t*Math.PI)*2,
                    .9,Math.sin(t*Math.PI));
            }
            if (player.insulinUseSource === 'pen') {
                const approach = Math.sin(Math.min(progress / 0.45, 1) * Math.PI / 2);
                context.save();
                context.translate(14 - approach * 8, -9);
                context.rotate(-0.75);
                drawPickup('insulin', 0, 0, 11, false);
                context.restore();
            } else {
                // En tydelig strømpuls fra pumpen til kroppen viser en dosis,
                // mens en pen, der kun lagres, alene har HUD-flyveanimationen.
                context.fillStyle = '#aff8ff';
                context.beginPath();
                context.arc(-14 + progress * 14, -12 + progress * 3, 1.2, 0, Math.PI * 2);
                context.fill();
            }
        }
        context.restore();
    }

    function drawPlayerGlucoseTail() {
        if (tailSegments.length < 2) return;
        // En let udglatning bevarer fysikkens bevægelse, men fjerner små knæk
        // mellem Verlet-segmenterne, før der bygges en egentlig silhuet.
        const centerPoints = tailSegments.map((segment, index) => {
            if (index === 0 || index === tailSegments.length - 1) {
                return { x: segment.x, y: segment.y };
            }
            const previous = tailSegments[index - 1];
            const next = tailSegments[index + 1];
            return {
                x: (previous.x + segment.x * 2 + next.x) / 4,
                y: (previous.y + segment.y * 2 + next.y) / 4,
            };
        });
        const root = centerPoints[0];
        const tip = centerPoints[centerPoints.length - 1];

        context.save();
        // Den mørke ydersilhuet er bred ved kroppen og ender næsten i et
        // punkt. Dermed får halen anatomi i stedet for en rund stregende.
        context.fillStyle = '#4d1266';
        context.fill(createTaperedTailPath(centerPoints, 3.15, 0.18));

        // En lidt smallere lilla kerne efterlader kun en smal mørk kant. Halen
        // skifter ikke længere farve med BG; alarmen sidder på kindens CGM.
        const innerGradient = context.createLinearGradient(
            root.x,
            root.y,
            tip.x,
            tip.y,
        );
        innerGradient.addColorStop(0, '#b14adb');
        innerGradient.addColorStop(0.45, '#9845cb');
        innerGradient.addColorStop(0.78, '#c15be0');
        innerGradient.addColorStop(1, '#d779ed');
        context.fillStyle = innerGradient;
        context.shadowColor = '#b14adb';
        context.shadowBlur = 1.2;
        context.fill(createTaperedTailPath(centerPoints, 2.35, 0.06));
        context.restore();
    }

    function createTaperedTailPath(centerPoints, rootHalfWidth, tipHalfWidth) {
        const leftEdge = [];
        const rightEdge = [];
        const lastIndex = centerPoints.length - 1;

        for (let index = 0; index <= lastIndex; index += 1) {
            const previous = centerPoints[Math.max(0, index - 1)];
            const next = centerPoints[Math.min(lastIndex, index + 1)];
            const tangentX = next.x - previous.x;
            const tangentY = next.y - previous.y;
            const tangentLength = Math.max(0.001, Math.hypot(tangentX, tangentY));
            const normalX = -tangentY / tangentLength;
            const normalY = tangentX / tangentLength;
            const progress = index / lastIndex;
            const halfWidth = tipHalfWidth
                + (rootHalfWidth - tipHalfWidth) * Math.pow(1 - progress, 0.72);

            leftEdge.push({
                x: centerPoints[index].x + normalX * halfWidth,
                y: centerPoints[index].y + normalY * halfWidth,
            });
            rightEdge.push({
                x: centerPoints[index].x - normalX * halfWidth,
                y: centerPoints[index].y - normalY * halfWidth,
            });
        }

        const path = new Path2D();
        path.moveTo(leftEdge[0].x, leftEdge[0].y);
        traceSmoothTailEdge(path, leftEdge);
        // De to næsten sammenfaldende kanter danner en lille afrunding uden
        // at skabe den tydelige kugle, som den gamle arc() gav.
        path.quadraticCurveTo(
            centerPoints[lastIndex].x,
            centerPoints[lastIndex].y,
            rightEdge[lastIndex].x,
            rightEdge[lastIndex].y,
        );
        traceSmoothTailEdge(path, [...rightEdge].reverse());
        path.closePath();
        return path;
    }

    function traceSmoothTailEdge(path, edgePoints) {
        for (let index = 1; index < edgePoints.length - 1; index += 1) {
            const point = edgePoints[index];
            const next = edgePoints[index + 1];
            path.quadraticCurveTo(
                point.x,
                point.y,
                (point.x + next.x) / 2,
                (point.y + next.y) / 2,
            );
        }
        const finalPoint = edgePoints[edgePoints.length - 1];
        path.lineTo(finalPoint.x, finalPoint.y);
    }

    function getPlayerAnimationPose() {
        if (player.eatAnimationTime > 0) {
            const progress = clamp(1 - player.eatAnimationTime / EAT_ANIMATION_SECONDS, 0, 0.999);
            const swallowingTime = Math.max(0,...enemies.map(enemy=>enemy.biteAnimationTime));
            const frameIndex = swallowingTime>0
                ? Math.min(4,2+Math.floor((1-swallowingTime/ENEMY_BITE_FRAME_SECONDS)*3))
                : Math.floor(progress * 8);
            const eatFrames = [
                { name: 'eat-brake', image: characterImages.idle, spriteSize: 32, scaleX: 1, scaleY: 1, lift: 0, rotation: 0, forward: 0 },
                { name: 'eat-windup', image: characterImages.eat, spriteSize: 35, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.025, forward: 1.5 },
                { name: 'eat-open-wide', image: characterImages.devour, spriteSize: 41, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018, forward: 5 },
                { name: 'eat-engulf', image: characterImages.devour, spriteSize: 44, scaleX: 1, scaleY: 1, lift: 0, rotation: 0, forward: 9 },
                { name: 'eat-chomp', image: characterImages.devour, spriteSize: 42, scaleX: 1, scaleY: 1, lift: 0, rotation: 0.018, forward: 8 },
                { name: 'eat-chew', image: characterImages.eat, spriteSize: 35, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018, forward: 4 },
                { name: 'eat-gulp', image: characterImages.eat, spriteSize: 34, scaleX: 1, scaleY: 1, lift: 0, rotation: 0.012, forward: 1.5 },
                { name: 'eat-finish', image: characterImages.idle, spriteSize: 32, scaleX: 1, scaleY: 1, lift: 0, rotation: 0, forward: 0 },
            ];
            return eatFrames[frameIndex];
        }

        if (player.eatAnticipation > 0) {
            const anticipation = player.eatAnticipation;
            return {
                name: 'eat-approach',
                image: characterImages.eat,
                spriteSize: 33 + anticipation * 3,
                scaleX: 1,
                scaleY: 1,
                lift: 0,
                rotation: -0.018 * anticipation,
                forward: anticipation * 2.5,
            };
        }

        // Springet har sine egne silhuetter. Figuren strækkes på vej op,
        // samler sig omkring toppunktet og bliver bredere før landingen.
        // Det giver 3 aflæselige luftframes uden flere bitmap-assets.
        if (!player.onGround) {
            if (player.vy < -75) {
                return {
                    name: 'jump-rise',
                    image: characterImages.run,
                    scaleX: 0.88,
                    scaleY: 1.16,
                    lift: 0,
                    rotation: -0.055,
                };
            }
            if (player.vy < 75) {
                return {
                    name: 'jump-apex',
                    image: characterImages.idle,
                    scaleX: 1.05,
                    scaleY: 0.98,
                    lift: 0,
                    rotation: 0.025,
                };
            }
            return {
                name: 'jump-fall',
                image: characterImages.run,
                scaleX: 1.12,
                scaleY: 0.90,
                lift: 0,
                rotation: 0.065,
            };
        }

        const running = Math.abs(player.vx) > 10 && player.onGround;
        if (running) {
            // Billedskiftet følger løbedistancen og er langsommere end den gamle
            // 8-trins squash-cyklus. Kroppen beholder samme højde; det er nu de
            // brede og smalle benstillinger, der skaber bevægelsen.
            const frameIndex = Math.floor(player.runAnimationDistance / 5) % 6;
            const runFrames = [
                { name: 'run-contact-a', image: characterImages.idle, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018 },
                { name: 'run-stride-a', image: characterImages.run, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018 },
                { name: 'run-pass-a', image: characterImages.runPass, scaleX: 1, scaleY: 1, lift: 1.1, rotation: -0.018 },
                { name: 'run-contact-b', image: characterImages.idle, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018 },
                { name: 'run-stride-b', image: characterImages.run, scaleX: 1, scaleY: 1, lift: 0, rotation: -0.018 },
                { name: 'run-pass-b', image: characterImages.runPass, scaleX: 1, scaleY: 1, lift: 1.1, rotation: -0.018 },
            ];
            return runFrames[frameIndex];
        }

        // Fire rolige hvileframes holder monsteret levende, mens spilleren
        // aflæser HUD eller venter på en fjende.
        const idleFrames = [
            { name: 'idle-a', image: characterImages.idle, scaleX: 1.01, scaleY: 0.99, lift: 0, rotation: -0.012 },
            { name: 'idle-b', image: characterImages.idle, scaleX: 0.99, scaleY: 1.01, lift: 0.4, rotation: 0 },
            { name: 'idle-c', image: characterImages.idle, scaleX: 1, scaleY: 1, lift: 0.7, rotation: 0.012 },
            { name: 'idle-d', image: characterImages.idle, scaleX: 1.02, scaleY: 0.98, lift: 0.2, rotation: 0 },
        ];
        return idleFrames[Math.floor(elapsedRealSeconds * 4) % idleFrames.length];
    }

    function drawParticles() {
        for (const particle of particles) {
            if (particle.kind === 'food-pulp') {
                const fraction = clamp(particle.life/particle.maximumLife,0,1);
                const size = particle.size*(.3+.7*Math.sqrt(fraction));
                context.save();context.translate(particle.x,particle.y);context.rotate(particle.rotation);
                context.globalAlpha=Math.min(1,fraction*3);
                context.fillStyle=particle.color;context.beginPath();
                if (particle.droplet) context.ellipse(0,0,size,size*.6,0,0,Math.PI*2);
                else {
                    context.moveTo(-size,-size*.5);context.lineTo(size*.3,-size);
                    context.lineTo(size,size*.2);context.lineTo(-size*.4,size);context.closePath();
                }
                context.fill();context.restore();continue;
            }
            if (particle.text) {
                const visibleFraction = clamp(
                    particle.life / particle.maximumLife,
                    0,
                    1,
                );
                context.save();
                context.globalAlpha = Math.min(1, visibleFraction * 1.8);
                context.font = `bold ${particle.fontSize || 7}px monospace`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.lineWidth = 2.5;
                context.strokeStyle = '#201331';
                context.strokeText(particle.text, particle.x, particle.y);
                context.fillStyle = particle.color;
                context.fillText(particle.text, particle.x, particle.y);
                context.restore();
                continue;
            }
            if (particle.kind === 'fizz-flash') {
                const visibleFraction = clamp(
                    particle.life / particle.maximumLife,
                    0,
                    1,
                );
                context.save();
                context.globalCompositeOperation = 'screen';
                context.globalAlpha = visibleFraction * 0.9;
                const flashGradient = context.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, 28 * (1.1 - visibleFraction * 0.25),
                );
                flashGradient.addColorStop(0, '#ffffff');
                flashGradient.addColorStop(0.28, '#9bfbff');
                flashGradient.addColorStop(1, 'rgba(255, 122, 61, 0)');
                context.fillStyle = flashGradient;
                context.beginPath();
                context.arc(particle.x, particle.y, 30, 0, Math.PI * 2);
                context.fill();
                context.restore();
                continue;
            }
            if (particle.kind === 'fizz-shockwave') {
                const elapsed = particle.maximumLife - particle.life;
                if (elapsed < particle.delay) continue;
                const progress = clamp(
                    (elapsed - particle.delay) / (particle.maximumLife - particle.delay),
                    0,
                    1,
                );
                const radius = particle.startRadius
                    + (particle.endRadius - particle.startRadius) * progress;
                context.save();
                context.globalCompositeOperation = 'screen';
                context.globalAlpha = (1 - progress) * 0.85;
                context.strokeStyle = particle.color;
                context.lineWidth = 2.4 - progress * 1.4;
                context.beginPath();
                context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
                context.stroke();
                context.restore();
                continue;
            }
            if (particle.kind === 'fizz-shard') {
                const visibleFraction = clamp(
                    particle.life / particle.maximumLife,
                    0,
                    1,
                );
                context.save();
                context.globalAlpha = Math.min(1, visibleFraction * 1.7);
                context.translate(particle.x, particle.y);
                context.rotate(particle.rotation);
                context.fillStyle = particle.color;
                context.fillRect(-3.2, -1.35, 6.4, 2.7);
                context.fillStyle = '#e9ffff';
                context.fillRect(-2.2, -0.75, 3.1, 0.65);
                context.restore();
                continue;
            }
            if (particle.kind === 'fizz-droplet') {
                const visibleFraction = clamp(
                    particle.life / particle.maximumLife,
                    0,
                    1,
                );
                context.save();
                context.globalAlpha = Math.min(1, visibleFraction * 1.8);
                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
                context.fillStyle = 'rgba(255, 255, 255, 0.8)';
                context.beginPath();
                context.arc(
                    particle.x - particle.size * 0.28,
                    particle.y - particle.size * 0.3,
                    particle.size * 0.26,
                    0,
                    Math.PI * 2,
                );
                context.fill();
                context.restore();
                continue;
            }
            context.fillStyle = particle.color;
            context.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
        }
    }

    function drawHUD() {
        context.fillStyle = '#111329';
        context.fillRect(0, HUD_TOP, SCREEN_WIDTH, HUD_HEIGHT);
        context.fillStyle = '#30366d';
        context.fillRect(0, HUD_TOP, SCREEN_WIDTH, .7);
        drawBottomBGIndicator();
        context.save();
        context.font = 'bold 4.5px monospace';
        context.textBaseline = 'top';
        context.fillStyle = '#ffffff';
        context.fillText(`SCORE ${score}`, 5, HUD_TOP + 1.3);
        const stageText = `STAGE ${currentLevelIndex + 1}`;
        context.fillText(stageText, 91, HUD_TOP + 1.3);
        // Ét hjerte pr. liv. Om nødvendigt pakkes de tættere, uden at flytte tiden.
        const heartSpacing=Math.min(7,54/Math.max(1,lives));
        for(let i=0;i<lives;i++)drawPickup('heart',121+i*heartSpacing,HUD_TOP+3.5,Math.min(6,heartSpacing),false);
        // Kun tiden blinker. Mørkerød fase er stadig læsbar; aldrig usynlig tekst.
        const urgentTime = remainingTimeSeconds > 0 && remainingTimeSeconds <= 10;
        const timerPhase = Math.ceil(remainingTimeSeconds) - remainingTimeSeconds;
        context.fillStyle = urgentTime ? (timerPhase < .5 ? '#ff405e' : '#a93248') : '#ffffff';
        context.fillText(`TIME ${Math.ceil(remainingTimeSeconds)}`,
            180, HUD_TOP + 1.3);
        context.translate(PUMP_HUD_X, HUD_TOP);
        context.font = 'bold 7px monospace';

        // A og Z står lodret som de fysiske taster, men hver række opdages
        // først gennem gameplay. Under den første flyvetur er destinationen
        // tom; rækken dukker op, præcis når pickupen lander i HUD'en.
        const delayedCandyCount = hudPickupFlights.filter(
            (flight) => flight.type === 'candy' && flight.delaysHUDValue,
        ).length;
        const visibleCandyStock = Math.max(0, candyStock - delayedCandyCount);
        const showCandyHUD = candyHUDUnlocked
            && (delayedCandyCount === 0 || candyStock > delayedCandyCount);
        if (showCandyHUD) {
            context.save();
            context.translate(CANDY_HUD_X-PUMP_HUD_X,14);
            context.fillStyle = '#ffd85b';
            context.fillText('A', 108, 4);
            drawPickup('candy', 123, 8, 13, false);
            context.fillText(`x${visibleCandyStock}`, 132, 4);
            context.restore();
        }

        const pumpIsFlyingToHUD = hudPickupFlights.some(
            (flight) => flight.type === 'pump' || flight.type === 'autoPump',
        );
        const showPumpHUD = pumpHUDUnlocked && !pumpIsFlyingToHUD;
        if (showPumpHUD) {
            context.fillStyle = autoPumpActive ? '#ffcc58' : '#7cf5ff';
            context.fillText(autoPumpActive ? 'AUTO' : 'Z', autoPumpActive ? 91 : 108, 19);
            drawPickup(autoPumpActive ? 'autoPump' : 'pump', 123, 23, 13, false);
        }

        // Tre faste rammer er pumpens lager. En indflyvende pen tælles først
        // som synligt fyldt, når den har nået sin ramme i HUD'en.
        const delayedPumpPens = hudPickupFlights.filter(
            (flight) => flight.type === 'insulin' && flight.delaysHUDValue,
        ).length;
        const visiblePumpInsulin = Math.max(0, pumpInsulinStored - delayedPumpPens);
        if (showPumpHUD) {
            context.fillStyle = '#bafaff';
            context.font = 'bold 7px monospace';
            context.fillText(`${visiblePumpInsulin}/3`, 174, 19);
            for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
                const slotX = 134 + slotIndex * 12;
                context.fillStyle = slotIndex < visiblePumpInsulin ? '#103e42' : '#0a1833';
                context.fillRect(slotX, 17, 10, 12);
                context.strokeStyle = slotIndex < visiblePumpInsulin ? '#40f5dc' : '#45556b';
                context.lineWidth = 1;
                context.strokeRect(slotX + 0.5, 17.5, 9, 11);
                if (slotIndex < visiblePumpInsulin) {
                    drawPickup('insulin', slotX + 5, 23, 11.5, false);
                }
            }
        }

        context.restore();
    }

    function drawHUDPickupFlights() {
        for (const flight of hudPickupFlights) {
            const progress = clamp(
                flight.elapsedSeconds / flight.durationSeconds,
                0,
                1,
            );
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const x = flight.startX + (flight.targetX - flight.startX) * easedProgress;
            const directY = flight.startY
                + (flight.targetY - flight.startY) * easedProgress;
            const y = directY - Math.sin(progress * Math.PI) * 18;
            const pulse = 1 + Math.sin(progress * Math.PI) * 0.38;

            context.save();
            context.globalAlpha = 1 - Math.max(0, progress - 0.88) / 0.12;
            context.translate(x, y);
            context.rotate(progress * Math.PI * 2.4);
            context.scale(pulse, pulse);
            const pumpFlight = flight.type === 'pump' || flight.type === 'autoPump';
            drawPickup(flight.type, 0, 0, pumpFlight ? 17 : 14, true);
            context.restore();
        }
    }

    // Væskehøjden følger sand BG. COB/IOB er beholdninger; partikler er fluxer.
    function rememberHUDMeal(type) {
        hudMeals.push({type,time:elapsedRealSeconds});
        if(hudMeals.length>4)hudMeals.shift();
    }

    function getHUDMealFloatPose(age,index,cob) {
        // Større madfigurer bruger den faktiske roterede firkants udstrækning
        // i stedet for en stor sikkerhedscirkel. Det udnytter pladsen bedre,
        // men holder stadig hele figuren i væsken og inden for glassets sider.
        const depth=clamp(cob/40*14,.04,14);
        const bottom=21.2,top=Math.max(8,bottom-depth);
        const phase=age*.85+index*2.4;
        const rotation=Math.sin(phase*.9)*.23;
        const extentFactor=(Math.cos(rotation)+Math.abs(Math.sin(rotation)))/2;
        const size=Math.min(12,(bottom-top)*.93,(bottom-top)*.48/extentFactor);
        const radius=size*extentFactor;
        return {size,radius,x:18+Math.sin(phase)*(10-radius),
            y:(top+bottom)/2+Math.sin(phase*1.37+1)*Math.max(0,(bottom-top)/2-radius),
            rotation};
    }

    function drawHUDMeals(y) {
        // Rolig cirkulation i væsken; tiden står også stille under pause.
        context.save();context.beginPath();context.rect(6,y+8,24,13.3);context.clip();
        hudMeals.forEach((meal,index)=>{
            const age=elapsedRealSeconds-meal.time;
            if(age<0||age>20)return;
            const pose=getHUDMealFloatPose(age,index,Math.max(0,bgHUDSignals.cob||0));
            context.save();
            context.globalAlpha=clamp(age/.4,0,1)*clamp((20-age)/12,0,1);
            context.translate(pose.x,y+pose.y);context.rotate(pose.rotation);
            context.scale(pose.size/20,pose.size/20);
            if(meal.type==='candy'||meal.type==='sugarCane'){
                drawPickup(meal.type,0,0,20,false);
            }else{
                const image=characterImages[meal.type];
                if(image?.complete&&image.naturalWidth>0)context.drawImage(image,-10,-10,20,20);
            }
            context.restore();
        });
        context.restore();
    }

    function drawBottomBGIndicator() {
        const bg = getGameBG();
        const cob = Math.max(0, bgHUDSignals.cob || 0);
        const iob = Math.max(0, physiologyState?.displayIOB ?? physiologyState?.iob ?? 0);
        const y = HUD_TOP + 8;
        context.save();
        context.translate(BG_HUD_X, 0);
        const rendered = bgHUDRenderer?.draw(context, 0, y-7, {
            ...bgHUDSignals, bg, cob, iob, time: elapsedRealSeconds,
        });
        // Bevar målingen ved manglende WebGL eller tabt grafikkontekst.
        const color = bg < 4 ? '#ff4d71' : bg > 10 ? '#f7a839' : '#26c67d';
        if (!rendered) {
            context.strokeStyle = color;
            context.lineWidth = 1.8;
            context.strokeRect(45, y+2, 72, 20);
            const height = clamp((bg-2.8)/16.2, .02, 1)*17;
            context.fillStyle = '#ffc943';
            context.fillRect(46, y+22-height, 70, height);
        }
        if (!rendered && (bg < 4 || bg > 10)) {
            const pulse = .5+.5*Math.sin(elapsedRealSeconds*(bg<4?8:3.5));
            context.strokeStyle = color;
            context.globalAlpha = .3+.7*pulse;
            context.lineWidth = 1.8;
            context.strokeRect(45, y+2, 72, 20);
            context.globalAlpha = 1;
        }
        drawHUDMeals(y);
        context.textBaseline = 'top';
        context.font = 'bold 4px monospace';
        context.fillStyle = '#ffd85b';
        context.font = 'bold 3.5px monospace';
        context.textAlign = 'center';
        context.fillText(`COB ${cob.toFixed(0)}g`, 18, y+4, 22);
        context.fillStyle = '#7cf5ff';
        context.fillText(`IOB ${iob.toFixed(1)}U`, 140, y+4, 24);
        context.textAlign = 'left';
        context.fillStyle = '#d2dbea';
        context.fillText('HIGH', 49, y+4);
        context.fillText('LOW', 49, y+17);
        context.font = 'bold 6.5px monospace';
        context.textAlign = 'center';
        context.fillStyle = color;
        if(bg<4){
            const pulse=.5+.5*Math.sin(elapsedRealSeconds*8);
            context.fillStyle=`rgb(${Math.round(190+65*pulse)}, ${Math.round(25+45*pulse)}, ${Math.round(45+45*pulse)})`;
            context.shadowColor='#ff264c';context.shadowBlur=3+7*pulse;
        }
        // Mørk kontur bevarer læsbarheden også hen over den gule væske.
        context.strokeStyle = '#111527';context.lineWidth = .9;
        const label=`BG ${bg.toFixed(1)} ${getTrendArrow()}`;
        context.strokeText(label,81,y+8);
        context.fillText(label,81,y+8);
        context.restore();
    }

    function getTrendArrow() {
        if (bgSamples.length < 4) return '→';
        const newest = bgSamples[bgSamples.length - 1].value;
        const oldest = bgSamples[0].value;
        const change = newest - oldest;
        if (change > 0.18) return '↑';
        if (change < -0.18) return '↓';
        return '→';
    }

    function drawMessage() {
        drawKeyboardSketch();
        const hintText = gameState === 'playing' && activeHint ? activeHint.text : '';
        if (gameHint.textContent !== hintText) gameHint.textContent = hintText;
        gameHint.hidden = !hintText;
        hintPanel.hidden = !hintText;
        if (hintText) {
            hintTimer.max = activeHint.duration;
            hintTimer.value = Math.max(0, activeHint.remaining);
            hintTimerLabel.textContent = activeHint.remaining > HINT_RESUME_SECONDS
                ? `RESUMING IN ${Math.ceil(activeHint.remaining - HINT_RESUME_SECONDS)}s`
                : 'RETURNING TO FULL SPEED';
        }
        if (gameState !== 'playing') return;
        context.save();
        if (messageTime > 0) {
            // Pickups og handlinger er diskrete arkadetekster uden bagplade.
            // De står ved hændelsesstedet og toner ud over deres korte levetid.
            const fadeProgress = messageDuration > 0
                ? clamp(messageTime / messageDuration, 0, 1)
                : 0;
            context.globalAlpha = fadeProgress;
            context.font = 'bold 6px monospace';
            context.textAlign = 'center';
            context.textBaseline = 'bottom';
            context.lineWidth = 2;
            context.strokeStyle = 'rgba(13, 9, 37, 0.72)';
            context.fillStyle = '#fff3a3';
            const x = Math.round(clamp(messageAnchorX, 34, SCREEN_WIDTH - 34));
            const y = Math.round(clamp(messageAnchorY, 10, HUD_TOP - 8));
            context.strokeText(message, x, y, SCREEN_WIDTH - 50);
            context.fillText(message, x, y, SCREEN_WIDTH - 50);
        }
        context.restore();
    }

    function rectanglesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function frame(currentTime) {
        const elapsedSeconds = Math.min(0.05, (currentTime - previousFrameTime) / 1000);
        previousFrameTime = currentTime;
        accumulatedTime += elapsedSeconds;

        while (accumulatedTime >= FIXED_STEP_SECONDS) {
            update(FIXED_STEP_SECONDS);
            accumulatedTime -= FIXED_STEP_SECONDS;
        }

        render();
        window.requestAnimationFrame(frame);
    }

    // Et lille debug-interface gør browsertesten reproducerbar uden at ændre
    // den spiller-vendte oplevelse.
    function debugPlaceNearItem(itemType) {
        const targetItem = items.find(
            (item) => !item.collected && item.type === itemType,
        );
        if (!targetItem) return false;
        player.x = Math.max(PLAYER_START_X, targetItem.x - 24);
        player.y = getCurrentLevel().groundY - PLAYER_HEIGHT;
        player.previousY = player.y;
        player.vx = 0;
        player.vy = 0;
        player.onGround = true;
        cameraX = clamp(player.x - 55, 0, getCurrentLevel().width - SCREEN_WIDTH);
        resetPlayerTail();
        return true;
    }

    window.glucoseRunner = {
        start: startGame,
        restart: startGame,
        startLevel,
        useCandy,
        usePumpInsulin,
        // Kun til reproducerbare browsertests af fjender sent på banen.
        debugPlaceNearEnemy: (enemyType) => {
            const targetEnemy = enemies.find(
                (enemy) => enemy.alive && enemy.type === enemyType,
            );
            if (!targetEnemy) return false;
            player.x = Math.max(PLAYER_START_X, targetEnemy.x - 150);
            player.y = getCurrentLevel().groundY - PLAYER_HEIGHT;
            player.previousY = player.y;
            player.vx = 0;
            player.vy = 0;
            player.onGround = true;
            cameraX = clamp(player.x - 55, 0, getCurrentLevel().width - SCREEN_WIDTH);
            resetPlayerTail();
            return true;
        },
        // Kun til reproducerbare browsertests af udstyr og andre pickups.
        debugPlaceNearItem,
        getSnapshot: () => ({
            playerRenderer: dexRenderer && dexRenderer.available ? '3d' : 'sprite',
            player3DFrames: dexRenderer ? dexRenderer.renderCount : 0,
            gameState,
            stage: currentLevelIndex + 1,
            x: player.x,
            y: player.y,
            score,
            collectedDiamondCount,
            lives,
            candyStock,
            pumpActive,
            autoPumpActive,
            autoPumpCooldownSeconds,
            pumpInsulinStored,
            remainingInsulin: items.filter((item) => item.type === 'insulin' && !item.collected).length,
            remainingCandy: items.filter((item) => item.type === 'candy' && !item.collected).length,
            remainingDiamonds: diamonds.filter((diamond) => !diamond.collected).length,
            remainingEnemies: enemies.filter((enemy) => enemy.alive).length,
            bittenEnemies: enemies.filter((enemy) => enemy.biteAnimationTime > 0).length,
            cheeseProjectileCount: cheeseProjectiles.length,
            pizzaState: enemies
                .filter((enemy) => enemy.type === 'pizza' && enemy.alive)
                .map((enemy) => ({
                    x: enemy.x,
                    direction: enemy.direction,
                    windup: enemy.cheeseWindupTime,
                    cooldown: enemy.cheeseThrowTimer,
                })),
            playerAnimationFrame: getPlayerAnimationPose().name,
            eatAnimationTime: player.eatAnimationTime,
            bg: physiologyState ? getGameBG() : null,
            highBGFatigue: physiologyState ? getHighBGFatigue() : 0,
            trueBG: physiologyState ? physiologyState.trueBG : null,
            iob: physiologyState ? (physiologyState.displayIOB ?? physiologyState.iob) : null,
            cob: physiologyState ? physiologyState.cob : null,
            musicEnabled: audio.musicEnabled,
            soundEffectsEnabled: audio.effectsEnabled,
            audioContextState: audio.context ? audio.context.state : 'not-created',
            remainingTimeSeconds,
            cameraX,
        }),
    };

    setMusicEnabled(readAudioPreference(MUSIC_STORAGE_KEY), false);
    setSoundEnabled(readAudioPreference(SOUND_STORAGE_KEY), false);
    setTutorialEnabled(readAudioPreference(TUTORIAL_STORAGE_KEY), false);
    resetRun();
    showAttractTitle();
    window.requestAnimationFrame(frame);
}());
