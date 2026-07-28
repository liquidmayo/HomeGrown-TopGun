# Red Storm Digital

A digital player-vs-AI implementation of GMT Games' **Red Storm** — a tactical air combat wargame set over central Germany during a hypothetical 1987 NATO vs. Warsaw Pact conflict.

## Features

- **Complete rules engine** covering all 34 rule sections from the 54-page rulebook
- **Player vs AI** using the Full Solitaire Play bot rules (section 33.0)
- **14 playable scenarios**: RS1 (introductory) + RS2-RS10 (standard) + 4 solo scenarios
- **Interactive hex map** with terrain, airfields, unit counters, and movement highlighting
- **Step-by-step combat resolution** for air-to-air, AAA, SAM, and air-to-ground attacks
- **Initiative chit draw** and interactive movement phase
- **Detection, tracking, SAM acquisition**, and electronic countermeasures systems
- **In-app tutorial system** with 5 guided walkthroughs and searchable rule reference
- **Save/load** and **undo** functionality
- **332 automated tests** across 17 test files

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Install

```bash
git clone https://github.com/liquidmayo/HomeGrown-TopGun.git
cd HomeGrown-TopGun
npm install
```

### Run

```bash
# Terminal 1: Start the dev server
npm run dev:renderer

# Terminal 2: Build and launch the app
npm run build:main
npm run start
```

Or use the combined command:

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## How to Play

1. Launch the app
2. Click **"New Game"** in the toolbar
3. Select a scenario (start with **RS1: Morning Recon** to learn the basics)
4. Follow the **Phase Guide** in the right sidebar — it explains what to do in each phase
5. Use **"Next Phase"** at the bottom to advance through the turn sequence

### Tutorials

Click **"Start a Tutorial"** on the welcome screen to access 5 guided walkthroughs:

1. **Movement Basics** — hex navigation, altitude, throttle, turning
2. **Detection & SAMs** — detection methods, SAM acquisition, terrain masking
3. **Air-to-Air Combat** — engagement, maneuver, shots, morale
4. **Bombing** — raid planning, bomb runs, attack profiles
5. **Full Solo Game** — playing against the AI bot

### Scenarios

| ID | Name | Type | Description |
|----|------|------|-------------|
| RS1 | Morning Recon | Intro | Learn setup, movement, SAM acquisition, and combat |
| RS2 | Operation Boloski | Standard | Intercept a mass WP fighter sweep |
| RS3 | First Strike | Standard | Defend against WP ground attack wave |
| RS4 | Opening Rounds | Standard | Protect NATO airfields from WP strikes |
| RS5 | Vertical Envelopment | Standard | Stop WP helicopter air assault |
| RS6 | Sanitized Corridors | Standard | Defend HAWK belt from WP SEAD |
| RS7 | Aerial Blockade | Standard | Air superiority battle over the front |
| RS8 | Runway Busting | Standard | NATO deep strike on WP airfields |
| RS9 | Nighthawks | Standard | Night strike mission |
| RS10 | Frontal Aviation | Standard | Intercept massive WP CAS effort |
| Solo A | CAS | Solo | NATO close air support vs WP armor |
| Solo B | Fighter Sweep | Solo | WP fighter sweep (play as WP) |
| Solo C | HAWK Belt | Solo | WP SEAD vs NATO HAWKs (play as WP) |
| Solo D | Interdiction | Solo | NATO deep strike vs WP rear area |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron |
| Language | TypeScript |
| UI | React |
| Map Rendering | HTML5 Canvas 2D |
| State Management | Zustand |
| Testing | Vitest |
| Build | Vite + electron-builder |

## Project Structure

```
src/
  main/           # Electron main process
  renderer/       # React UI (components, stores)
  engine/         # Pure rules engine (no UI dependencies)
    state/        # Game state types
    rules/        # One module per rule section
    controller/   # Phase state machine, undo
  ai/             # FSP bot controller and decision tables
  data/           # Aircraft, weapons, SAMs, scenarios, map
  tutorial/       # Tutorial content and tips
tests/            # 332 automated tests
```

## Credits

- **Red Storm** board game designed by Lee Brimmicombe-Wood, published by [GMT Games](https://www.gmtgames.com/)
- Digital implementation built with [Claude Code](https://claude.ai/code)

## License

This is a fan-made digital adaptation for personal use. Red Storm is copyright GMT Games, LLC.
