/**
 * Phase-specific tips and guidance text.
 * Shown in the Phase Guide panel, auto-updating with each phase change.
 */

export interface PhaseTip {
  phase: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
  ruleRef: string;
}

export const PHASE_TIPS: Record<string, PhaseTip> = {
  setup: {
    phase: 'setup', title: 'Scenario Setup',
    summary: 'Set up the scenario before play begins. Deploy ground units, plan raids, and position flights.',
    steps: [
      'Review the scenario conditions (weather, detection levels, front line).',
      'Set up ground units (SAMs, AAA, EWR, Army units) per scenario instructions.',
      'Plan your raid: choose targets, plot flight paths with waypoints.',
      'Load ordnance on Bombing/SEAD flights.',
      'Deploy flights at their starting positions.',
    ],
    tips: [
      'Study the enemy SAM coverage before planning your flight path.',
      'Place rally points near urban hexes or rivers for the +8 disorder recovery bonus.',
      'Consider terrain masking — flying at Deck through rough/mountain hexes breaks SAM acquisition.',
    ],
    ruleRef: '31.0',
  },
  randomEvent: {
    phase: 'randomEvent', title: 'Random Event Phase',
    summary: 'Roll 2d10 to check for random events that may affect the scenario. No event on Turn 1.',
    steps: [
      'Roll 2d10 and check the Random Events Table.',
      'Most rolls (8-17) produce no event.',
      'Apply any event effects immediately.',
    ],
    tips: [
      'Some scenarios ignore certain random events (check SSRs).',
      'QRA events can bring reinforcements — be prepared for unexpected flights.',
    ],
    ruleRef: '21.0',
  },
  jamming: {
    phase: 'jamming', title: 'Jamming Phase',
    summary: 'Place or adjust Standoff and Spot Jamming markers. Roll for Early Warning Jamming.',
    steps: [
      'Place Standoff Jamming markers on eligible jamming flights (Medium+ altitude).',
      'Point the jammer arrow toward enemy radars you want to jam.',
      'Place Spot Jamming markers on specific radar units for doubled effectiveness.',
      'Roll for Early Warning Jamming (1d10 per EW Jammer aircraft, 6+ = reduce enemy detection).',
    ],
    tips: [
      'Standoff Jamming arcs are 60° — position your jammer to cover the most threats.',
      'Spot Jamming doubles the effect but requires the target radar to be in the jammer arc.',
      'Jamming is capped at 6 (3 for Patriot/SA-12 phased array radars).',
      'A jammer that turns or takes damage loses its Standoff Jamming marker.',
    ],
    ruleRef: '19.0',
  },
  detection: {
    phase: 'detection', title: 'Detection Phase',
    summary: 'Roll to detect undetected enemy flights using standard, visual, radar, and EWR detection.',
    steps: [
      'Roll 2d10 for each undetected enemy flight on the Detection Table.',
      'Make visual detection attempts for enemies within 4 hexes with LOS.',
      'Make radar search attempts for enemies in forward arc of radar-equipped flights.',
      'Make EWR detection attempts for enemies within 20 hexes (10 at Deck).',
    ],
    tips: [
      'Flights at Deck altitude are very hard to detect (-4 modifier).',
      'Rough terrain at Deck adds another -2; Mountains add -3.',
      'Radar search requires the target in your forward arc — heading matters!',
      'Lookdown restrictions prevent some radars from seeing lower targets.',
    ],
    ruleRef: '10.0',
  },
  movement: {
    phase: 'movement', title: 'Movement Phase',
    summary: 'Draw initiative chits and move flights. During movement, engage in combat and face AAA/SAM fire.',
    steps: [
      'Roll for initiative (1d10: 1-6 NATO, 7+ WP).',
      'Draw chits alternately — each chit value = number of flights to move.',
      'For each flight: set throttle (Combat/Dash), announce speed, spend MPs.',
      'Each MP: move a hex, turn, climb, or dive.',
      'After each MP: enemy may fire AAA and SAMs, then you may engage in combat.',
    ],
    tips: [
      'Combat throttle gives max speed or one less. Dash gives speed between combat and dash max.',
      'Free turns are allowed when entering a hex — check the Turn Table for limits by speed.',
      'Climbing twice in a turn = Zoom Climb (costs 2 MP, combat penalties).',
      'Flights at Deck in Mountain hexes lose SAM acquisition — use terrain masking!',
      'Stacking: you cannot end movement in the same hex/altitude as a friendly flight.',
    ],
    ruleRef: '6.0',
  },
  fuel: {
    phase: 'fuel', title: 'Fuel Phase',
    summary: 'Mark fuel usage for flights that used Dash throttle or engaged in Standard combat.',
    steps: [
      'Check off one fuel box for each flight that used Dash throttle.',
      'Check off one fuel box for each flight that engaged in Standard air-to-air combat.',
      'A flight can use both Dash and combat in one turn (2 fuel boxes).',
      'Recover any flights that have landed or left the map.',
    ],
    tips: [
      'Watch your fuel carefully — exceeding the allowance means rolling for fuel exhaustion.',
      'Dash throttle is powerful but expensive. Use Combat throttle when you can.',
    ],
    ruleRef: '20.0',
  },
  samLocation: {
    phase: 'samLocation', title: 'SAM Location Phase',
    summary: 'Attempt to locate unlocated SAMs marked with SAM Warning markers.',
    steps: [
      'For each SAM Warning marker within RWR range of a friendly flight with LOS:',
      'Roll 1d10. Need 10+ (with modifiers) to locate.',
      'Located SAMs are revealed — replace the Warning marker with the actual SAM counter.',
    ],
    tips: [
      'A SAM that has fired (Launch marker) is easier to locate (+5 hex range).',
      'Knowing what type of SAM you face helps plan your SEAD approach.',
      'RWR rating from the ADC determines your detection range.',
    ],
    ruleRef: '15.13',
  },
  track: {
    phase: 'track', title: 'Track Phase',
    summary: 'Roll to determine if detected enemy flights become undetected.',
    steps: [
      'Auto-undetect: NATO flights at Deck in Rough; any flight at Deck in/near Mountain; helicopters at Deck.',
      'Roll 2d10 on Track Table for each side\'s detection level.',
      'Matching suit symbols (Heart/Spade/Diamond) become undetected.',
    ],
    tips: [
      'Better detection levels make it harder for enemies to escape tracking.',
      'Flying at Deck through rough/mountain terrain is the best way to break radar contact.',
      'Chaff corridors also affect tracking.',
    ],
    ruleRef: '10.3',
  },
  samAcquisition: {
    phase: 'samAcquisition', title: 'SAM Acquisition Phase',
    summary: 'SAM units attempt to acquire or maintain acquisition on enemy flights.',
    steps: [
      'Each SAM may attempt one acquisition (phased array: two).',
      'Roll 2d10 on the SAM Acquisition Table.',
      'Results: No Acquisition, Partial Acquisition, or Full Acquisition.',
      'Quick acquisition: switch radar on and acquire in same phase (with penalty).',
      'Resolve preemptive ARM attacks.',
    ],
    tips: [
      'Full acquisition gives much better SAM attack accuracy than partial.',
      'Anti-Radar Tactics (-3 modifier) can disrupt SAM tracking.',
      'Defensive jamming and standoff jamming degrade acquisition attempts.',
      'Terrain masking at Deck in rough/mountain removes acquisition.',
    ],
    ruleRef: '15.21',
  },
  admin: {
    phase: 'admin', title: 'Admin Phase',
    summary: 'Housekeeping: recover from disorder, split flights, switch radars, and manage airfield operations.',
    steps: [
      'Roll for Disorder recovery (2d10 + Aggression, need 20+; +8 at Rally Point).',
      'Split flights with Crippled aircraft.',
      'Remove Shutdown markers (roll 1d10, 5+ to remove).',
      'Switch Radar AAA and SAM radars on or off.',
      'Remove SAM Launch, Zoom Climb, Anti-Radar Tactics markers.',
      'Generate dummy flights from undetected generic flights.',
      'Manage airfield operations (Ready/Unready/Revetted).',
      'Roll for AAA suppression recovery.',
    ],
    tips: [
      'Rally Points give +8 to disorder recovery — plan your rally points carefully during setup.',
      'Splitting a crippled flight lets the healthy aircraft continue the mission.',
      'Consider switching SAM radars off to avoid ARM attacks, then back on later.',
    ],
    ruleRef: '3.2',
  },
  completed: {
    phase: 'completed', title: 'Scenario Complete',
    summary: 'The scenario has ended. Roll for recovery and assess victory points.',
    steps: [
      'Roll for recovery of all remaining on-map flights.',
      'Roll for BDA (Bomb Damage Assessment) on unassessed ground targets.',
      'Calculate victory points for both sides.',
      'Compare VP totals to determine victory level.',
    ],
    tips: [
      'Damaged/Crippled aircraft have penalties on recovery rolls.',
      'Flights that exited the wrong map edge also have recovery penalties.',
    ],
    ruleRef: '3.4',
  },
};
