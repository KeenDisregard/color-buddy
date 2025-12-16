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
    masteryThreshold: 3, // Correct recalls to be "mastered" (was 6)
    learningThreshold: 2, // Correct recalls to be "learning" (was 3)
    srsIntervals: [0, 1, 3, 7, 14, 30], // days
    retestDelayMs: 30000, // 30 seconds for surprise retest
};

const COLORS = [
    // Phase 1: Primary
    { name: 'Red', hex: '#ef4444', phase: 1, aliases: ['red', 'read', 'rad', 'rid'] },
    { name: 'Blue', hex: '#3b82f6', phase: 1, aliases: ['blue', 'blew', 'boo', 'blu'] },
    { name: 'Yellow', hex: '#facc15', phase: 1, aliases: ['yellow', 'yell', 'yello', 'yella', 'yelo', 'ellow', 'jello', 'yallow', 'yaller'] },
    // Phase 2: Secondary
    { name: 'Green', hex: '#22c55e', phase: 2, aliases: ['green', 'grin', 'grean', 'gren'] },
    { name: 'Orange', hex: '#FFA500', phase: 2, aliases: ['orange', 'ornge', 'orang', 'orng'] },
    { name: 'Purple', hex: '#a855f7', phase: 2, aliases: ['purple', 'purp', 'purpel', 'perple'] },
    // Phase 3: Neutrals/Common
    { name: 'Black', hex: '#1f2937', phase: 3, aliases: ['black', 'blak', 'bloc'] },
    { name: 'White', hex: '#f8fafc', phase: 3, aliases: ['white', 'wite', 'whit', 'wait'] },
    { name: 'Brown', hex: '#8B4513', phase: 3, aliases: ['brown', 'bron', 'brawn'] },
    { name: 'Pink', hex: '#FFC0CB', phase: 3, aliases: ['pink', 'pank', 'pinc'] },
    // Phase 4: Familiar Extended
    { name: 'Gold', hex: '#FFD700', phase: 4, aliases: ['gold', 'gould', 'goald'] },
    { name: 'Silver', hex: '#C0C0C0', phase: 4, aliases: ['silver', 'silber', 'silvr'] },
    { name: 'Coral', hex: '#FF7F50', phase: 4, aliases: ['coral', 'corral', 'corel'] },
    { name: 'Sky Blue', hex: '#87CEEB', phase: 4, aliases: ['sky blue', 'sky', 'skyblue', 'light blue'] },
    { name: 'Lime', hex: '#32CD32', phase: 4, aliases: ['lime', 'lyme', 'lim'] },
    { name: 'Peach', hex: '#FFDAB9', phase: 4, aliases: ['peach', 'peech', 'pech'] },
    // Phase 5: Nature Colors
    { name: 'Forest', hex: '#228B22', phase: 5, aliases: ['forest', 'forest green', 'forrest'] },
    { name: 'Navy', hex: '#000080', phase: 5, aliases: ['navy', 'navy blue', 'navey'] },
    { name: 'Turquoise', hex: '#40E0D0', phase: 5, aliases: ['turquoise', 'turkoise', 'turquois', 'turk'] },
    { name: 'Lavender', hex: '#E6E6FA', phase: 5, aliases: ['lavender', 'lavendar', 'lavander'] },
    { name: 'Cream', hex: '#FFFDD0', phase: 5, aliases: ['cream', 'creme', 'creem'] },
    { name: 'Olive', hex: '#808000', phase: 5, aliases: ['olive', 'oliv', 'olives'] },
    // Phase 6: Jewel Tones
    { name: 'Emerald', hex: '#50C878', phase: 6, aliases: ['emerald', 'emrald', 'emereld'] },
    { name: 'Crimson', hex: '#DC143C', phase: 6, aliases: ['crimson', 'crimsen', 'krimson'] },
    { name: 'Teal', hex: '#008080', phase: 6, aliases: ['teal', 'teel', 'teale'] },
    { name: 'Violet', hex: '#8A2BE2', phase: 6, aliases: ['violet', 'violit', 'vilet'] },
    { name: 'Royal Blue', hex: '#4169E1', phase: 6, aliases: ['royal blue', 'royal', 'royalblue'] },
    { name: 'Aqua', hex: '#00FFFF', phase: 6, aliases: ['aqua', 'aqua blue', 'akwa', 'agua'] },
    // Phase 7: Subtle/Advanced
    { name: 'Maroon', hex: '#800000', phase: 7, aliases: ['maroon', 'marune', 'marone'] },
    { name: 'Indigo', hex: '#4B0082', phase: 7, aliases: ['indigo', 'indago', 'indego'] },
    { name: 'Beige', hex: '#F5F5DC', phase: 7, aliases: ['beige', 'bayge', 'beig'] },
    { name: 'Chartreuse', hex: '#7FFF00', phase: 7, aliases: ['chartreuse', 'chartroose', 'shar truce'] },
    { name: 'Magenta', hex: '#FF00FF', phase: 7, aliases: ['magenta', 'magenda', 'majenta'] },
    { name: 'Slate', hex: '#708090', phase: 7, aliases: ['slate', 'slayt', 'slait'] },
    { name: 'Charcoal', hex: '#36454F', phase: 7, aliases: ['charcoal', 'charcol', 'charcoale'] },
    { name: 'Taupe', hex: '#483C32', phase: 7, aliases: ['taupe', 'tope', 'taup'] },
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
    // Parent keyboard override
    activeListenCallback: null, // Callback for current listening session
    activeListenColor: null,    // Current color being listened for
    activeListenIsAfterTeaching: false, // Whether this is after teaching
    // Profile creation
    pendingAvatarIndex: null, // Avatar index being created
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

    createProfile(avatarIndex, playerName) {
        const avatar = AVATARS[avatarIndex];
        const profile = {
            id: Date.now().toString(),
            name: playerName || 'Player',
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
            const heard = event.results[0][0].transcript.toLowerCase().trim();
            const confidence = event.results[0][0].confidence;
            const target = targetWord.toLowerCase();

            // Check against aliases if available
            const color = COLORS.find(c => c.name.toLowerCase() === target);
            const aliases = color?.aliases || [target];

            // Check if any alias matches what was heard
            const success = aliases.some(alias => {
                const aliasLower = alias.toLowerCase();
                // Direct match, contains, or fuzzy match
                return heard === aliasLower ||
                    heard.includes(aliasLower) ||
                    aliasLower.includes(heard) ||
                    this.fuzzyMatch(heard, aliasLower);
            });
            if (success) {
                console.log(`✅ [VoiceRecog] MATCH! Heard "${heard}" for target "${target}"`);
            } else {
                console.warn(`❌ [VoiceRecog] NO MATCH: Heard "${heard}" but expected one of: [${aliases.join(', ')}]`);
                console.warn(`   Consider adding "${heard}" to aliases if this was correct pronunciation`);
            }
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
            this.showMic(timeoutMs);
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

    countdownInterval: null,
    countdownStartTime: null,
    countdownDuration: null,

    showMic(durationMs) {
        const overlay = document.getElementById('mic-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Start countdown if duration provided
        if (durationMs) {
            this.startCountdown(durationMs);
        }
    },

    hideMic() {
        const overlay = document.getElementById('mic-overlay');
        if (overlay) overlay.classList.add('hidden');
        this.stopCountdown();
    },

    startCountdown(durationMs) {
        this.stopCountdown(); // Clear any existing

        const ring = document.getElementById('countdown-ring');
        if (!ring) return;

        const circumference = 2 * Math.PI * 45; // 283
        this.countdownStartTime = Date.now();
        this.countdownDuration = durationMs;

        // Reset ring
        ring.style.strokeDashoffset = '0';
        ring.classList.remove('warning', 'urgent');

        this.countdownInterval = setInterval(() => {
            const elapsed = Date.now() - this.countdownStartTime;
            const remaining = Math.max(0, this.countdownDuration - elapsed);
            const progress = remaining / this.countdownDuration;

            // Update ring position (depletes clockwise)
            const offset = circumference * (1 - progress);
            ring.style.strokeDashoffset = offset;

            // Update color based on remaining time
            ring.classList.remove('warning', 'urgent');
            if (progress < 0.25) {
                ring.classList.add('urgent');
            } else if (progress < 0.5) {
                ring.classList.add('warning');
            }

            // Stop when done
            if (remaining <= 0) {
                this.stopCountdown();
            }
        }, 50); // Update every 50ms for smooth animation
    },

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        // Reset ring appearance
        const ring = document.getElementById('countdown-ring');
        if (ring) {
            ring.style.strokeDashoffset = '0';
            ring.classList.remove('warning', 'urgent');
        }
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
                <span class="profile-name">${profile.name || 'Player'}</span>
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
            option.addEventListener('click', () => Game.selectAvatar(index));
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

    renderColorOrbs() {
        const container = document.getElementById('color-orbs-bg');
        if (!container) return;

        container.innerHTML = '';
        const sizes = ['size-sm', 'size-md', 'size-lg'];

        COLORS.forEach((color, index) => {
            const orb = document.createElement('div');
            orb.className = `color-orb ${sizes[index % 3]}`;
            orb.style.backgroundColor = color.hex;

            // Distribute orbs around the edges and scattered in background
            const angle = (index / COLORS.length) * Math.PI * 2;
            const radius = 30 + Math.random() * 40; // 30-70% from center
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;

            orb.style.left = `${Math.max(5, Math.min(95, x))}%`;
            orb.style.top = `${Math.max(5, Math.min(95, y))}%`;

            // Randomize animation timing for organic feel
            orb.style.animationDelay = `${-index * 0.5}s`;
            orb.style.animationDuration = `${15 + Math.random() * 10}s`;

            container.appendChild(orb);
        });

        // Add mouse parallax effect using CSS variables to avoid conflict with float animation
        // Mouse Parallax with Smooth Interpolation
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;

        document.addEventListener('mousemove', (e) => {
            if (state.currentScreen !== 'profiles') return;
            // Target is where the mouse wants to go
            targetX = (e.clientX / window.innerWidth - 0.5) * 60;
            targetY = (e.clientY / window.innerHeight - 0.5) * 60;
        });

        // Frame loop to smoothly interpolate towards the target
        const updateParallax = () => {
            if (state.currentScreen === 'profiles') {
                // Lerp: move 1.5% of the way towards target each frame
                // This creates a buttery smooth delay/drift effect
                currentX += (targetX - currentX) * 0.015;
                currentY += (targetY - currentY) * 0.015;

                const orbs = document.querySelectorAll('.color-orb');
                orbs.forEach((orb, i) => {
                    const depth = (i % 3) + 1;
                    const moveX = currentX * depth * -1;
                    const moveY = currentY * depth * -1;
                    orb.style.setProperty('--parallax-x', `${moveX}px`);
                    orb.style.setProperty('--parallax-y', `${moveY}px`);
                });
            }
            requestAnimationFrame(updateParallax);
        };
        requestAnimationFrame(updateParallax);
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
        UI.renderColorOrbs();
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

        // Name confirmation button
        document.getElementById('confirm-name-btn').addEventListener('click', () => {
            this.confirmProfile();
        });

        // Enter key on name input
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmProfile();
            }
        });

        // About modal
        const aboutLink = document.getElementById('about-link');
        const aboutModal = document.getElementById('about-modal');
        const aboutClose = document.getElementById('about-close');

        if (aboutLink && aboutModal) {
            aboutLink.addEventListener('click', (e) => {
                e.preventDefault();
                aboutModal.classList.remove('hidden');
            });

            aboutClose?.addEventListener('click', () => {
                aboutModal.classList.add('hidden');
            });

            // Close on overlay click (but not modal content)
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.add('hidden');
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) {
                    aboutModal.classList.add('hidden');
                }
            });
        }

        // Parent keyboard override for voice recognition
        // Y, 1, ArrowRight = Correct | N, 0, ArrowLeft = Incorrect
        document.addEventListener('keydown', (e) => {
            if (!state.activeListenCallback) return; // Not listening

            const key = e.key.toLowerCase();
            let isCorrect = null;

            if (key === 'y' || key === '1' || key === 'arrowright') {
                isCorrect = true;
            } else if (key === 'n' || key === '0' || key === 'arrowleft') {
                isCorrect = false;
            }

            if (isCorrect !== null) {
                e.preventDefault();
                console.log(`[KeyOverride] Parent pressed ${key} -> ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

                // Stop voice recognition
                VoiceRecognition.stop();
                AudioFeedback.micOff();

                // Capture and clear callback to prevent double-firing
                const callback = state.activeListenCallback;
                const color = state.activeListenColor;
                const isAfterTeaching = state.activeListenIsAfterTeaching;
                state.activeListenCallback = null;
                state.activeListenColor = null;

                // Handle result
                if (isCorrect) {
                    this.handleSuccess(color);
                } else {
                    this.handleFailure(color, isAfterTeaching);
                }
            }
        });
    },

    selectProfile(profileId) {
        state.currentProfile = Storage.getProfile(profileId);
        if (state.currentProfile) {
            UI.showScreen('idle');
        }
    },

    selectAvatar(avatarIndex) {
        state.pendingAvatarIndex = avatarIndex;
        const avatar = AVATARS[avatarIndex];

        // Update name screen with selected avatar
        document.getElementById('selected-avatar').textContent = avatar.emoji;
        document.getElementById('player-name-input').value = '';

        UI.showScreen('enter-name');

        // Focus the input
        setTimeout(() => {
            document.getElementById('player-name-input').focus();
        }, 300);
    },

    confirmProfile() {
        const nameInput = document.getElementById('player-name-input');
        const playerName = nameInput.value.trim() || 'Player';

        const profile = Storage.createProfile(state.pendingAvatarIndex, playerName);
        state.currentProfile = profile;
        state.pendingAvatarIndex = null;

        UI.renderProfiles();
        UI.showScreen('idle');
    },

    createProfile(avatarIndex) {
        // Legacy method - now goes through two-step flow
        this.selectAvatar(avatarIndex);
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

        // Show and start session progress
        this.showSessionProgress();
        this.startSessionProgressTimer();

        // Update streak
        this.updateStreak();

        // Greet player by name
        const playerName = state.currentProfile.name || 'friend';
        Speech.speak(`Hi ${playerName}! Let's learn colors!`, () => {
            // Check if onboarding needed
            if (!state.currentProfile.isOnboarded) {
                this.runOnboarding();
            } else {
                this.nextTurn();
            }
        });
    },

    sessionProgressInterval: null,

    showSessionProgress() {
        const el = document.getElementById('session-progress');
        if (el) el.classList.remove('hidden');
    },

    hideSessionProgress() {
        const el = document.getElementById('session-progress');
        if (el) el.classList.add('hidden');
        if (this.sessionProgressInterval) {
            clearInterval(this.sessionProgressInterval);
            this.sessionProgressInterval = null;
        }
    },

    startSessionProgressTimer() {
        // Update immediately
        this.updateSessionProgress();

        // Update every second
        this.sessionProgressInterval = setInterval(() => {
            this.updateSessionProgress();
        }, 1000);
    },

    updateSessionProgress() {
        const elapsed = Date.now() - state.sessionStartTime;
        const remaining = Math.max(0, CONFIG.sessionDurationMs - elapsed);
        const progress = remaining / CONFIG.sessionDurationMs;

        // Update progress bar
        const fill = document.getElementById('session-progress-fill');
        if (fill) {
            fill.style.width = `${progress * 100}%`;
            fill.classList.remove('warning', 'urgent');
            if (progress < 0.2) {
                fill.classList.add('urgent');
            } else if (progress < 0.4) {
                fill.classList.add('warning');
            }
        }

        // Update turn counter
        const turnEl = document.getElementById('turn-count');
        if (turnEl) {
            turnEl.textContent = state.turnId;
        }

        // Update time remaining
        const timeEl = document.getElementById('time-remaining');
        if (timeEl) {
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
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

        // Store for parent keyboard override
        state.activeListenColor = color;
        state.activeListenIsAfterTeaching = isAfterTeaching;

        const currentTurnId = state.turnId; // Capture turn ID

        const handleResult = (result) => {
            if (state.turnId !== currentTurnId) return; // Stale, ignore
            state.activeListenCallback = null; // Clear callback
            if (result.success) {
                this.handleSuccess(color);
            } else {
                this.handleFailure(color, isAfterTeaching);
            }
        };

        state.activeListenCallback = handleResult;
        VoiceRecognition.listen(color.name, timeoutMs, handleResult, currentTurnId);
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

        // Hide session progress bar
        this.hideSessionProgress();

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
