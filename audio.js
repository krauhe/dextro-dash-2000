/*
 * AUDIO.JS - original kodegenereret chiptune og korte arkadelyde.
 *
 * Musikken bruger 6 små synthesizerstemmer, som en teknisk hilsen til
 * 1980'ernes hjemmecomputere: lead, svarmelodi, arpeggio, bas, akkordflade og
 * percussion. Alt er komponeret specifikt til prototypen og citerer ikke
 * eksisterende spilmusik.
 */

class GlucoseRunnerAudio {
    constructor() {
        this.context = null;
        this.master = null;
        this.musicBus = null;
        this.effectsBus = null;
        this.musicTimer = null;
        this.step = 0;
        this.musicEnabled = true;
        this.effectsEnabled = true;
        this.musicStepMilliseconds = 165;
    }

    async start() {
        if (!this.musicEnabled && !this.effectsEnabled) return;
        if (!this.context) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            this.context = new AudioContextClass();
            this.master = this.context.createGain();
            this.musicBus = this.context.createGain();
            this.effectsBus = this.context.createGain();

            // Musik og effekter har hver sin kanal. Det gør det muligt at holde
            // chiptunen lav og behagelig, mens handlingerne stadig kan høres.
            this.master.gain.value = 0.16;
            this.musicBus.gain.value = 0.42;
            this.effectsBus.gain.value = 0.90;
            this.musicBus.connect(this.master);
            this.effectsBus.connect(this.master);
            this.master.connect(this.context.destination);
        }
        if (this.context.state === 'suspended') await this.context.resume();
        if (this.musicEnabled && !this.musicTimer) {
            this.step = 0;
            this.musicTimer = window.setInterval(
                () => this.playMusicStep(),
                this.musicStepMilliseconds,
            );
        }
    }

    stop() {
        if (this.musicTimer) window.clearInterval(this.musicTimer);
        this.musicTimer = null;
    }

    setMusicEnabled(enabled) {
        this.musicEnabled = Boolean(enabled);
        if (!this.musicEnabled) this.stop();
    }

    setEffectsEnabled(enabled) {
        this.effectsEnabled = Boolean(enabled);
    }

    isChannelEnabled(channel) {
        return channel === 'music' ? this.musicEnabled : this.effectsEnabled;
    }

    noteFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    tone(midi, duration, type, volume, delay = 0, channel = 'effects') {
        if (!this.context || !this.master || !this.isChannelEnabled(channel) || midi == null) return;
        const now = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const destination = channel === 'music' ? this.musicBus : this.effectsBus;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(this.noteFrequency(midi), now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(destination || this.master);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    sweep(startFrequency, endFrequency, duration, type, volume, delay = 0, channel = 'effects') {
        if (!this.context || !this.master || !this.isChannelEnabled(channel)) return;
        const now = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(channel === 'music' ? (this.musicBus || this.master) : (this.effectsBus || this.master));
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    noise(duration = 0.045, volume = 0.025, channel = 'effects') {
        if (!this.context || !this.master || !this.isChannelEnabled(channel)) return;
        const frameCount = Math.max(1, Math.floor(this.context.sampleRate * duration));
        const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
        }
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(channel === 'music' ? (this.musicBus || this.master) : (this.effectsBus || this.master));
        source.start();
    }

    playMusicStep() {
        // Den originale 64-trins melodi bruger A-mol/C-dur-toner, synkoper og
        // tydelige pauser. Arrangementets øvrige stemmer følger harmonikken,
        // men undgår at fordoble leadets rytme hele tiden.
        const melody = [
            69, null, 72, null, 76, null, 74, 72,
            null, 69, null, 67, 69, null, 64, null,
            72, null, 76, null, 79, 76, 74, null,
            71, null, 74, 76, 72, null, 67, null,
            69, null, 71, 72, null, 76, 74, null,
            67, null, 69, null, 72, 69, 64, null,
            76, null, 74, 72, 71, null, 69, null,
            67, 69, 71, null, 64, null, null, null,
        ];
        // Svarmelodien kommer hovedsageligt ind i hovedmelodiens pauser. De
        // sidste 16 trin løfter sig en oktav og giver loopet en tydelig finale.
        const counterMelody = [
            null, 76, null, 79, null, 76, null, null,
            72, null, 74, null, null, 71, null, 72,
            null, 79, null, 81, null, null, 79, null,
            74, null, 76, null, 79, null, null, 76,
            null, 76, 79, null, 81, null, null, 79,
            74, null, 76, null, null, 72, null, 71,
            null, 81, null, 79, null, 76, null, 74,
            null, null, 76, 79, 81, null, 84, null,
        ];
        const roots = [45, 41, 48, 43, 45, 41, 50, 40];
        const chordThirds = [3, 4, 4, 4, 3, 4, 3, 4];
        const arpeggioPattern = [12, 19, 15, 19, 12, 16, 19, 16];
        const bassPattern = [0, null, 7, null, 12, 7, null, 3];
        const index = this.step % melody.length;
        const barStep = index % 8;
        const chordIndex = Math.floor(index / 8) % roots.length;
        const root = roots[chordIndex];
        const third = chordThirds[chordIndex];
        const leadNote = melody[index];
        const counterNote = counterMelody[index];

        // 1. LEAD: En kort square-kerne giver 8-bit-karakter. En svag
        // triangle-tone en oktav under runder klangen af.
        if (leadNote != null) {
            this.tone(leadNote, 0.105, 'square', 0.023, 0, 'music');
            this.tone(leadNote - 12, 0.15, 'triangle', 0.013, 0, 'music');
        }

        // 2. SVARMELODI: En rund sinustone svarer fra et højere register. Den
        // er kortere og svagere end leadet, så melodien stadig er let at følge.
        if (counterNote != null && (leadNote == null || barStep === 6)) {
            this.tone(counterNote, 0.18, 'sine', 0.012, 0.025, 'music');
        }

        // 3. ARPEGGIO: En stille pulsstemme spiller forskellige akkordtoner på
        // hvert trin. Hver anden takt åbnes mønsteret en oktav op.
        const arpeggioLift = chordIndex % 2 === 0 && barStep >= 4 ? 12 : 0;
        const arpeggioNote = root + arpeggioPattern[barStep] + arpeggioLift;
        const arpeggioVolume = leadNote == null ? 0.012 : 0.007;
        this.tone(arpeggioNote, 0.07, 'square', arpeggioVolume, 0, 'music');

        // 4. BAS: Grundtone, kvint og korte gennemgangstoner giver en rigtig
        // baslinje frem for den tidligere vekslen mellem kun 2 toner.
        // Sidste gennemgangstone følger akkordens egen dur- eller molterts.
        const bassInterval = barStep === 7 ? third : bassPattern[barStep];
        if (bassInterval != null) {
            const bassNote = root + bassInterval;
            this.tone(bassNote, barStep === 0 ? 0.31 : 0.16, 'triangle', 0.034, 0, 'music');
            if (barStep === 0 || barStep === 4) {
                this.tone(bassNote - 12, 0.24, 'sine', 0.012, 0, 'music');
            }
        }

        // 5. AKKORDFLADE: En lav treklang ved taktstart binder de korte
        // chipstemmer sammen. De små forskelle i varighed holder klangen åben.
        if (barStep === 0) {
            this.tone(root + 12, 0.92, 'triangle', 0.007, 0, 'music');
            this.tone(root + 12 + third, 0.78, 'sine', 0.006, 0.015, 'music');
            this.tone(root + 19, 1.02, 'triangle', 0.006, 0.03, 'music');
        }

        // 6. PERCUSSION: En blød syntetisk stortromme markerer 1 og 3. Korte
        // støjpust fungerer som lukket hi-hat; et lidt længere pust på 2 og 4
        // giver rytmen mere fremdrift uden at overdøve spillets lydeffekter.
        if (barStep === 0 || barStep === 4) {
            this.sweep(105, 48, 0.085, 'sine', 0.018, 0, 'music');
        }
        if (barStep % 2 === 0) this.noise(0.014, 0.0035, 'music');
        if (barStep === 2 || barStep === 6) this.noise(0.035, 0.0045, 'music');

        // En lys klokke på de 2 sidste takter varsler, at temaet vender tilbage.
        if ((index === 55 || index === 62) && leadNote == null) {
            this.tone(root + 31, 0.34, 'sine', 0.013, 0.02, 'music');
        }
        this.step++;
    }

    jump() {
        this.sweep(260, 620, 0.11, 'square', 0.055);
        this.tone(81, 0.055, 'triangle', 0.035, 0.07);
    }

    pickup() {
        this.tone(81, 0.055, 'square', 0.07);
        this.tone(88, 0.09, 'triangle', 0.065, 0.045);
    }

    insulin() {
        this.tone(69, 0.06, 'triangle', 0.055);
        this.sweep(440, 220, 0.14, 'sine', 0.045, 0.045);
    }

    candy() {
        this.tone(79, 0.06, 'square', 0.07);
        this.tone(83, 0.06, 'square', 0.065, 0.05);
        this.tone(88, 0.11, 'triangle', 0.055, 0.10);
    }

    eat() {
        this.sweep(190, 105, 0.09, 'triangle', 0.065);
        this.sweep(155, 90, 0.08, 'triangle', 0.05, 0.075);
        this.noise(0.035, 0.014);
    }

    stomp() {
        this.sweep(115, 46, 0.12, 'square', 0.075);
        this.noise(0.055, 0.032);
    }

    hurt() {
        this.tone(58, 0.08, 'sawtooth', 0.08);
        this.tone(48, 0.15, 'sawtooth', 0.07, 0.07);
    }

    sadDeath() {
        // En langsom nedadgående C-dur-frase. Dur-tonerne er rene, mens den
        // faldende bevægelse og den bløde klang giver et bedrøvet udtryk.
        [72, 67, 64, 60].forEach((note, index) => {
            this.tone(note, 0.42, 'triangle', 0.065, index * 0.19);
            this.tone(note - 12, 0.48, 'sine', 0.026, index * 0.19);
        });
    }

    win() {
        [72, 76, 79, 84].forEach((note, index) => {
            this.tone(note, 0.24, 'square', 0.075, index * 0.1);
        });
    }

    tallyTick(step = 0) {
        // Korte skiftende toner giver en klassisk pointtæller uden at blive
        // skingre, selv når alle tre bonuslinjer har store beløb.
        const notes = [76, 79, 81, 84];
        this.tone(notes[step % notes.length], 0.045, 'square', 0.038);
        this.tone(64, 0.055, 'triangle', 0.018);
    }

    tallyComplete() {
        // En lys akkord efterfulgt af en ekstra topnote fungerer som det
        // samlede "cha-ching", når TOTAL er færdigoptalt.
        this.win();
        this.tone(88, 0.34, 'triangle', 0.075, 0.34);
        this.tone(96, 0.42, 'sine', 0.055, 0.40);
        this.noise(0.055, 0.018);
    }
}
