# prompt from human

sketch a simple voice recognition enabled memory / learning game state machine where even an illiterate child can learn standard color names by seeing them on the screen, having the color displayed on screen with the name of it, and the name of it spoken by the computer. in turns, the player is to recall the name of the color. there is some kind of on-ramp of difficulty, spaced repetition, and so forth, such that a child can progress through becoming very proficient with color sense and naming over days and weeks of playing 5 to 10 minute sessions

# response from Gemini 3 Pro

This sketch outlines a state machine designed for a young, illiterate child. The fundamental design philosophy is **"Show, Don't Tell"** and **"Audio-First Interface."**

The system relies on a hidden "Backend Brain" (the Spaced Repetition System - SRS) that tracks which colors the child knows, which are currently being learned, and when they need to be reviewed.

Here is the sketch of the state machine, followed by an explanation of its components.

### The "Color Buddy" State Machine

```mermaid
stateDiagram-v2
    direction TB

    %% --- Initial State ---
    [*] --> IDLE : Power On/App Start

    state "IDLE STATE\n(Attract Mode)" as IDLE {
        note right of IDLE
            Visual: Big, pulsing "Play" icon (e.g., a smiling sun).
            Audio: Occasional inviting giggle or music.
            Action: Waiting for a tap anywhere.
        end note
    }

    IDLE --> SESSION_CHECK : User Taps Screen

    %% --- The Backend "Brain" Check ---
    state "SESSION / SRS CHECK\n(Internal Logic)" as SESSION_CHECK {
        note left of SESSION_CHECK
            Logic:
            1. Is session time > 10 mins? If yes -> END_SUMMARY.
            2. Check SRS DB: Are any "due" for review?
            3. If none due, pick next new color on the "on-ramp."
        end note
    }

    SESSION_CHECK --> END_SUMMARY : Time Limit Reached
    SESSION_CHECK --> TEACH_NEW : Logic determines a New Color is needed
    SESSION_CHECK --> TEST_EXISTING : Logic picks a Review Color

    %% --- Branch A: Teaching a New Color ---
    state "TEACH NEW COLOR\n(Presentation)" as TEACH_NEW {
        note right of TEACH_NEW
            Visual: Screen fills with the color. Large word appears (passive exposure). Mascot points.
            Audio: "Look! This is [COLOR NAME]." (Pause) "[COLOR NAME]."
        end note
    }
    TEACH_NEW --> LISTENING : Immediate reinforcement

    %% --- Branch B: Testing an Existing Color ---
    state "TEST EXISTING COLOR\n(Recall)" as TEST_EXISTING {
        note right of TEST_EXISTING
            Visual: Screen fills with the color. Mascot looks inquisitive with hand to ear.
            Audio: "Do you remember what color this is?"
        end note
    }
    TEST_EXISTING --> LISTENING : Transition to mic input

    %% --- The Core Interaction ---
    state "LISTENING STATE\n(Voice Activity Detection)" as LISTENING {
        note left of LISTENING
            Visual: Microphone icon glows/animates. Mascot waits eagerly.
            Technical: Listening for ~4 seconds for keywords.
        end note
    }

    LISTENING --> EVALUATE : Speech Detected OR Timeout

    state "EVALUATE INPUT\n(Internal Logic)" as EVALUATE {
         note right of EVALUATE
            Comparing detected speech to target keyword.
            (Very forgiving fuzzy matching used).
        end note
    }

    EVALUATE --> SUCCESS_FEEDBACK : Match Detected
    EVALUATE --> CORRECTION_FEEDBACK : No Match / Timeout / Wrong Match

    %% --- Feedback Loops ---
    state "SUCCESS FEEDBACK\n(Positive Reinforcement)" as SUCCESS_FEEDBACK {
        note left of SUCCESS_FEEDBACK
            Visual: Confetti, happy mascot animation.
            Audio: Enthusiastic "Yeah! It's [COLOR NAME]!"
            ACTION: Update SRS DB (increase interval).
        end note
    }
    SUCCESS_FEEDBACK --> SESSION_CHECK : Next Turn

    state "CORRECTION FEEDBACK\n(Gentle Guidance)" as CORRECTION_FEEDBACK {
        note right of CORRECTION_FEEDBACK
            Visual: Mascot looks encouraging, not sad. The color name text pulses.
            Audio: Gentle tone. "That was a good try! But this color is [COLOR NAME]. Can you say [COLOR NAME]?"
            ACTION: Update SRS DB (decrease interval / mark as 'problem').
        end note
    }
    %% Crucial: After correction, give them a chance to parrot it back immediately.
    CORRECTION_FEEDBACK --> LISTENING : Immediate Retry (Parroting)


    %% --- End of Session ---
    state "END SESSION SUMMARY\n(Positive Closure)" as END_SUMMARY {
        note right of END_SUMMARY
            Visual: Screen fills with all colors learned today. Lots of stars.
            Audio: "Wow! You played great today! See you soon!"
            Action: Game saves and closes/sleeps after 10 seconds.
        end note
    }
    END_SUMMARY --> IDLE : Timeout
```

-----

### Detailed Component Explanation

#### 1\. The Target Audience Constraints (Illiterate Child)

  * **No Written Menus:** The game starts with a single tap on a giant friendly icon in the `IDLE` state.
  * **Visual Cues for State:** The child always knows what is happening based on the on-screen character (the "Mascot").
      * Mascot pointing at color = "Listen to me." (`TEACH_NEW`)
      * Mascot hand cupped to ear = "Your turn to speak." (`LISTENING`)
      * Mascot dancing = "You got it right\!" (`SUCCESS_FEEDBACK`)
  * **Passive Text Exposure:** Even though they can't read, the text name of the color is always displayed prominently when the color is shown. Over weeks of play, this facilitates implicit sight-word recognition.

#### 2\. The "Backend Brain" (SRS and Logic)

This is represented by the `SESSION / SRS CHECK` state and the `EVALUATE` state. It is invisible to the user but drives the entire experience.

  * **The On-Ramp (Difficulty Progression):** The database contains an ordered list of colors.

      * *Level 1:* Red, Blue, Yellow (distinct primary colors).
      * *Level 2:* Green, Orange, Purple (secondary colors).
      * *Level 3:* Black, White, Brown, Pink (neutrals/common).
      * *Level 4:* Gray, Turquoise, Magenta, etc. (complex/subtle distinctions).
      * *Rule:* The system will not introduce a Level 2 color until the child has achieved a "Mastered" status on all Level 1 colors in the SRS database.

  * **Spaced Repetition (SRS):** Every time a child sees a color, the result is tracked.

      * If they get "Red" right, the system waits longer before showing it again (e.g., 1 day -\> 3 days -\> 1 week).
      * If they get "Red" wrong, the system shows it again very soon (e.g., within the same 5-minute session).

#### 3\. The Core Loop Dynamics

**The Path for a New Color:**
When the SRS decides it's time to introduce "Blue":

1.  `SESSION_CHECK` routes to `TEACH_NEW`.
2.  The game announces: "Look\! This is Blue."
3.  It immediately transitions to `LISTENING` to ensure they were paying attention. "Can you say Blue?"

**The Path for Reviewing a Color:**
When the SRS decides "Red" is due for review:

1.  `SESSION_CHECK` routes to `TEST_EXISTING`.
2.  The game just shows red and asks: "What color is this?" (Skipping the teaching preamble).

**The Correction Loop (Crucial for learning):**
If the child gets it wrong or says nothing in the `CORRECTION_FEEDBACK` state:

1.  The game gently provides the answer: "Actually, this is Green."
2.  *Vital Step:* It does not go back to the main menu loop. It transitions *back* to the `LISTENING` state immediately.
3.  It asks, "Can you say Green?" This forces the child to vocalize the correct answer immediately after hearing it, solidifying the memory trace before moving on to the next color.
