/**
 * Color Buddy - Learning Game
 * Evidence-based color learning with SRS and voice recognition
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    maxProfiles: 4,
    sessionDurationMs: 5 * 60 * 1000, // 5 minutes
    maxNewColorsPerSession: 1,
    listeningWindowMs: {
        new: 8000,      // 8 seconds for new colors
        learning: 6000, // 6 seconds for learning
        mastered: 4000  // 4 seconds for mastered
    },
    masteryThreshold: 6, // Correct recalls to be "mastered"
    learningThreshold: 3, // Correct recalls to be "learning"
    srsIntervals: [0, 1, 3, 7, 14, 30], // days
    retestDelayMs: 30000, // 30 seconds for surprise retest
};

const COLORS = [
    // Phase 1: Primary
    { name: 'Red', hex: '#ef4444', phase: 1 },
    { name: 'Blue', hex: '#3b82f6', phase: 1 },
    { name: 'Yellow', hex: '#facc15', phase: 1 },
    // Phase 2: Secondary
    { name: 'Green', hex: '#22c55e', phase: 2 },
    { name: 'Orange', hex: '#f97316', phase: 2 },
    { name: 'Purple', hex: '#a855f7', phase: 2 },
    // Phase 3: Neutrals/Common
    { name: 'Black', hex: '#1f2937', phase: 3 },
    { name: 'White', hex: '#f8fafc', phase: 3 },
    { name: 'Brown', hex: '#92400e', phase: 3 },
    { name: 'Pink', hex: '#ec4899', phase: 3 },
];

const AVATARS = [
    { emoji: '🦊', color: '#ff6b6b' },
    { emoji: '🐸', color: '#4ecdc4' },
    { emoji: '🐥', color: '#ffe66d' },
    { emoji: '🦄', color: '#a855f7' },
];

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    currentScreen: 'profiles',
    currentProfile: null,
    sessionStartTime: null,
    currentColor: null,
    isTeaching: false,
    retestQueue: [],
    recognition: null,
    speechSynth: window.speechSynthesis,
    // Guards against race conditions
    isBusy: false,
    turnId: 0, // Incremented each turn to invalidate stale callbacks
};

// ============================================
// STORAGE
// ============================================

const Storage = {
    getProfiles() {
        const data = localStorage.getItem('colorbuddy_profiles');
        return data ? JSON.parse(data) : [];
    },

    saveProfiles(profiles) {
        localStorage.setItem('colorbuddy_profiles', JSON.stringify(profiles));
    },

    getProfile(id) {
        const profiles = this.getProfiles();
        return profiles.find(p => p.id === id);
    },

    saveProfile(profile) {
        const profiles = this.getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);
        if (index >= 0) {
            profiles[index] = profile;
        } else {
            profiles.push(profile);
        }
        this.saveProfiles(profiles);
    },

    createProfile(avatarIndex) {
        const avatar = AVATARS[avatarIndex];
        const profile = {
            id: Date.now().toString(),
            avatar: avatar.emoji,
            color: avatar.color,
            createdAt: new Date().toISOString(),
            lastPlayed: null,
            streak: 0,
            srsData: {}, // { colorName: { correctCount, lastReview, interval, nextReview } }
            sessionsCompleted: 0,
            isOnboarded: false,
        };
        this.saveProfile(profile);
        return profile;
    },
};

// ============================================
// SRS ENGINE
// ============================================

const SRS = {
    getColorData(profile, colorName) {
        return profile.srsData[colorName] || {
            correctCount: 0,
            lastReview: null,
            interval: 0,
            nextReview: null,
        };
    },

    getMasteryLevel(colorData) {
        if (colorData.correctCount >= CONFIG.masteryThreshold) return 'mastered';
        if (colorData.correctCount >= CONFIG.learningThreshold) return 'learning';
        return 'new';
    },

    recordSuccess(profile, colorName) {
        const data = this.getColorData(profile, colorName);
        data.correctCount++;
        data.lastReview = new Date().toISOString();

        // Increase interval (spaced repetition)
        const intervalIndex = Math.min(data.correctCount, CONFIG.srsIntervals.length - 1);
        data.interval = CONFIG.srsIntervals[intervalIndex];

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + data.interval);
        data.nextReview = nextReview.toISOString();

        profile.srsData[colorName] = data;
        Storage.saveProfile(profile);
    },

    recordFailure(profile, colorName) {
        const data = this.getColorData(profile, colorName);
        // Don't decrease correctCount below 0, but reset interval
        data.lastReview = new Date().toISOString();
        data.interval = 0;
        data.nextReview = new Date().toISOString(); // Due immediately

        profile.srsData[colorName] = data;
        Storage.saveProfile(profile);
    },

    getNextColor(profile) {
        const now = new Date();

        // 1. Check for due reviews
        for (const color of COLORS) {
            const data = this.getColorData(profile, color.name);
            if (data.nextReview && new Date(data.nextReview) <= now) {
                return { color, type: 'review' };
            }
        }

        // 2. Find highest unlocked phase
        const unlockedPhase = this.getUnlockedPhase(profile);

        // 3. Introduce new color from current phase
        for (const color of COLORS) {
            if (color.phase > unlockedPhase) continue;
            const data = this.getColorData(profile, color.name);
            if (data.correctCount === 0 && !data.lastReview) {
                return { color, type: 'new' };
            }
        }

        // 4. Review any color (for interleaving practice)
        const knownColors = COLORS.filter(c => {
            const data = this.getColorData(profile, c.name);
            return data.correctCount > 0;
        });
        if (knownColors.length > 0) {
            const randomIndex = Math.floor(Math.random() * knownColors.length);
            return { color: knownColors[randomIndex], type: 'review' };
        }

        return null;
    },

    getUnlockedPhase(profile) {
        // Phase 1 unlocked by default
        // Phase 2 requires all Phase 1 mastered
        // Phase 3 requires all Phase 2 mastered
        for (let phase = 3; phase >= 1; phase--) {
            const phaseColors = COLORS.filter(c => c.phase < phase);
            const allMastered = phaseColors.every(c => {
                const data = this.getColorData(profile, c.name);
                return this.getMasteryLevel(data) === 'mastered';
            });
            if (allMastered) return phase;
        }
        return 1;
    },

    getListeningWindow(profile, colorName) {
        const data = this.getColorData(profile, colorName);
        const level = this.getMasteryLevel(data);
        return CONFIG.listeningWindowMs[level];
    },

    getKnownColors(profile) {
        return COLORS.filter(c => {
            const data = this.getColorData(profile, c.name);
            return data.correctCount > 0;
        });
    },
};

// ============================================
// SPEECH SYNTHESIS
// ============================================

const Speech = {
    speak(text, callback) {
        // Cancel any pending speech first
        this.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85; // Slightly slower for children
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.onend = () => {
            // Add delay after speech ends before calling callback
            // This prevents the mic from picking up our own speech
            setTimeout(() => {
                if (callback) callback();
            }, 500); // 500ms pause after speaking
        };
        state.speechSynth.speak(utterance);
    },

    cancel() {
        state.speechSynth.cancel();
    },
};

// ============================================
// AUDIO FEEDBACK (Mic On/Off sounds)
// ============================================

const AudioFeedback = {
    audioContext: null,

    init() {
        // Lazy init on first user interaction
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        this.init();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Gentle envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    },

    micOn() {
        // Gentle ascending bell (two notes)
        this.playTone(523.25, 0.15, 'sine', 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.2, 'sine', 0.25), 100); // E5
    },

    micOff() {
        // Gentle descending tone
        this.playTone(440, 0.15, 'sine', 0.15); // A4
    },

    success() {
        // Happy ascending arpeggio
        this.playTone(523.25, 0.1, 'sine', 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.2), 80); // E5
        setTimeout(() => this.playTone(783.99, 0.2, 'sine', 0.25), 160); // G5
    },
};

// ============================================
// VOICE RECOGNITION
// ============================================

const VoiceRecognition = {
    isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    },

    activeTimeout: null,

    init() {
        if (!this.isSupported()) {
            console.warn('Speech recognition not supported');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.lang = 'en-US';
    },

    listen(targetWord, timeoutMs, callback, turnId) {
        // Stop any previous session first
        this.stop();

        // Create a fresh recognition instance for each listen session
        // This avoids issues with stale event handlers
        if (!this.isSupported()) {
            // Fallback: simulate with timeout for demo
            this.activeTimeout = setTimeout(() => {
                if (state.turnId === turnId) {
                    callback({ success: false, heard: null });
                }
            }, timeoutMs);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        state.recognition = recognition; // Store for stop()

        let hasResult = false;
        console.log(`[VoiceRecog] Starting to listen for "${targetWord}" (turn ${turnId}, timeout ${timeoutMs}ms)`);

        this.activeTimeout = setTimeout(() => {
            if (!hasResult && state.turnId === turnId) {
                console.log(`[VoiceRecog] Timeout reached, no result for "${targetWord}"`);
                recognition.stop();
                callback({ success: false, heard: null });
            }
        }, timeoutMs);

        recognition.onresult = (event) => {
            if (state.turnId !== turnId) {
                console.log(`[VoiceRecog] Ignoring stale result (turn ${turnId} vs current ${state.turnId})`);
                return;
            }
            hasResult = true;
            clearTimeout(this.activeTimeout);
            const heard = event.results[0][0].transcript.toLowerCase();
            const confidence = event.results[0][0].confidence;
            const target = targetWord.toLowerCase();
            // Fuzzy match: check if target word is contained in what was heard
            const success = heard.includes(target) ||
                this.fuzzyMatch(heard, target);
            console.log(`[VoiceRecog] Heard "${heard}" (conf: ${confidence.toFixed(2)}), target "${target}", success: ${success}`);
            callback({ success, heard });
        };

        recognition.onerror = (event) => {
            if (state.turnId !== turnId) return; // Stale callback, ignore
            console.log(`[VoiceRecog] Error: ${event.error}`);
            // Don't treat 'no-speech' as fatal error, just let timeout handle it
            if (event.error === 'no-speech' || event.error === 'aborted') {
                return; // Let timeout fire normally
            }
            hasResult = true;
            clearTimeout(this.activeTimeout);
            callback({ success: false, heard: null, error: event.error });
        };

        recognition.onend = () => {
            console.log(`[VoiceRecog] Recognition ended (hasResult: ${hasResult})`);
            this.hideMic();
            if (!hasResult && state.turnId === turnId) {
                AudioFeedback.micOff();
            }
        };

        try {
            recognition.start();
            this.showMic();
            AudioFeedback.micOn();
            console.log(`[VoiceRecog] Recognition started`);
        } catch (e) {
            console.warn('[VoiceRecog] Could not start:', e);
            this.hideMic();
            clearTimeout(this.activeTimeout);
            callback({ success: false, heard: null, error: e.message });
        }
    },

    fuzzyMatch(heard, target) {
        // Simple Levenshtein distance check
        if (Math.abs(heard.length - target.length) > 2) return false;
        let matches = 0;
        for (let i = 0; i < Math.min(heard.length, target.length); i++) {
            if (heard[i] === target[i]) matches++;
        }
        return matches >= target.length * 0.7;
    },

    stop() {
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
        this.hideMic();
        if (state.recognition) {
            try {
                state.recognition.stop();
            } catch (e) {
                // Not started, ignore
            }
        }
    },

    showMic() {
        const overlay = document.getElementById('mic-overlay');
        if (overlay) overlay.classList.remove('hidden');
    },

    hideMic() {
        const overlay = document.getElementById('mic-overlay');
        if (overlay) overlay.classList.add('hidden');
    },
};

// ============================================
// UI HELPERS
// ============================================

const UI = {
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(`screen-${screenName}`);
        if (screen) {
            screen.classList.add('active');
            state.currentScreen = screenName;
        }
    },

    setColorBackground(elementId, color) {
        const el = document.getElementById(elementId);
        if (el) {
            el.style.backgroundColor = color.hex;
            el.setAttribute('data-color', color.name.toLowerCase());
        }
    },

    spawnConfetti() {
        const container = document.getElementById('confetti');
        container.innerHTML = '';
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#22c55e'];
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.animationDelay = `${Math.random() * 0.5}s`;
            container.appendChild(piece);
        }
    },

    renderProfiles() {
        const grid = document.getElementById('profile-grid');
        grid.innerHTML = '';
        const profiles = Storage.getProfiles();

        // Render existing profiles
        profiles.slice(0, CONFIG.maxProfiles).forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card filled';
            card.style.setProperty('--profile-color', profile.color);
            card.innerHTML = `
                <span class="profile-avatar">${profile.avatar}</span>
                <span class="profile-name">Player</span>
            `;
            card.addEventListener('click', () => Game.selectProfile(profile.id));
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                Game.showStats(profile.id);
            });
            // Long press for stats
            let pressTimer;
            card.addEventListener('touchstart', () => {
                pressTimer = setTimeout(() => Game.showStats(profile.id), 800);
            });
            card.addEventListener('touchend', () => clearTimeout(pressTimer));
            grid.appendChild(card);
        });

        // Render empty slots
        const emptySlots = CONFIG.maxProfiles - profiles.length;
        for (let i = 0; i < emptySlots; i++) {
            const card = document.createElement('div');
            card.className = 'profile-card empty';
            card.innerHTML = `<span class="profile-add">+</span>`;
            card.addEventListener('click', () => UI.showScreen('create-profile'));
            grid.appendChild(card);
        }
    },

    renderAvatarPicker() {
        const picker = document.getElementById('avatar-picker');
        picker.innerHTML = '';
        AVATARS.forEach((avatar, index) => {
            const option = document.createElement('div');
            option.className = 'avatar-option';
            option.style.backgroundColor = avatar.color;
            option.textContent = avatar.emoji;
            option.addEventListener('click', () => Game.createProfile(index));
            picker.appendChild(option);
        });
    },

    renderColorsLearned(profile) {
        const container = document.getElementById('colors-learned');
        container.innerHTML = '';
        const knownColors = SRS.getKnownColors(profile);
        knownColors.forEach((color, index) => {
            const badge = document.createElement('div');
            badge.className = 'color-badge';
            badge.style.backgroundColor = color.hex;
            badge.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(badge);
        });
    },

    renderStats(profile) {
        const grid = document.getElementById('stats-grid');
        const knownColors = SRS.getKnownColors(profile);
        const masteredColors = knownColors.filter(c => {
            const data = SRS.getColorData(profile, c.name);
            return SRS.getMasteryLevel(data) === 'mastered';
        });

        grid.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${knownColors.length}</div>
                <div class="stat-label">Colors Learned</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${masteredColors.length}</div>
                <div class="stat-label">Mastered</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${profile.streak}</div>
                <div class="stat-label">Day Streak</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${profile.sessionsCompleted}</div>
                <div class="stat-label">Sessions</div>
            </div>
        `;
    },
};

// ============================================
// GAME LOGIC
// ============================================

const Game = {
    init() {
        VoiceRecognition.init();
        UI.renderProfiles();
        UI.renderAvatarPicker();
        this.bindEvents();
    },

    bindEvents() {
        // Idle screen tap
        document.getElementById('screen-idle').addEventListener('click', () => {
            this.startSession();
        });

        // Stats back button
        document.getElementById('stats-back-btn').addEventListener('click', () => {
            UI.showScreen('profiles');
        });
    },

    selectProfile(profileId) {
        state.currentProfile = Storage.getProfile(profileId);
        if (state.currentProfile) {
            UI.showScreen('idle');
        }
    },

    createProfile(avatarIndex) {
        const profile = Storage.createProfile(avatarIndex);
        state.currentProfile = profile;
        UI.renderProfiles();
        UI.showScreen('idle');
    },

    showStats(profileId) {
        const profile = Storage.getProfile(profileId);
        if (profile) {
            UI.renderStats(profile);
            UI.showScreen('stats');
        }
    },

    startSession() {
        state.sessionStartTime = Date.now();
        state.retestQueue = [];

        // Update streak
        this.updateStreak();

        // Check if onboarding needed
        if (!state.currentProfile.isOnboarded) {
            this.runOnboarding();
        } else {
            this.nextTurn();
        }
    },

    updateStreak() {
        const profile = state.currentProfile;
        const lastPlayed = profile.lastPlayed ? new Date(profile.lastPlayed) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastPlayed) {
            const lastPlayedDay = new Date(lastPlayed);
            lastPlayedDay.setHours(0, 0, 0, 0);
            const dayDiff = Math.floor((today - lastPlayedDay) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                profile.streak++;
            } else if (dayDiff > 1) {
                profile.streak = 1;
            }
            // dayDiff === 0 means already played today, keep streak
        } else {
            profile.streak = 1;
        }

        profile.lastPlayed = new Date().toISOString();
        Storage.saveProfile(profile);
    },

    runOnboarding() {
        // Day 1: Pure teaching, no testing
        const primaryColors = COLORS.filter(c => c.phase === 1);
        let index = 0;

        const teachNext = () => {
            if (index >= primaryColors.length) {
                state.currentProfile.isOnboarded = true;
                Storage.saveProfile(state.currentProfile);
                this.endSession();
                return;
            }

            const color = primaryColors[index];
            this.teachColor(color, () => {
                index++;
                setTimeout(teachNext, 1000);
            });
        };

        teachNext();
    },

    nextTurn() {
        // Increment turn ID to invalidate any pending callbacks
        state.turnId++;

        // Cancel any pending speech or recognition
        Speech.cancel();
        VoiceRecognition.stop();

        // Check session time
        if (Date.now() - state.sessionStartTime > CONFIG.sessionDurationMs) {
            this.endSession();
            return;
        }

        // Check retest queue first
        if (state.retestQueue.length > 0) {
            const retestColor = state.retestQueue.shift();
            this.testColor(retestColor);
            return;
        }

        // Get next color from SRS
        const next = SRS.getNextColor(state.currentProfile);
        if (!next) {
            this.endSession();
            return;
        }

        state.currentColor = next.color;

        if (next.type === 'new') {
            this.teachColor(next.color, () => {
                this.listenForResponse(next.color, true);
            });
        } else {
            this.testColor(next.color);
        }
    },

    teachColor(color, callback) {
        state.isTeaching = true;
        state.currentColor = color;

        // Update UI
        UI.setColorBackground('teach-color-display', color);
        // Show both capital case and lowercase for learning
        document.getElementById('teach-color-name').innerHTML =
            `<span class="color-name-upper">${color.name}</span>` +
            `<span class="color-name-lower">${color.name.toLowerCase()}</span>`;
        UI.showScreen('teach');

        // Speak introduction
        Speech.speak(`Look! This is ${color.name}. ${color.name}.`, callback);
    },

    testColor(color) {
        state.isTeaching = false;
        state.currentColor = color;

        // Update UI
        UI.setColorBackground('test-color-display', color);
        UI.showScreen('test');

        // Ask question
        Speech.speak('What color is this?', () => {
            this.listenForResponse(color, false);
        });
    },

    listenForResponse(color, isAfterTeaching) {
        UI.setColorBackground('listening-color-display', color);
        UI.showScreen('listening');

        const timeoutMs = isAfterTeaching
            ? CONFIG.listeningWindowMs.new
            : SRS.getListeningWindow(state.currentProfile, color.name);

        const currentTurnId = state.turnId; // Capture turn ID
        VoiceRecognition.listen(color.name, timeoutMs, (result) => {
            if (state.turnId !== currentTurnId) return; // Stale, ignore
            if (result.success) {
                this.handleSuccess(color);
            } else {
                this.handleFailure(color, isAfterTeaching);
            }
        }, currentTurnId);
    },

    handleSuccess(color) {
        SRS.recordSuccess(state.currentProfile, color.name);

        // Update UI
        document.getElementById('success-text').textContent = `Yes! It's ${color.name}!`;
        UI.showScreen('success');
        UI.spawnConfetti();

        const currentTurnId = state.turnId;
        Speech.speak(`Yes! It's ${color.name}!`, () => {
            if (state.turnId !== currentTurnId) return; // Stale, ignore
            setTimeout(() => {
                if (state.turnId !== currentTurnId) return; // Stale, ignore
                this.nextTurn();
            }, 1500);
        });
    },

    handleFailure(color, isAfterTeaching) {
        if (!isAfterTeaching) {
            SRS.recordFailure(state.currentProfile, color.name);
        }

        // Update UI - show the color on correction screen
        UI.setColorBackground('correction-color-display', color);
        document.getElementById('correction-text').textContent = `This color is ${color.name}!`;
        UI.showScreen('correction');

        // Queue for retest (surprise retest 30s later)
        setTimeout(() => {
            state.retestQueue.push(color);
        }, CONFIG.retestDelayMs);

        // Ask them to parrot
        const currentTurnId = state.turnId; // Capture turn ID
        Speech.speak(`This color is ${color.name}. Can you say ${color.name}?`, () => {
            if (state.turnId !== currentTurnId) return; // Stale, ignore
            // Give them a chance to parrot
            VoiceRecognition.listen(color.name, CONFIG.listeningWindowMs.new, (result) => {
                if (state.turnId !== currentTurnId) return; // Stale, ignore
                if (result.success) {
                    Speech.speak('Great!', () => {
                        if (state.turnId !== currentTurnId) return;
                        this.nextTurn();
                    });
                } else {
                    setTimeout(() => {
                        if (state.turnId !== currentTurnId) return;
                        this.nextTurn();
                    }, 1000);
                }
            }, currentTurnId);
        });
    },

    endSession() {
        const profile = state.currentProfile;
        profile.sessionsCompleted++;
        Storage.saveProfile(profile);

        // Update UI
        UI.renderColorsLearned(profile);
        document.getElementById('streak-count').textContent = profile.streak;
        UI.showScreen('end');

        Speech.speak('Great job today! See you next time!', () => {
            setTimeout(() => {
                UI.showScreen('profiles');
                UI.renderProfiles();
            }, 5000);
        });
    },
};

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
