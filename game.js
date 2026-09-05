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
    const overlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlaySubtitle = document.getElementById('overlaySubtitle');
    const overlayPrompt = document.getElementById('overlayPrompt');
    const liveStatus = document.getElementById('liveStatus');
    const musicToggle = document.getElementById('musicToggle');
    const soundToggle = document.getElementById('soundToggle');

    const SCREEN_WIDTH = 320;
    const SCREEN_HEIGHT = 200;
    const RENDER_SCALE = 4;
    const HUD_HEIGHT = 32;
    const FIXED_STEP_SECONDS = 1 / 60;
    const SIMULATION_MINUTES_PER_REAL_SECOND = 4;
    const LEVEL_TIME_SECONDS = 120;
    const POINTS_PER_REMAINING_SECOND = 50;
    const POINTS_PER_DIAMOND = 100;
    const BONUS_TALLY_SECONDS_PER_ROW = 0.95;
    const BONUS_TALLY_TICKS_PER_ROW = 14;
    const TIR_MIN_MMOL_L = 3.9;
    const TIR_MAX_MMOL_L = 10;
    // Høj BG giver ikke længere Game Over. Over målområdet bliver monsteret
    // i stedet gradvist døsigere. Effekten glider ind mellem 10 og 18 mmol/L
    // og forbliver på maksimum over 18, så styringen aldrig bliver helt låst.
    const HIGH_BG_FATIGUE_START_MMOL_L = 10;
    const HIGH_BG_FATIGUE_FULL_MMOL_L = 18;
    const HIGH_BG_MIN_SPEED_FACTOR = 0.50;
    const HIGH_BG_MIN_ACCELERATION_FACTOR = 0.42;
    const HIGH_BG_MIN_JUMP_FACTOR = 0.68;
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
    const ENEMY_BOUNCE_SPEED = -255;
    const MAX_RUN_SPEED = 88;
    const RUN_ACCELERATION = 560;
    const GROUND_FRICTION = 720;
    const EAT_ANIMATION_SECONDS = 0.92;
    const EATING_SPEED_FACTOR = 0.18;
    const ENEMY_BITE_FRAME_SECONDS = 0.55;
    // Flere, kortere led giver en glattere bøjning uden at gøre halen længere.
    // Den svagere retningsfjeder lader spidsen fortsætte bevægelsen efter sving.
    const TAIL_SEGMENT_COUNT = 9;
    const TAIL_SEGMENT_LENGTH = 1.85;
    const TAIL_MOTION_DAMPING = 0.80;
    const TAIL_DIRECTIONAL_STIFFNESS = 0.032;
    const FIZZ_SHAKE_SECONDS = 2;
    const FIZZ_FIRST_DELAY_SECONDS = 2.8;
    const FIZZ_MIN_COOLDOWN_SECONDS = 4;
    const FIZZ_COOLDOWN_VARIATION_SECONDS = 3;
    const FIZZ_SHAKE_BOUNCE_SPEED = -310;
    // Auto-pumpen arbejder med de samme diskrete 1 E-doser som den manuelle
    // pumpe. En pause mellem doserne gør automatikken aflæselig og forhindrer,
    // at alle tre lagerpladser tømmes i samme frame over tærsklen.
    const AUTO_PUMP_TRIGGER_BG_MMOL_L = 7;
    const AUTO_PUMP_DOSE_COOLDOWN_SECONDS = 5;
    const PIZZA_THROW_WINDUP_SECONDS = 0.7;
    const PIZZA_THROW_MIN_COOLDOWN_SECONDS = 3.6;
    const PIZZA_THROW_COOLDOWN_VARIATION_SECONDS = 1.8;
    const PIZZA_THROW_RANGE = 240;
    const CHEESE_PROJECTILE_GRAVITY = 180;

    // FOOD_MONSTER_PROFILES er den fælles ernæringskilde for alle madmonstre.
    // Hver profil beskriver en dokumenteret referenceportion fra simulatorens
    // madkatalog. Banerne angiver fortsat kun monsterets kulhydratportion; den
    // samlede vægt samt protein, fedt og spisetid skaleres automatisk. Når en ny
    // madvare tilføjes, skal hele dens makroprofil derfor defineres her i stedet
    // for blot at sende kulhydrat til fysiologimotoren.
    const FOOD_MONSTER_PROFILES = {
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
            name: 'PIZZA MONSTER',
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

    // Spillet beholder sine enkle 320 x 200-logiske koordinater, men tegnes på
    // et 4 gange større backing-canvas. Det giver skarpe billeder og tekst uden
    // at ændre banens fysik eller alle dens koordinater.
    canvas.width = SCREEN_WIDTH * RENDER_SCALE;
    canvas.height = SCREEN_HEIGHT * RENDER_SCALE;
    context.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    context.imageSmoothingEnabled = true;

    const backgroundImage = new Image();
    backgroundImage.src = 'assets/retro-landscape.png';

    // Parallaxdetaljerne er separate PNG-lag med ægte alfakanal. Kun bjerge,
    // træer og planter er synlige; resten af hvert billede er transparent.
    const parallaxImages = {
        far: new Image(),
        nearBackground: new Image(),
    };
    parallaxImages.far.src = 'assets/parallax-far.png';
    parallaxImages.nearBackground.src = 'assets/parallax-front.png';

    // Store kildebilleder i høj opløsning, og skalér dem glat ned til spillets
    // lille canvas. Derved bevarer insulinpen og bolsje hver sin klare silhuet.
    const pickupImages = {
        insulin: new Image(),
        candy: new Image(),
        pump: new Image(),
        autoPump: new Image(),
    };
    pickupImages.insulin.src = 'assets/insulin-pen.png';
    pickupImages.candy.src = 'assets/candy-unwrapped-red-white.png';
    pickupImages.pump.src = 'assets/insulin-pump.png';
    pickupImages.autoPump.src = 'assets/insulin-pump-auto.png?v=backpack-1';

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
    characterImages.cgmOverlay.src = 'assets/player-cgm-overlay.png?v=1';
    characterImages.drowsyMouthOverlay.src =
        'assets/player-drowsy-mouth-overlay.png?v=1';
    characterImages.cake.src = 'assets/cake-monster.png';
    characterImages.soda.src = 'assets/soda-monster.png';
    characterImages.pizza.src = 'assets/pizza-monster.png?v=2';

    const audio = new GlucoseRunnerAudio();
    const levels = [GLUCOSE_RUNNER_LEVEL_01, GLUCOSE_RUNNER_LEVEL_02];
    const keys = { left: false, right: false };
    const MUSIC_STORAGE_KEY = 'dextro-dash-2000-music';
    const SOUND_STORAGE_KEY = 'dextro-dash-2000-effects';

    let gameState = 'title';
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
    let tirObservedSeconds = 0;
    let tirInRangeSeconds = 0;
    let physiologyEngine = null;
    let physiologyState = null;
    let elapsedRealSeconds = 0;
    let lastBGSampleTime = 0;
    let bgSamples = [];
    let message = '';
    let messageTime = 0;
    let deathTime = 0;
    let deathReason = '';
    let items = [];
    let diamonds = [];
    let enemies = [];
    let cheeseProjectiles = [];
    let particles = [];
    let tailSegments = [];
    let hudPickupFlights = [];
    let stageClearTally = null;

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

        const profile = {
            weight: 70,
            isf: 3,
            icr: 10,
        };

        const engine = T1DPhysiologyEngine.createEngine(profile, {
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
        return engine;
    }

    function copyLevelObjects() {
        const level = getCurrentLevel();
        items = level.items.map((item) => ({ ...item, collected: false }));
        diamonds = level.diamonds.map(([x, y]) => ({ x, y, collected: false }));
        enemies = level.enemies.map((enemy, index) => ({
            ...enemy,
            y: enemy.y - 8,
            width: 22,
            height: 22,
            direction: index % 2 === 0 ? 1 : -1,
            alive: true,
            biteAnimationTime: 0,
            biteSide: -1,
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
            cheeseThrowCycleIndex: 0,
        }));
    }

    function resetRun(options = {}) {
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
        remainingTimeSeconds = LEVEL_TIME_SECONDS;
        tirObservedSeconds = 0;
        tirInRangeSeconds = 0;
        cameraX = 0;
        elapsedRealSeconds = 0;
        lastBGSampleTime = 0;
        bgSamples = [];
        message = '';
        messageTime = 0;
        particles = [];
        cheeseProjectiles = [];
        hudPickupFlights = [];
        stageClearTally = null;
        physiologyEngine = createPhysiologyEngine();
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
            facing: 1,
            invulnerableTime: 1.2,
            animationTime: 0,
            runAnimationDistance: 0,
            eatAnimationTime: 0,
            eatAnticipation: 0,
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
        const verticalAcceleration = bg < TIR_MIN_MMOL_L
            ? 95
            : bg > TIR_MAX_MMOL_L ? -72 : 18;

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
            const bgCurve = bg < TIR_MIN_MMOL_L
                ? index * 0.34
                : bg > TIR_MAX_MMOL_L ? -index * 0.30 : index * 0.05;
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
        audio.start();
        currentLevelIndex = clamp(levelIndex, 0, levels.length - 1);
        resetRun();
        gameState = 'playing';
        hideOverlay();
        canvas.focus();
        announce(`Stage ${currentLevelIndex + 1} started`);
    }

    function startNextLevel() {
        currentLevelIndex += 1;
        collectedDiamondCount = 0;
        resetRun({ keepScore: true, keepLives: true, keepDiscoveries: true });
        gameState = 'playing';
        hideOverlay();
        canvas.focus();
        announce(`Stage ${currentLevelIndex + 1} started`);
    }

    function showOverlay(title, subtitle, prompt) {
        overlayTitle.textContent = title;
        overlaySubtitle.textContent = subtitle;
        overlaySubtitle.classList.remove('stage-tally');
        overlayPrompt.textContent = prompt;
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
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

        if (enabled && gameState !== 'title') audio.start();

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
        if (enabled && gameState !== 'title') audio.start();

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
        const jumpFactor = 1
            - highBGFatigue * (1 - HIGH_BG_MIN_JUMP_FACTOR);
        player.vy = JUMP_SPEED * jumpFactor;
        player.onGround = false;
        audio.jump();
    }

    function useCandy() {
        if (gameState !== 'playing' || candyStock <= 0) {
            if (gameState === 'playing') setMessage('NO CANDY', 0.7);
            return false;
        }
        candyStock -= 1;
        physiologyEngine.addFood({
            carbs: 10,
            weight: 10,
            eatTimeMin: 0.5,
            carbParams: {
                simpleFraction: 1,
                fiberPerGram: 0,
                retentionFactor: 1,
            },
        });
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
        physiologyEngine.addRapidInsulin({ units: 1 });
        setMessage('PUMP 1 U', 0.8);
        spawnParticles(player.x + PLAYER_WIDTH / 2, player.y + 8, '#70f4ff', 8);
        audio.insulin();
        return true;
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

        pumpInsulinStored -= 1;
        autoPumpCooldownSeconds = AUTO_PUMP_DOSE_COOLDOWN_SECONDS;
        physiologyEngine.addRapidInsulin({ units: 1 });
        setMessage('AUTO PUMP 1 U', 0.9);
        spawnParticles(player.x + 3, player.y + 9, '#ffbd45', 10);
        audio.insulin();
    }

    function setMessage(text, duration) {
        message = text;
        messageTime = duration;
    }

    function loseLife(reason, ignoreInvulnerability = false) {
        if (gameState !== 'playing') return;
        if (player.invulnerableTime > 0 && !ignoreInvulnerability) return;
        lives -= 1;
        gameState = 'dying';
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
        const hasNextLevel = currentLevelIndex < levels.length - 1;
        const timeBonus = Math.floor(remainingTimeSeconds) * POINTS_PER_REMAINING_SECOND;
        const tirFraction = getTIRFraction();
        const tirPercent = Math.round(tirFraction * 100);
        const tirBonus = Math.round(timeBonus * tirFraction);
        const diamondBonus = collectedDiamondCount * POINTS_PER_DIAMOND;

        // Bonusserne gemmes som tre regnskabslinjer og føres først ind i den
        // faktiske score, mens optællingen kører. Derfor tikker både HUD'en,
        // hver enkelt linje og TOTAL frem med præcis de samme heltal.
        stageClearTally = {
            hasNextLevel,
            scoreBefore: score,
            finalScore: score + timeBonus + tirBonus + diamondBonus,
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
                    label: `TIR ${tirPercent}%`,
                    value: tirBonus,
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
            hasNextLevel
                ? `STAGE ${currentLevelIndex + 1} CLEAR!`
                : `LEVEL ${currentLevelIndex + 1} COMPLETED`,
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

    function getTIRFraction() {
        if (tirObservedSeconds <= 0) return 1;
        return clamp(tirInRangeSeconds / tirObservedSeconds, 0, 1);
    }

    // Arkadespillet bruger altid modellens sande blodglukose. CGM-signalet
    // findes fortsat internt i fysiologimotoren, men dets forsinkelse og
    // eventuelle sensorstøj må ikke påvirke HUD, trendpil, TIR eller point.
    function getGameBG() {
        return physiologyState && Number.isFinite(physiologyState.trueBG)
            ? physiologyState.trueBG
            : 9;
    }

    // Smoothstep-kurven gør overgangen mærkbar uden et pludseligt temposkift,
    // når BG netop passerer toppen af målområdet. Resultatet er altid 0-1.
    function getHighBGFatigue() {
        const linearFatigue = clamp(
            (getGameBG() - HIGH_BG_FATIGUE_START_MMOL_L)
                / (HIGH_BG_FATIGUE_FULL_MMOL_L - HIGH_BG_FATIGUE_START_MMOL_L),
            0,
            1,
        );
        return linearFatigue * linearFatigue * (3 - 2 * linearFatigue);
    }

    function handleKeyDown(event) {
        const key = event.key.toLowerCase();
        const selectedLevelIndex = Number.parseInt(key, 10) - 1;
        const isLevelShortcut = Number.isInteger(selectedLevelIndex)
            && selectedLevelIndex >= 0
            && selectedLevelIndex < levels.length;
        if (['arrowleft', 'arrowright', 'arrowup', 'a', 'z', ' '].includes(key)
            || isLevelShortcut) {
            event.preventDefault();
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
            || key === 'arrowleft'
            || key === 'arrowright'
            || key === 'arrowup';
        if (canStartOrRestart && isStartKey) {
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
        if (key === 'arrowleft') keys.left = false;
        if (key === 'arrowright') keys.right = false;
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => {
        keys.left = false;
        keys.right = false;
    });
    canvas.addEventListener('pointerdown', () => {
        canvas.focus();
        if (gameState === 'title') startGame();
    });
    musicToggle.addEventListener('click', () => {
        toggleMusic();
        canvas.focus();
    });
    soundToggle.addEventListener('click', () => {
        toggleSound();
        canvas.focus();
    });

    function update(deltaSeconds) {
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

        elapsedRealSeconds += deltaSeconds;
        remainingTimeSeconds = Math.max(0, remainingTimeSeconds - deltaSeconds);
        if (remainingTimeSeconds <= 0) {
            loseLife('TIME UP');
            return;
        }
        player.animationTime += deltaSeconds;
        player.eatAnimationTime = Math.max(0, player.eatAnimationTime - deltaSeconds);
        player.invulnerableTime = Math.max(0, player.invulnerableTime - deltaSeconds);
        messageTime = Math.max(0, messageTime - deltaSeconds);

        updatePlayer(deltaSeconds);
        updatePlayerTail(deltaSeconds);
        updateEnemies(deltaSeconds);
        updateCheeseProjectiles(deltaSeconds);
        collectObjects();
        updateParticles(deltaSeconds);
        updateHUDPickupFlights(deltaSeconds);
        updatePhysiology(deltaSeconds);
        updateAutoPump(deltaSeconds);
        updateCamera();

        if (player.y > SCREEN_HEIGHT - HUD_HEIGHT - 8) {
            loseLife('FELL INTO A PIT', true);
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
            * fatigueSpeedFactor;
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

        player.x += player.vx * deltaSeconds;
        // Kameraets venstre kant må ikke fungere som en usynlig mur. Figuren
        // kan gå tilbage gennem hele den allerede besøgte bane, men aldrig
        // længere til venstre end sit oprindelige startpunkt.
        if (player.x <= PLAYER_START_X) {
            player.x = PLAYER_START_X;
            if (player.vx < 0) player.vx = 0;
        }
        player.x = Math.min(getCurrentLevel().width - PLAYER_WIDTH, player.x);

        player.vy += GRAVITY * deltaSeconds;
        player.y += player.vy * deltaSeconds;
        player.onGround = false;
        resolvePlatformCollisions();
        if (player.onGround && Math.abs(player.vx) > 1) {
            // Løbecyklussen følger den faktisk tilbagelagte afstand. Dermed
            // passer fodarbejdet til banens bevægelse ved alle hastigheder.
            player.runAnimationDistance += Math.abs(player.vx) * deltaSeconds;
        }
    }

    function resolvePlatformCollisions() {
        const previousBottom = player.previousY + PLAYER_HEIGHT;
        const currentBottom = player.y + PLAYER_HEIGHT;

        for (const platform of getCurrentLevel().platforms) {
            const horizontalOverlap = player.x + PLAYER_WIDTH > platform.x + 1
                && player.x < platform.x + platform.width - 1;
            const crossedTop = previousBottom <= platform.y + 2 && currentBottom >= platform.y;
            if (horizontalOverlap && crossedTop && player.vy >= 0) {
                player.y = platform.y - PLAYER_HEIGHT;
                player.vy = 0;
                player.onGround = true;
                return;
            }
        }
    }

    function updateEnemies(deltaSeconds) {
        // Nærhedsgraden beregnes på ny hver frame. Den bruges kun til at åbne
        // munden før kontakt; kulhydrat tilføjes fortsat først ved kollision.
        player.eatAnticipation = 0;
        for (const [enemyIndex, enemy] of enemies.entries()) {
            if (enemy.biteAnimationTime > 0) {
                enemy.biteAnimationTime = Math.max(0, enemy.biteAnimationTime - deltaSeconds);
                continue;
            }
            if (!enemy.alive) continue;

            updateFizzState(enemy, enemyIndex, deltaSeconds);
            updatePizzaThrowState(enemy, enemyIndex, deltaSeconds);

            // En rystende Fizzler og et Pizza Monster i kasteoptræk står stille.
            // Spilleren kan derfor aflæse begge angreb før kontaktøjeblikket.
            const enemySpeedFactor = enemy.fizzState === 'shaking'
                || enemy.cheeseWindupTime > 0
                ? 0
                : 1;
            enemy.x += enemy.speed * enemy.direction * enemySpeedFactor * deltaSeconds;
            if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
                enemy.direction *= -1;
                enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.width);
            }

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

            const previousBottom = player.previousY + PLAYER_HEIGHT;
            if (player.vy > 0 && previousBottom <= enemy.y + 7) {
                // Et præcist tramp fungerer som et super-hop. Figuren placeres
                // oven på fjenden før afsættet, så den ikke starter inde i den.
                player.y = enemy.y - PLAYER_HEIGHT;
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
                    spawnParticles(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        '#ff7a3d',
                        28,
                    );
                    loseLife('FIZZLER EXPLODED', true);
                    continue;
                }
                eatEnemy(enemy);
            }
        }
    }

    function updateFizzState(enemy, enemyIndex, deltaSeconds) {
        if (enemy.type !== 'soda') return;

        enemy.fizzTimer = Math.max(0, enemy.fizzTimer - deltaSeconds);
        if (enemy.fizzTimer > 0) return;

        if (enemy.fizzState === 'normal') {
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

        // Monsteret vender sig mod spilleren, stopper og viser osteklumpen i
        // 0,7 sekunder. Retningen låses under optrækket, så kastet kan forudses.
        enemy.direction = playerCenterX >= enemyCenterX ? 1 : -1;
        enemy.cheeseWindupTime = PIZZA_THROW_WINDUP_SECONDS;
    }

    function launchCheeseProjectile(enemy) {
        const startX = enemy.x + enemy.width / 2 + enemy.direction * 11;
        const startY = enemy.y + 8;
        const targetX = player.x + PLAYER_WIDTH / 2;
        const targetY = player.y + PLAYER_HEIGHT / 2;
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
        enemy.biteSide = player.x < enemy.x ? -1 : 1;
        // Figuren vender altid den store mund mod måltidet, også hvis
        // sidekollisionen sker lige efter et retningsskift.
        player.facing = enemy.x + enemy.width / 2 >= player.x + PLAYER_WIDTH / 2
            ? 1 : -1;
        // Nærhedsanimationen har allerede vist optrækket. Ved kontakt starter
        // sekvensen derfor direkte på den store åbne mund (frame 3 af 8).
        player.eatAnimationTime = EAT_ANIMATION_SECONDS * 0.74;
        player.eatAnticipation = 0;
        player.vx *= 0.34;

        const monsterProfile = FOOD_MONSTER_PROFILES[enemy.type];
        const referenceNutrition = monsterProfile.referenceNutrition;
        const portionCarbs = enemy.carbs ?? referenceNutrition.carbs;
        const portionScale = portionCarbs / referenceNutrition.carbs;
        physiologyEngine.addFood({
            carbs: portionCarbs,
            protein: referenceNutrition.protein * portionScale,
            fat: referenceNutrition.fat * portionScale,
            weight: referenceNutrition.weight * portionScale,
            eatTimeMin: referenceNutrition.eatTimeMin * portionScale,
            carbParams: monsterProfile.carbParams,
        });

        setMessage(
            `${monsterProfile.name} +${portionCarbs}g CARBS`,
            1,
        );
        spawnParticles(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.type === 'soda' ? '#68efff' : '#ffbf62',
            10,
        );
        audio.eat();
    }

    function collectObjects() {
        for (const item of items) {
            if (item.collected || !rectanglesOverlap(player.x, player.y, PLAYER_WIDTH,
                PLAYER_HEIGHT, item.x - 11, item.y - 11, 22, 22)) continue;

            if (item.type === 'insulin' && pumpActive && pumpInsulinStored >= 3) {
                setMessage('PUMP FULL', 0.55);
                continue;
            }

            item.collected = true;
            score += 100;
            if (item.type === 'autoPump') {
                startHUDPickupFlight('autoPump', item.x, item.y, 123, 23);
                pumpActive = true;
                autoPumpActive = true;
                autoPumpCooldownSeconds = 0;
                pumpHUDUnlocked = true;
                // Auto-pumpen er en opgradering. Eventuelle doser i den
                // manuelle pumpe flyttes med over i rygsækkens tre pladser.
                if (!autoPumpHintShown) {
                    setMessage('HINT: AUTO PUMP USES 1 U ABOVE BG 7', 3.2);
                    autoPumpHintShown = true;
                } else {
                    setMessage('AUTO PUMP READY', 0.9);
                }
                spawnParticles(item.x, item.y, '#ffbd45', 14);
                audio.pickup();
            } else if (item.type === 'pump') {
                startHUDPickupFlight('pump', item.x, item.y, 123, 23);
                pumpActive = true;
                autoPumpActive = false;
                pumpHUDUnlocked = true;
                pumpInsulinStored = 0;
                if (!pumpHintShown) {
                    setMessage('HINT: PRESS Z TO USE INSULIN FROM THE PUMP', 3.2);
                    pumpHintShown = true;
                } else {
                    setMessage('PUMP READY', 0.8);
                }
                spawnParticles(item.x, item.y, '#70f4ff', 12);
                audio.pickup();
            } else if (item.type === 'insulin' && pumpActive) {
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
                setMessage(`PUMP ${pumpInsulinStored}/3`, 0.7);
                spawnParticles(item.x, item.y, '#79efff');
                audio.pickup();
            } else if (item.type === 'insulin') {
                // Uden pumpen gives dosis straks. Flyveturen ender derfor ved
                // IOB-tallet i stedet for i en lagerplads.
                startHUDPickupFlight('insulin', item.x, item.y, 299, 48);
                physiologyEngine.addRapidInsulin({ units: 1 });
                setMessage('1 U INSULIN', 0.8);
                spawnParticles(item.x, item.y, '#79efff');
                audio.insulin();
            } else {
                startHUDPickupFlight('candy', item.x, item.y, 123, 8, true);
                candyStock += 1;
                candyHUDUnlocked = true;
                if (!candyHintShown) {
                    setMessage('HINT: PRESS A TO USE CANDY AND RAISE BLOOD SUGAR', 3.2);
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
            audio.pickup();
        }
    }

    function updatePhysiology(deltaSeconds) {
        physiologyEngine.step(deltaSeconds * SIMULATION_MINUTES_PER_REAL_SECOND);
        physiologyState = physiologyEngine.getState();

        // TIR, HUD og trendpil deler den samme sande BG-værdi. Der er derfor
        // hverken CGM-forsinkelse eller sensorstøj i arkadespillets feedback.
        const gameBG = getGameBG();
        tirObservedSeconds += deltaSeconds;
        if (gameBG >= TIR_MIN_MMOL_L && gameBG <= TIR_MAX_MMOL_L) {
            tirInRangeSeconds += deltaSeconds;
        }

        if (elapsedRealSeconds - lastBGSampleTime >= 0.5) {
            lastBGSampleTime = elapsedRealSeconds;
            bgSamples.push({ time: elapsedRealSeconds, value: gameBG });
            while (bgSamples.length > 8) bgSamples.shift();
        }

        if (physiologyState.trueBG < 2.8) loseLife('LOW BLOOD SUGAR');
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

    function spawnScoreParticle(x, y, points) {
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
            text: `+${points}`,
        });
    }

    function updateParticles(deltaSeconds) {
        for (const particle of particles) {
            particle.x += particle.vx * deltaSeconds;
            particle.y += particle.vy * deltaSeconds;
            particle.vy += (particle.gravity ?? 70) * deltaSeconds;
            particle.life -= deltaSeconds;
        }
        particles = particles.filter((particle) => particle.life > 0);
    }

    function startHUDPickupFlight(type, worldX, worldY, targetX, targetY, delaysHUDValue = false) {
        hudPickupFlights.push({
            type,
            startX: worldX - cameraX,
            startY: worldY + HUD_HEIGHT,
            targetX,
            targetY,
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
        drawBackground();
        context.save();
        // Kameraet må beholde sine decimaler. Canvas skaleres 4 gange, så en
        // afrunding her gav synlige spring på 4 fysiske pixels i alle lag.
        context.translate(-cameraX, HUD_HEIGHT);
        drawLevel();
        drawFinish();
        drawDiamonds();
        drawItems();
        drawEnemies();
        drawCheeseProjectiles();
        drawPlayer();
        drawEatenEnemyInMouth();
        drawParticles();
        context.restore();
        drawVerticalBGIndicator();
        drawHUD();
        drawHUDPickupFlights();
        drawMessage();
    }

    function drawBackground() {
        context.fillStyle = '#26245e';
        context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        // Grundmotivet udgør en sammenhængende himmel og horisont. De øvrige
        // billeder har transparent baggrund; de nære lag jordforankres derfor
        // særskilt nedenfor, mens himlen fortsat kan ses mellem motiverne.
        drawRepeatingParallaxImage(backgroundImage, 0.02, 1,
            'grayscale(32%) saturate(68%) contrast(91%) brightness(102%)');

        // Fjerne detaljer er lysere, gråere og langsommere end junglen foran.
        drawRepeatingParallaxImage(parallaxImages.far, 0.06, 0.72,
            'grayscale(45%) saturate(55%) brightness(106%)');

        // PNG'ens motiv fylder kun den midterste del af billedet. Derfor tegnes
        // det via en særlig jordforankret funktion; ellers følger den store,
        // gennemsigtige bund med og får bakkerne til at ligne svævende øer.
        drawGroundedMiddleParallax();
    }

    function drawGroundedMiddleParallax() {
        const image = parallaxImages.nearBackground;
        if (!image.complete || image.naturalWidth <= 0) return;

        // Det tidligere mellemlag bestod af fritstående bakkeøer med en stor
        // gennemsigtig flade under sig. I stedet bruges det nederste,
        // sammenhængende plantebælte fra nærbilledet, men bag spilleren.
        const sourceY = Math.round(image.naturalHeight * 0.55);
        const sourceHeight = image.naturalHeight - sourceY;
        const detailHeight = 40;
        const detailWidth = Math.ceil(
            detailHeight * image.naturalWidth / sourceHeight,
        );
        const parallaxOffset = ((cameraX * 0.22) % detailWidth + detailWidth)
            % detailWidth;
        const groundScreenY = HUD_HEIGHT + getCurrentLevel().groundY;
        const detailY = groundScreenY - detailHeight + 2;

        context.save();
        context.beginPath();
        context.rect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
        context.clip();

        // En bred, rolig vegetationsfod begynder før billedets laveste blade.
        // Motivet overlapper den derfor tydeligt og kan ikke svæve. Hele laget
        // ligger bag bane, pickups, fjender og spiller.
        context.globalAlpha = 0.54;
        context.fillStyle = '#205e5d';
        context.fillRect(
            0,
            groundScreenY - 13,
            SCREEN_WIDTH,
            SCREEN_HEIGHT - groundScreenY + 13,
        );
        context.fillStyle = '#3f8d74';
        context.fillRect(0, groundScreenY - 14, SCREEN_WIDTH, 3);

        context.globalAlpha = 0.68;
        context.filter = 'grayscale(22%) saturate(72%) contrast(94%) brightness(96%)';
        const lastVisibleCopy = Math.ceil(SCREEN_WIDTH / detailWidth) + 1;
        for (let copyIndex = -1; copyIndex <= lastVisibleCopy; copyIndex += 1) {
            context.drawImage(
                image,
                0,
                sourceY,
                image.naturalWidth,
                sourceHeight,
                copyIndex * detailWidth - parallaxOffset,
                detailY,
                detailWidth,
                detailHeight,
            );
        }
        context.restore();
    }

    function drawRepeatingParallaxImage(
        image,
        parallaxSpeed,
        alpha,
        filter,
        verticalOffset = 0,
        repeatGap = 0,
    ) {
        if (!image.complete || image.naturalWidth <= 0) return;

        const drawHeight = SCREEN_HEIGHT - HUD_HEIGHT;
        const drawWidth = Math.ceil(drawHeight * image.naturalWidth / image.naturalHeight);
        const repeatPeriod = drawWidth + repeatGap;
        const offset = ((cameraX * parallaxSpeed) % repeatPeriod + repeatPeriod) % repeatPeriod;
        const drawY = HUD_HEIGHT + verticalOffset;

        context.save();
        context.beginPath();
        context.rect(0, HUD_HEIGHT, SCREEN_WIDTH, drawHeight);
        context.clip();
        context.globalAlpha = alpha;
        context.filter = filter;
        for (let copyIndex = -1; copyIndex <= 2; copyIndex += 1) {
            context.drawImage(
                image,
                copyIndex * repeatPeriod - offset,
                drawY,
                drawWidth,
                drawHeight,
            );
        }
        context.restore();
    }

    function drawLevel() {
        for (const platform of getCurrentLevel().platforms) {
            context.fillStyle = '#163d43';
            context.fillRect(platform.x, platform.y, platform.width, platform.height);
            context.fillStyle = '#42c576';
            context.fillRect(platform.x, platform.y, platform.width, 4);
            context.fillStyle = '#89ee83';
            context.fillRect(platform.x, platform.y, platform.width, 2);
            context.fillStyle = '#28616a';
            for (let x = platform.x + 4; x < platform.x + platform.width; x += 12) {
                // Den sidste dekorationsstreg kan ligge tættere på platformens
                // højre kant end sin normale bredde. Afkort den dér, så den
                // aldrig bliver tegnet ude i luften ved siden af jordstykket.
                const upperDashWidth = Math.min(7, platform.x + platform.width - x);
                context.fillRect(x, platform.y + 7, upperDashWidth, 3);

                if (platform.height > 15) {
                    const lowerDashX = x + 4;
                    const lowerDashWidth = Math.min(
                        6,
                        platform.x + platform.width - lowerDashX,
                    );
                    if (lowerDashWidth > 0) {
                        context.fillRect(lowerDashX, platform.y + 15, lowerDashWidth, 3);
                    }
                }
            }
        }

        // Mørke felter under hullerne gør afgrunden tydelig på den lyse baggrund.
        context.fillStyle = '#11122e';
        context.fillRect(0, 176, getCurrentLevel().width, 30);
    }

    function drawFinish() {
        const x = getCurrentLevel().finishX;
        context.fillStyle = '#351f58';
        context.fillRect(x, 99, 34, 55);
        context.fillStyle = '#f07857';
        context.fillRect(x - 4, 96, 42, 7);
        context.fillStyle = '#6ee3c1';
        context.fillRect(x + 10, 119, 14, 35);
        context.fillStyle = '#ffe779';
        context.fillRect(x + 16, 134, 3, 3);
        context.fillStyle = '#ffffff';
        context.font = '7px monospace';
        context.fillText('GOAL', x + 8, 92);
    }

    function drawDiamonds() {
        for (const diamond of diamonds) {
            if (diamond.collected) continue;

            // Fire forskudte frames får hver diamant til at vippe, lyse op og
            // sende et kort glimt ud til skiftevis højre og venstre side.
            const frame = Math.floor(elapsedRealSeconds * 8 + diamond.x * 0.07) % 4;
            const bob = frame === 1 ? -1 : frame === 3 ? 1 : 0;
            const width = frame % 2 === 0 ? 5 : 4;
            const sparkleSide = frame === 1 ? 1 : -1;

            context.save();
            context.translate(diamond.x, diamond.y + bob);
            context.shadowColor = frame % 2 === 0 ? '#79f7ff' : '#c58aff';
            context.shadowBlur = frame % 2 === 0 ? 6 : 3;

            context.beginPath();
            context.moveTo(0, -6);
            context.lineTo(width, -2);
            context.lineTo(0, 6);
            context.lineTo(-width, -2);
            context.closePath();
            context.fillStyle = frame % 2 === 0 ? '#5ff5ff' : '#9b73ff';
            context.fill();
            context.strokeStyle = '#f4ffff';
            context.lineWidth = 0.8;
            context.stroke();

            // To farveflader gør diamanten læsbar som en ædelsten selv i fart.
            context.shadowBlur = 0;
            context.beginPath();
            context.moveTo(0, -5);
            context.lineTo(width - 1, -2);
            context.lineTo(0, 0);
            context.closePath();
            context.fillStyle = '#e8ffff';
            context.fill();
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(width - 1, -2);
            context.lineTo(0, 5);
            context.closePath();
            context.fillStyle = '#376fd4';
            context.fill();

            if (frame === 1 || frame === 3) {
                const sparkleX = sparkleSide * 7;
                context.fillStyle = '#ffffff';
                context.fillRect(sparkleX, -4, 1, 5);
                context.fillRect(sparkleX - 2, -2, 5, 1);
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

    function drawPickup(type, x, y, size, showGlow) {
        const image = pickupImages[type];
        const halfSize = Math.round(size / 2);
        const pumpPickup = type === 'pump' || type === 'autoPump';

        if (showGlow && (type === 'candy' || pumpPickup)) {
            context.fillStyle = type === 'autoPump'
                ? 'rgba(255, 184, 58, 0.30)'
                : type === 'pump'
                    ? 'rgba(84, 244, 255, 0.28)'
                    : 'rgba(255, 190, 55, 0.38)';
            context.beginPath();
            context.arc(x, y, halfSize + 3, 0, Math.PI * 2);
            context.fill();
            // Kun bolsjet ligger på en lys medaljon. Pumpernes egne
            // transparente silhuetter skal svæve frit i gløden.
            if (type === 'candy') {
                context.fillStyle = '#fff6ca';
                context.beginPath();
                context.arc(x, y, halfSize + 1, 0, Math.PI * 2);
                context.fill();
            }
        }

        if (image.complete && image.naturalWidth > 0) {
            context.imageSmoothingEnabled = true;
            if (type === 'candy') {
                // Det genererede billede beskæres tæt og klippes til bolsjets
                // cirkel. Derved kan billedfilens indlejrede baggrund ikke ses.
                const sourcePadding = Math.round(image.naturalWidth * 0.095);
                const sourceSize = image.naturalWidth - sourcePadding * 2;
                context.save();
                context.beginPath();
                context.arc(x, y, halfSize, 0, Math.PI * 2);
                context.clip();
                context.drawImage(
                    image,
                    sourcePadding,
                    sourcePadding,
                    sourceSize,
                    sourceSize,
                    x - halfSize,
                    y - halfSize,
                    size,
                    size,
                );
                context.restore();
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
                if (showGlow) {
                    context.shadowColor = automatic
                        ? 'rgba(255, 186, 55, 0.96)'
                        : 'rgba(83, 240, 255, 0.92)';
                    context.shadowBlur = 10;
                }
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
            // En fjende i gang med at blive spist tegnes særskilt inde i
            // mundmasken efter spillerfiguren, ikke bagved hele figuren her.
            if (enemy.biteAnimationTime > 0 && player.eatAnimationTime > 0) continue;
            const enemyGroundOffset = enemy.type === 'pizza'
                ? PIZZA_GROUND_OFFSET
                : CHARACTER_GROUND_OFFSET;
            const image = characterImages[enemy.type];
            if (image && image.complete && image.naturalWidth > 0) {
                const spriteSize = 31;
                const spriteX = enemy.x + (enemy.width - spriteSize) / 2;
                const spriteY = enemy.y + enemy.height + enemyGroundOffset - spriteSize;
                const showingBiteFrame = enemy.biteAnimationTime > 0;

                if (!showingBiteFrame) {
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
                        : 0;
                    context.save();
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
                        !isShaking && !isThrowingCheese,
                    );
                    context.restore();
                    drawFizzStateEffect(enemy, centerX, bottomY, spriteSize, enemyIndex);
                    drawPizzaThrowWindup(enemy, centerX, bottomY, spriteSize);
                    continue;
                }

                context.save();
                // Den ydre firkant bevares, mens 3 overlappende cirkler
                // trækkes fra med evenodd-klip. Under den længere bidframe
                // krymper og drejer resten af fjenden, før den forsvinder.
                const biteProgress = 1 - enemy.biteAnimationTime / ENEMY_BITE_FRAME_SECONDS;
                const biteX = enemy.biteSide < 0 ? spriteX + 2 : spriteX + spriteSize - 2;
                const biteDirection = enemy.biteSide < 0 ? 1 : -1;
                const biteY = spriteY + spriteSize * 0.46;
                context.beginPath();
                context.rect(spriteX - 1, spriteY - 1, spriteSize + 2, spriteSize + 2);
                context.arc(biteX, biteY, 5.2 + biteProgress * 3, 0, Math.PI * 2);
                context.arc(biteX + biteDirection * 2.5, biteY - 4.5, 3.8, 0, Math.PI * 2);
                context.arc(biteX + biteDirection * 2.5, biteY + 4.5, 3.8, 0, Math.PI * 2);
                context.clip('evenodd');
                context.translate(spriteX + spriteSize / 2, spriteY + spriteSize / 2);
                context.rotate(biteDirection * biteProgress * 0.22);
                context.scale(1 - biteProgress * 0.34, 1 - biteProgress * 0.18);
                context.globalAlpha = Math.min(1, enemy.biteAnimationTime / 0.10);
                context.drawImage(image, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
                context.restore();
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
        }
    }

    function drawWalkingEnemySprite(image, spriteSize, enemyType, walkPhase, isMoving) {
        // Fjendebillederne er enkelte renderinger. For at få ægte benbevægelse
        // deles den nederste del i to halvdele, der roterer modsat hinanden.
        // Kroppen tegnes bagefter og skjuler samlingen ved hofterne.
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const legStartFraction = enemyType === 'pizza'
            ? 0.63
            : enemyType === 'soda' ? 0.65 : 0.67;
        const bodyEndFraction = enemyType === 'pizza'
            ? 0.74
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
        const radius = 1.2 + progress * 2.4;

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

    function drawEatenEnemyInMouth() {
        if (player.eatAnimationTime <= 0) return;
        const enemy = enemies.find((candidate) => candidate.biteAnimationTime > 0);
        if (!enemy) return;

        const pose = getPlayerAnimationPose();
        if (!['eat-open-wide', 'eat-engulf', 'eat-chomp'].includes(pose.name)) return;
        const image = characterImages[enemy.type];
        if (!image || !image.complete || image.naturalWidth <= 0) return;

        const spriteSize = pose.spriteSize || 32;
        const centerX = player.x + PLAYER_WIDTH / 2
            + player.facing * (pose.forward || 0);
        const visualBottom = player.y + PLAYER_HEIGHT + CHARACTER_GROUND_OFFSET;
        const biteProgress = 1 - enemy.biteAnimationTime / ENEMY_BITE_FRAME_SECONDS;
        const foodSize = 11 * (1 - clamp(biteProgress, 0, 1) * 0.34);

        context.save();
        context.translate(centerX, visualBottom - pose.lift);
        context.rotate(pose.rotation * player.facing);
        context.scale(player.facing, 1);

        // Ellipsen ligger inden for den mørke mundhule i devour-framen. Den
        // spiste fjende bliver derfor synlig oven på mundhulen, men klippes væk
        // før den kan dække læber, øjne eller resten af kroppen.
        context.beginPath();
        context.ellipse(3.2, -19.2, 8.1, 9.4, -0.08, 0, Math.PI * 2);
        context.clip();
        context.translate(5.8 - biteProgress * 3.2, -18.5 + biteProgress * 1.5);
        context.rotate(player.facing * biteProgress * 0.32);
        context.drawImage(image, -foodSize / 2, -foodSize / 2, foodSize, foodSize);
        context.restore();
    }

    function drawPlayer() {
        const blinkingDuringDeath = gameState === 'dying'
            && Math.floor(deathTime * 14) % 2 === 0;
        if (blinkingDuringDeath) return;

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
        // Den færdigrenderede sensor tegnes i figurens lokale koordinater. Den
        // følger dermed automatisk spejling, rotation, hop, løb og spiseframes.
        // Det bløde klæbeplaster, kabinettets perspektiv og kontaktskyggen er
        // en del af billedet, så CGM'en ser fastgjort ud i stedet for påmalet.
        const unit = spriteSize / 32;
        const bg = getGameBG();

        // Farven og pulsmønsteret ændres kontinuerligt med sandt BG. Grøn er
        // rolig midte; under 5,2 mmol/L glider farven mod rød og enkeltpulsen
        // bliver gradvist hurtigere. Over 8 mmol/L glider den mod orange,
        // mens en anden puls vokser ind og danner et tydeligere puls-par.
        const smoothStep = (value) => value * value * (3 - 2 * value);
        const lowSeverity = smoothStep(clamp((5.2 - bg) / 2.4, 0, 1));
        const highSeverity = smoothStep(clamp((bg - 8) / 10, 0, 1));
        const normalColor = [110, 227, 193];
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
        const centerX = -8.0 * unit;
        const centerY = -17.1 * unit;
        const sensorWidth = 6.7 * unit;
        const sensorHeight = 6.85 * unit;

        context.save();
        if (
            characterImages.cgmOverlay.complete
            && characterImages.cgmOverlay.naturalWidth > 0
        ) {
            context.drawImage(
                characterImages.cgmOverlay,
                centerX - sensorWidth / 2,
                centerY - sensorHeight / 2,
                sensorWidth,
                sensorHeight,
            );
        }

        // Lampen fylder bevidst cirka en tredjedel af fronten. Ved den lille
        // spriteopløsning giver det stadig 2-3 tydelige pixels. Kun lampens
        // farvelag animeres; selve CGM-renderingen forbliver skarp og stabil.
        const lampCenterX = centerX + 1.05 * unit;
        const lampCenterY = centerY + 0.18 * unit;
        const lampPulseScale = 1 + pulseStrength * 0.12;
        context.shadowColor = alarmColor;
        context.shadowBlur = (0.45 + pulseStrength * (2.2 + colorBlend * 1.4)) * unit;
        context.globalAlpha = 0.34 + pulseStrength * 0.62;
        context.fillStyle = alarmColor;
        context.beginPath();
        context.ellipse(
            lampCenterX,
            lampCenterY,
            0.92 * unit * lampPulseScale,
            1.22 * unit * lampPulseScale,
            -0.48,
            0,
            Math.PI * 2,
        );
        context.fill();

        context.shadowBlur = 0;
        context.globalAlpha = 0.82;
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
            const frameIndex = Math.floor(progress * 8);
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
            if (particle.text) {
                const visibleFraction = clamp(
                    particle.life / particle.maximumLife,
                    0,
                    1,
                );
                context.save();
                context.globalAlpha = Math.min(1, visibleFraction * 1.8);
                context.font = 'bold 7px monospace';
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
            context.fillStyle = particle.color;
            context.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
        }
    }

    function drawHUD() {
        context.fillStyle = '#111329';
        context.fillRect(0, 0, SCREEN_WIDTH, HUD_HEIGHT);
        context.fillStyle = '#30366d';
        context.fillRect(0, HUD_HEIGHT - 2, SCREEN_WIDTH, 2);
        context.font = 'bold 7px monospace';
        context.textBaseline = 'top';

        context.fillStyle = '#ffffff';
        context.fillText(`SCORE ${score}`, 5, 4);
        context.fillStyle = remainingTimeSeconds <= 20 ? '#ff687f' : '#ffffff';
        context.fillText(
            `S${currentLevelIndex + 1} L${lives} T${String(Math.ceil(remainingTimeSeconds)).padStart(3, '0')} TIR${String(Math.round(getTIRFraction() * 100)).padStart(3, '0')}`,
            5,
            17,
        );

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
            context.fillStyle = '#ffd85b';
            context.fillText('A', 108, 4);
            drawPickup('candy', 123, 8, 13, false);
            context.fillText(`x${visibleCandyStock}`, 132, 4);
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
            for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
                const slotX = 134 + slotIndex * 12;
                context.fillStyle = 'rgba(66, 112, 139, 0.72)';
                context.fillRect(slotX, 17, 10, 12);
                context.strokeStyle = '#72dff4';
                context.lineWidth = 1;
                context.strokeRect(slotX + 0.5, 17.5, 9, 11);
                if (slotIndex < visiblePumpInsulin) {
                    drawPickup('insulin', slotX + 5, 23, 10, false);
                }
            }
        }

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

    function drawVerticalBGIndicator() {
        const top = HUD_HEIGHT + 25;
        const height = 116;
        const width = 6;
        const bottom = top + height;
        // Bagpladen er bredere end selve farvesøjlen, så HIGH og LOW kan stå
        const scalePanelWidth = width + 16;
        // Hele målerens bagplade flugter nu med canvasets højre kant. Søjlen
        // beholder luft på begge sider inden i panelet, så labels ikke klippes.
        const scalePanelLeft = SCREEN_WIDTH - scalePanelWidth;
        const x = scalePanelLeft + 8;
        const scalePanelTop = top - 11;
        const scalePanelHeight = height + 22;
        // COB og IOB flyttes til venstre for skalaens top. Tidligere optog de
        // plads på højre side og tvang selve glukosemåleren ind på banen.
        const statsPanelWidth = 38;
        const statsPanelLeft = scalePanelLeft - statsPanelWidth;
        const bg = getGameBG();
        const minimumBG = 2.8;
        const maximumBG = 18;
        const rawIOB = physiologyState
            ? (physiologyState.displayIOB ?? physiologyState.iob)
            : 0;
        const iob = Number.isFinite(rawIOB) ? Math.max(0, rawIOB) : 0;
        const cob = physiologyState && Number.isFinite(physiologyState.cob)
            ? Math.max(0, physiologyState.cob)
            : 0;

        // Den lodrette retning følger en velkendt måler: høje værdier ligger
        // øverst og lave nederst. Alarmzonerne svarer til kindens CGM-farver.
        const yForBG = (value) => bottom
            - clamp((value - minimumBG) / (maximumBG - minimumBG), 0, 1) * height;
        const highBoundaryY = yForBG(TIR_MAX_MMOL_L);
        const lowBoundaryY = yForBG(TIR_MIN_MMOL_L);
        const markerY = yForBG(bg);

        context.save();
        // COB og IOB er fastgjort til skalaens top i stedet for til den øvre
        // HUD-linje. Kolonnen står umiddelbart til venstre med COB øverst.
        context.fillStyle = 'rgba(7, 9, 28, 0.82)';
        context.fillRect(
            statsPanelLeft,
            top - 24,
            statsPanelWidth,
            21
        );
        context.font = 'bold 5px monospace';
        context.textAlign = 'left';
        context.textBaseline = 'top';
        context.fillStyle = '#ffd85b';
        context.fillText(`COB ${cob.toFixed(0)}g`, statsPanelLeft + 3, top - 22);
        context.fillStyle = '#7cf5ff';
        context.fillText(`IOB ${iob.toFixed(1)}U`, statsPanelLeft + 3, top - 13);

        context.fillStyle = 'rgba(7, 9, 28, 0.82)';
        context.fillRect(
            scalePanelLeft,
            scalePanelTop,
            scalePanelWidth,
            scalePanelHeight
        );

        context.fillStyle = '#f0a342';
        context.fillRect(x, top, width, highBoundaryY - top);
        context.fillStyle = '#54d982';
        context.fillRect(x, highBoundaryY, width, lowBoundaryY - highBoundaryY);
        context.fillStyle = '#ff5f78';
        context.fillRect(x, lowBoundaryY, width, bottom - lowBoundaryY);

        context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        context.lineWidth = 1;
        context.strokeRect(x - 0.5, top - 0.5, width + 1, height + 1);

        // Den hvide pil og den lille talbrik bevæger sig sammen med sand BG.
        // Tallet giver præcision, mens højden kan aflæses i periferien.
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.moveTo(x - 1, markerY);
        context.lineTo(x - 6, markerY - 3);
        context.lineTo(x - 6, markerY + 3);
        context.closePath();
        context.fill();
        context.fillStyle = 'rgba(7, 9, 28, 0.86)';
        context.fillRect(x - 33, markerY - 5, 26, 10);
        context.fillStyle = '#ffffff';
        context.font = 'bold 6px monospace';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        context.fillText(`${bg.toFixed(1)}${getTrendArrow()}`, x - 8, markerY);

        context.font = 'bold 5px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffd0a1';
        context.fillText('HIGH', x + width / 2, top - 7);
        context.fillStyle = '#ffb3c0';
        context.fillText('LOW', x + width / 2, bottom + 7);
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
        if (messageTime <= 0 || gameState !== 'playing') return;
        context.font = 'bold 8px monospace';
        const width = context.measureText(message).width + 12;
        const x = Math.round((SCREEN_WIDTH - width) / 2);
        context.fillStyle = 'rgba(10, 12, 35, 0.86)';
        context.fillRect(x, 34, width, 15);
        context.fillStyle = '#ffffff';
        context.fillText(message, x + 6, 38);
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
            remainingTimeSeconds,
            tirPercent: Math.round(getTIRFraction() * 100),
            cameraX,
        }),
    };

    setMusicEnabled(readAudioPreference(MUSIC_STORAGE_KEY), false);
    setSoundEnabled(readAudioPreference(SOUND_STORAGE_KEY), false);
    resetRun();
    showOverlay('DEXTRO DASH 2000', 'STAGE 1', 'PRESS Z OR AN ARROW KEY');
    window.requestAnimationFrame(frame);
}());
