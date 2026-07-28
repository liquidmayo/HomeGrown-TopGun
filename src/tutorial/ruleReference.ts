/**
 * Searchable rule reference organized by section number.
 */

export interface RuleEntry {
  section: string;
  title: string;
  summary: string;
  keywords: string[];
}

export const RULE_ENTRIES: RuleEntry[] = [
  { section: '1.0', title: 'Introduction', summary: 'Red Storm simulates air warfare over central Germany in 1987.', keywords: ['introduction', 'overview'] },
  { section: '3.2', title: 'Sequence of Play', summary: 'Each turn: Random Event → Jamming → Detection → Movement → Fuel → SAM Location → Track → SAM Acquisition → Admin.', keywords: ['sequence', 'phases', 'turn'] },
  { section: '4.0', title: 'Air Units', summary: 'Flights of 1-4 aircraft. Have callsigns, generic counters, detected/undetected states.', keywords: ['flights', 'aircraft', 'units'] },
  { section: '5.0', title: 'Initiative', summary: 'Roll 1d10: 1-6 NATO, 7+ WP. Draw chits to determine movement order.', keywords: ['initiative', 'chit', 'movement order'] },
  { section: '6.0', title: 'Movement', summary: 'Spend MP to move, turn, climb, dive. Speed from ADC by altitude and throttle.', keywords: ['movement', 'speed', 'MP', 'hex'] },
  { section: '6.2', title: 'Movement Points', summary: 'Combat throttle: max or max-1. Dash: between combat and dash max. Crippled cannot Dash.', keywords: ['speed', 'throttle', 'combat', 'dash'] },
  { section: '6.31', title: 'Movement Actions', summary: 'Each MP: Move hex, Turn, Climb (1 band), Dive (any lower), SAM avoidance, or remove markers.', keywords: ['move', 'turn', 'climb', 'dive', 'actions'] },
  { section: '6.32', title: 'Turning', summary: 'Free turn on entering hex/climbing/diving. Speed 1-2: 90° free. 3-4: 60°. 5-8: 30°. 9+: 0°.', keywords: ['turn', 'free turn', 'max turn'] },
  { section: '6.33', title: 'Zoom Climb', summary: '2nd+ climb costs 2 MP. Cannot if laden or Combat throttle. Combat penalties apply.', keywords: ['zoom', 'climb', 'altitude'] },
  { section: '6.4', title: 'Stacking', summary: 'Cannot end movement stacked with friendly flight at same altitude. Enemy stacking OK.', keywords: ['stacking', 'hex'] },
  { section: '7.0', title: 'Formations', summary: 'Defensive Wheel: no heading, all arcs are forward beam. No scatter. No Surprise against.', keywords: ['formation', 'defensive wheel'] },
  { section: '8.0', title: 'Raid Planning', summary: 'Bombing/Recon/Transport flights follow plotted flight paths. Other tasks move freely.', keywords: ['raid', 'planning', 'flight path', 'waypoint'] },
  { section: '9.0', title: 'Airfield Operations', summary: 'Takeoff takes 2 turns. Landing takes 3 turns. Refuel/Rearm for CAP only at Class 2+ airfields.', keywords: ['airfield', 'takeoff', 'landing', 'rearm'] },
  { section: '10.0', title: 'Detection', summary: 'Standard (2d10), Visual (4 hexes, LOS), Radar Search (forward arc), EWR (20/10 hexes).', keywords: ['detection', 'radar', 'visual', 'EWR'] },
  { section: '10.3', title: 'Track Phase', summary: 'Auto-undetect at Deck in rough/mountain. Roll Track Table — matching symbols undetect.', keywords: ['track', 'undetect', 'symbols'] },
  { section: '11.0', title: 'Air-to-Air Combat', summary: 'Standard (dogfight) and BVR combat. Engagement → Maneuver → Shots → Damage → Morale → Scatter.', keywords: ['combat', 'dogfight', 'BVR', 'engagement'] },
  { section: '11.2', title: 'Engagement', summary: 'Prerequisites: moved, target detected, in range/arc, have weapons. Roll 2d10 vs engagement value.', keywords: ['engagement', 'prerequisites'] },
  { section: '11.3', title: 'Combat Resolution', summary: 'Maneuver roll → shot opportunities. Shots: 2d10 + weapon value. Damage: D/C/K results.', keywords: ['maneuver', 'shots', 'damage'] },
  { section: '11.34', title: 'Ammo Depletion', summary: 'Roll 1d10 per flight after combat. ≤ depletion number = weapon depleted. Roll of 1 = second weapon too.', keywords: ['depletion', 'ammo', 'weapons'] },
  { section: '12.0', title: 'Air Unit Damage', summary: 'Damaged: no attacks, jettison ordnance. Crippled: no Dash. Shot Down: removed.', keywords: ['damage', 'damaged', 'crippled', 'shot down'] },
  { section: '13.0', title: 'Post-Combat', summary: 'Morale check → Scatter → Place markers → Undetect. Both flights perform these steps.', keywords: ['morale', 'scatter', 'post-combat', 'disorder'] },
  { section: '14.0', title: 'Anti-Aircraft Artillery', summary: 'Three types: Concentrations (barrage zones), Fire Can (radar, 2 hex), Mobile AAA (radar, 1 hex).', keywords: ['AAA', 'flak', 'anti-aircraft'] },
  { section: '15.0', title: 'SAMs and Radars', summary: 'Acquire on radar → Fire → SAM Defense roll. Max 2 SAM attacks per flight per turn.', keywords: ['SAM', 'radar', 'acquisition', 'missile'] },
  { section: '15.25', title: 'Terrain Masking', summary: 'Moving into Rough/Mountain at Deck removes SAM acquisition. Mountain hex between SAM and target also removes.', keywords: ['terrain masking', 'acquisition', 'deck'] },
  { section: '16.0', title: 'Air-to-Ground Ordnance', summary: 'Bombs, LGB, EOGM, EOGB, ARMs, CBU, rockets, nukes, chaff. Laden flights use worse speed/maneuver values.', keywords: ['ordnance', 'bombs', 'laden', 'weapons'] },
  { section: '17.0', title: 'Air-to-Ground Attacks', summary: '9 attack profiles. Bomb Run from IP to target. Roll 2d10 on A2G Attack Table.', keywords: ['bombing', 'attack', 'ground attack', 'bomb run'] },
  { section: '18.0', title: 'Ground Target Damage', summary: 'Roll on Damage Table by attack success. NE/Slight/Heavy/Total. SAMs suppressed, AAA suppressed, units destroyed.', keywords: ['damage', 'ground', 'suppression', 'destruction'] },
  { section: '19.0', title: 'Electronic Countermeasures', summary: 'Defensive jamming (per-flight), Standoff jamming (area), Spot jamming (focused), Chaff corridors.', keywords: ['ECM', 'jamming', 'chaff', 'electronic'] },
  { section: '20.0', title: 'Fuel and Recovery', summary: 'Mark fuel for Dash/combat. Exceeding allowance = crash risk. Recovery roll at scenario end.', keywords: ['fuel', 'recovery', 'dash'] },
  { section: '22.0', title: 'Weather', summary: 'Clear, clouds (dense/broken), haze, mist. Clouds block LOS between altitude bands. Haze/mist affect visual bombing.', keywords: ['weather', 'clouds', 'haze', 'mist', 'LOS'] },
  { section: '23.0', title: 'Night', summary: 'Night/Limited Night aircraft only. Turn limit 60° (30° at 9+ speed). Ground collision risk at Deck without TFR.', keywords: ['night', 'moon', 'TFR'] },
  { section: '33.0', title: 'Solitaire Rules', summary: 'Full Solitaire Play uses bot tables for flight, SAM, and AAA decisions. Generic flights activate into real aircraft.', keywords: ['solo', 'solitaire', 'bot', 'AI'] },
];

/**
 * Search rules by keyword or section number.
 */
export function searchRules(query: string): RuleEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return RULE_ENTRIES;

  return RULE_ENTRIES.filter((entry) =>
    entry.section.includes(q) ||
    entry.title.toLowerCase().includes(q) ||
    entry.summary.toLowerCase().includes(q) ||
    entry.keywords.some((k) => k.includes(q))
  );
}
