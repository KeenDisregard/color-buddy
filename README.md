# Color Buddy 🎨

**Speak the color, build the memory.** Master 36 colors through voice-activated play backed by proven learning science.

🎮 **[Play Now →](https://keendisregard.github.io/color-buddy/)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## What is Color Buddy?

Color Buddy is a voice-powered learning game that helps players of all ages master color recognition through **active retrieval practice**. Instead of passively viewing flashcards, you speak the color name aloud—engaging your brain in the deepest form of learning.

The game adapts to each player using a **spaced repetition system (SRS)**, showing colors you're still learning more often while spacing out colors you've mastered. Start with primary colors, then unlock 36 total colors across 7 difficulty phases as you progress.

## Features

✨ **Voice-Activated Learning** — Speak color names aloud for active retrieval practice  
🧠 **Spaced Repetition (SRS)** — Optimal timing for maximum memory retention  
📈 **Progressive Difficulty** — 7 phases from primary colors to jewel tones  
👨‍👩‍👧‍👦 **Multi-Profile Support** — Up to 4 players with individual progress  
🔥 **Streak Tracking** — Stay motivated with daily streaks  
⌨️ **Keyboard Override** — Parents can use Y/N keys to correct voice recognition errors  
🎵 **Audio Feedback** — Gentle chimes indicate when the microphone is listening  

## The Science Behind It

Color Buddy is built on decades of cognitive science research:

- **Active Retrieval** — Speaking forces your brain to *retrieve* information, dramatically improving long-term retention ([the testing effect](https://en.wikipedia.org/wiki/Testing_effect))
- **Spaced Repetition** — Review at optimal intervals, just before you forget
- **Progressive Difficulty** — Build on solid foundations
- **Instant Feedback** — Celebrate wins, learn from misses without shame

Inspired by research from cognitive scientists like Robert Bjork and Piotr Wozniak, and educators like [Justin Skycak](https://x.com/justinskycak).

## Getting Started

### Play Online

Visit **https://keendisregard.github.io/color-buddy/** — no installation needed!

### Run Locally

```bash
# Clone the repository
git clone https://github.com/KeenDisregard/color-buddy.git
cd color-buddy

# Start the development server
npm start
# or
npx http-server -p 8080
```

Open http://localhost:8080 in your browser.

## Known Limitations

### Browser Compatibility
- **Voice recognition requires Chrome, Edge, or Safari** — The Web Speech API is not supported in Firefox
- Best experience on Chrome desktop; mobile support varies by device

### Voice Recognition
- **Accuracy varies by microphone quality and ambient noise** — The game includes keyboard override (Y/N keys) for parents to manually correct recognition errors
- **Some color names may be misheard** — Common mispronunciations are aliased (e.g., "yella" → "yellow"), but the system isn't perfect
- **Brief delay after speaking before mic activates** — Prevents picking up the app's own TTS output

### Platform
- **Desktop-first design** — Mobile works but the experience is optimized for tablet/desktop screens
- **Requires HTTPS** — Microphone access requires a secure context (GitHub Pages provides this; localhost works in development)

### Data Storage
- **Progress stored in browser localStorage** — Clearing browser data will reset all profiles and progress
- **No cloud sync** — Each device maintains its own profiles

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Y` / `1` / `→` | Mark answer as correct |
| `N` / `0` / `←` | Mark answer as incorrect |
| `Escape` | Close "How it works" modal |

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks)
- Web Speech API for voice recognition and TTS
- Local Storage for persistence
- GitHub Pages for hosting

## Contributing

Contributions are welcome! Feel free to open an issue or submit a PR.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Made with ❤️ by [Evan Driscoll](https://x.com/KeenDisregard)
