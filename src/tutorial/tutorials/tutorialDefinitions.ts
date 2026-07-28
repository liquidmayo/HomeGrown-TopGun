/**
 * Interactive tutorial walkthrough definitions.
 * Each tutorial is a sequence of steps guiding the player through game concepts.
 */

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  highlightElement?: string;   // CSS selector or hex coordinate to highlight
  ruleRef?: string;
  waitForAction?: string;      // Action type to wait for before auto-advancing
}

export interface TutorialDef {
  id: string;
  name: string;
  description: string;
  scenarioId: string;
  steps: TutorialStep[];
}

export const TUTORIALS: TutorialDef[] = [
  {
    id: 'tut-movement',
    name: 'Tutorial 1: Movement Basics',
    description: 'Learn hex grid navigation, flight movement, turning, climbing, and diving.',
    scenarioId: 'rs01',
    steps: [
      { id: 'm1', title: 'Welcome', text: 'This tutorial covers the basics of flight movement in Red Storm. You\'ll learn how to move flights across the hex grid map.' },
      { id: 'm2', title: 'The Hex Grid', text: 'The map is divided into hexagonal cells. Each hex has a 4-digit coordinate (e.g., 5126). Flights move from hex to hex by spending Movement Points (MP).', ruleRef: '2.21' },
      { id: 'm3', title: 'Altitude Bands', text: 'Flights operate at five altitude bands: Deck (lowest), Low, Medium, High, and Very High. Different altitudes affect detection, combat, and SAM engagement.', ruleRef: '6.13' },
      { id: 'm4', title: 'Throttle Settings', text: 'Each turn, choose Combat or Dash throttle. Combat gives max speed or one less. Dash gives more speed but costs fuel. Crippled aircraft cannot use Dash.', ruleRef: '6.2' },
      { id: 'm5', title: 'Movement Points', text: 'Your speed = total MP for the turn. Each MP lets you: move one hex forward, turn, climb one altitude band, or dive to any lower band.', ruleRef: '6.31' },
      { id: 'm6', title: 'Free Turns', text: 'When entering a hex, climbing, or diving, you get a free turn based on speed. Speed 1-2: 90°. Speed 3-4: 60°. Speed 5-8: 30°. Speed 9+: 0°.', ruleRef: '6.32' },
      { id: 'm7', title: 'Stacking', text: 'You cannot end your movement in the same hex and altitude as a friendly flight. Enemy stacking is always allowed.', ruleRef: '6.4' },
      { id: 'm8', title: 'Mountain Terrain', text: 'Flights at Deck altitude cannot enter Mountain hexes (unless they have Terrain Following Radar). This restricts low-altitude routes.', ruleRef: '6.34' },
      { id: 'm9', title: 'Practice', text: 'Try moving the NATO CAP flight. Click "Next Phase" to reach the Movement Phase, then roll initiative and move your flight.' },
    ],
  },
  {
    id: 'tut-detection',
    name: 'Tutorial 2: Detection & SAMs',
    description: 'Learn how flights are detected and how SAM systems work.',
    scenarioId: 'rs01',
    steps: [
      { id: 'd1', title: 'Detection', text: 'Flights start undetected. Each Detection Phase, roll to detect enemy flights. Higher altitude = easier to detect. Deck altitude is hardest (-4 modifier).', ruleRef: '10.0' },
      { id: 'd2', title: 'Detection Methods', text: 'Four ways to detect: Standard (all flights), Visual (within 4 hexes with LOS), Radar Search (forward arc, radar-equipped), and EWR (within 20 hexes).', ruleRef: '10.2' },
      { id: 'd3', title: 'SAM Acquisition', text: 'SAMs must acquire targets before firing. Acquisition levels: None → Partial → Full. Full acquisition gives much better attack accuracy.', ruleRef: '15.21' },
      { id: 'd4', title: 'Terrain Masking', text: 'Flying at Deck through Rough or Mountain terrain breaks SAM acquisition. This is your best defense against SAMs!', ruleRef: '15.25' },
      { id: 'd5', title: 'SAM Attack', text: 'When a SAM fires: Attack Table (hit/miss) → Defense Table (damage/avoidance/miss) → Damage Table. Max 2 SAM attacks per flight per turn.', ruleRef: '15.3' },
      { id: 'd6', title: 'Practice', text: 'Advance to the Detection Phase and try to detect the WP recon flight. Then watch SAM acquisition attempts in the SAM Acquisition Phase.' },
    ],
  },
  {
    id: 'tut-combat',
    name: 'Tutorial 3: Air-to-Air Combat',
    description: 'Learn engagement, maneuver, and shot resolution in dogfights and BVR.',
    scenarioId: 'rs01',
    steps: [
      { id: 'c1', title: 'Combat Types', text: 'Two types: Standard (dogfight, close range) and BVR (beyond visual range, long range). Standard requires being within 1 hex. BVR requires a BVR-capable weapon.', ruleRef: '11.0' },
      { id: 'c2', title: 'Engagement', text: 'To start combat, roll to engage. Attacker and defender roll separately. Results: Attacker Surprise (best), Mutual, Defender Initiates, or No Engagement.', ruleRef: '11.22' },
      { id: 'c3', title: 'Surprise', text: 'If the attacker achieves Surprise: +3 maneuver bonus. The defender is Disadvantaged: -3 maneuver, cannot jettison ordnance before combat.', ruleRef: '11.25' },
      { id: 'c4', title: 'Maneuver', text: 'Both sides roll 2d10 + maneuver rating (from ADC). The result gives shot opportunities (0-3+). More undamaged aircraft = more potential shots.', ruleRef: '11.31' },
      { id: 'c5', title: 'Shots', text: 'Each shot: 2d10 + weapon combat value. Higher rolls = worse damage. Having additional weapon types gives +1.', ruleRef: '11.33' },
      { id: 'c6', title: 'After Combat', text: 'Both flights: Morale Check → Scatter (random hex displacement) → Place Maneuver markers → Become undetected. Then check for ammo depletion.', ruleRef: '13.0' },
    ],
  },
  {
    id: 'tut-bombing',
    name: 'Tutorial 4: Bombing',
    description: 'Learn raid planning, bomb runs, and air-to-ground attacks.',
    scenarioId: 'rs-solo-a',
    steps: [
      { id: 'b1', title: 'Raid Planning', text: 'Bombing flights follow plotted flight paths: Ingress → Release Point → Target → Rejoin → Egress. Other tasks (CAP, SEAD) move freely.', ruleRef: '8.0' },
      { id: 'b2', title: 'Bomb Run', text: 'To attack: start a Bomb Run at the Initial Point (IP), fly straight to the target without turning. After AAA/SAM fire resolves, roll the attack.', ruleRef: '17.2' },
      { id: 'b3', title: 'Attack Profiles', text: '9 profiles: Dive Bombing (+1, visual), Level Bombing (0, visual), Radar Bombing (-2, blind), Toss (-4, blind), LGB (+4), EOGM (+3), EOGB (+5), Strafe (-1), ARM.', ruleRef: '17.3' },
      { id: 'b4', title: 'Target Profiles', text: 'Targets rated A (hardest, -4) to D (softest, +2). Profile A: bunkers, HAS. B: armor, revetments. C: artillery, SAM launchers. D: HQ, supply, EWR.', ruleRef: '17.13' },
      { id: 'b5', title: 'Ordnance', text: 'Laden flights use worse speed and maneuver values. Jettison ordnance at any time to become "clean". Damaged aircraft auto-jettison.', ruleRef: '16.2' },
    ],
  },
  {
    id: 'tut-full',
    name: 'Tutorial 5: Full Solo Game',
    description: 'Play a complete solo scenario against the bot AI with all systems active.',
    scenarioId: 'rs-solo-a',
    steps: [
      { id: 'f1', title: 'Solo Play', text: 'In solo scenarios, you play one side while the bot controls the other. The bot uses decision tables to move flights, fire SAMs, and activate AAA.', ruleRef: '33.0' },
      { id: 'f2', title: 'Bot Flights', text: 'Bot flights start as generic counters. They activate into real aircraft when triggered by proximity. Bot movement follows priority rules.', ruleRef: '33.3' },
      { id: 'f3', title: 'Bot SAMs', text: 'SAM Warning markers activate probabilistically. Activated SAMs acquire and fire automatically based on priority tables.', ruleRef: '33.4' },
      { id: 'f4', title: 'Victory', text: 'Score VP for enemy aircraft shot down, ground targets damaged/destroyed, and crew captured. Compare totals for victory level.', ruleRef: '32.0' },
      { id: 'f5', title: 'Good Luck!', text: 'You\'re ready to play. Start Solo Scenario A (CAS) and put your air combat skills to the test!' },
    ],
  },
];

export function getTutorial(id: string): TutorialDef | undefined {
  return TUTORIALS.find((t) => t.id === id);
}
