/**
 * Contextual tooltip content for game elements.
 * Shown on hover when Tips are enabled.
 */

export interface ContextTip {
  id: string;
  title: string;
  text: string;
  ruleRef?: string;
}

export const CONTEXT_TIPS: Record<string, ContextTip> = {
  // ── Altitude ──
  altitude_deck: { id: 'altitude_deck', title: 'Deck Altitude (0-2,500 ft)', text: 'Very low altitude. Hard to detect (-4) but vulnerable to small arms AAA. Cannot enter Mountain hexes without TFR. Breaks SAM acquisition in rough/mountain terrain.', ruleRef: '6.13' },
  altitude_low: { id: 'altitude_low', title: 'Low Altitude (3,000-8,000 ft)', text: 'Low altitude. -2 detection modifier. Within range of most AAA.', ruleRef: '6.13' },
  altitude_medium: { id: 'altitude_medium', title: 'Medium Altitude (9,000-21,000 ft)', text: 'Standard operating altitude. No detection modifiers. Within range of medium+ AAA and most SAMs.', ruleRef: '6.13' },
  altitude_high: { id: 'altitude_high', title: 'High Altitude (22,000-50,000 ft)', text: 'High altitude. +2 detection modifier (easier to detect). Adds 1 hex to SAM effective range. Above most AAA.', ruleRef: '6.13' },
  altitude_veryHigh: { id: 'altitude_veryHigh', title: 'Very High Altitude (50,000+ ft)', text: 'Very high altitude. +4 detection modifier. Adds 3 hexes to SAM effective range. Only a few aircraft can operate here.', ruleRef: '6.13' },

  // ── Detection ──
  detection_detected: { id: 'detection_detected', title: 'Detected', text: 'This flight has been detected by enemy sensors. It can be targeted for engagement and SAM attacks. Shows the suit symbol (Heart/Spade/Diamond).', ruleRef: '10.1' },
  detection_undetected: { id: 'detection_undetected', title: 'Undetected', text: 'This flight has not been detected. It cannot be engaged in BVR combat. Shows the "?" marker. Enemy must roll to detect it.', ruleRef: '10.1' },
  detection_visualId: { id: 'detection_visualId', title: 'Visually Identified', text: 'This flight has been visually identified. The enemy knows the aircraft type, count, damage state, and laden/clean status.', ruleRef: '10.4' },

  // ── Markers ──
  marker_maneuver: { id: 'marker_maneuver', title: 'Maneuver Marker', text: 'Flight scattered after combat. Must spend half its MP (rounded up) to remove before other movement. Loses defensive jamming.', ruleRef: '6.35' },
  marker_bvrAvoid: { id: 'marker_bvrAvoid', title: 'BVR Avoid Marker', text: 'Flight avoided a BVR attack. Must spend 1 MP to remove before other movement. Cancels any bomb run in progress.', ruleRef: '6.36' },
  marker_samAvoid: { id: 'marker_samAvoid', title: 'SAM Avoid Marker', text: 'Flight must perform SAM avoidance maneuver. Costs 1 MP. May cause ordnance jettison. Cannot initiate combat or attack.', ruleRef: '6.37' },
  marker_disordered: { id: 'marker_disordered', title: 'Disordered', text: 'Flight is scattered and uncoordinated. Cannot detect, initiate combat, or make ground attacks. Roll 20+ in Admin Phase to recover (+8 at Rally Point).', ruleRef: '13.11' },
  marker_abort: { id: 'marker_abort', title: 'Abort', text: 'Flight has aborted its mission. Cannot initiate combat or attack. Should exit the map or land at a friendly airfield.', ruleRef: '8.4' },
  marker_zoomClimb: { id: 'marker_zoomClimb', title: 'Zoom Climb', text: 'Flight climbed 2+ altitude bands this turn. Suffers combat penalties. Removed at end of turn.', ruleRef: '6.33' },

  // ── Ground Units ──
  unit_sam: { id: 'unit_sam', title: 'SAM Unit', text: 'Surface-to-Air Missile battery. Must acquire targets on radar before firing. Range, accuracy, and capabilities vary by type.', ruleRef: '15.0' },
  unit_ewr: { id: 'unit_ewr', title: 'Early Warning Radar', text: 'Provides additional detection rolls for enemy flights within 20 hexes (10 at Deck). Uses the B detection column.', ruleRef: '10.25' },
  unit_aaa: { id: 'unit_aaa', title: 'AAA Concentration', text: 'Anti-Aircraft Artillery. Projects a flak barrage zone into its hex and all adjacent hexes. Fires automatically when enemy flights enter.', ruleRef: '14.2' },
  unit_fireCan: { id: 'unit_fireCan', title: 'Fire Can (Radar AAA)', text: 'Radar-guided AAA. Attacks within 2 hexes when radar is on. More accurate than barrage AAA but limited to one shot per turn.', ruleRef: '14.5' },
  unit_mobileAAA: { id: 'unit_mobileAAA', title: 'Mobile AAA', text: 'Gepard/Vulcan/2K22 mobile radar-guided AAA. Attacks within 1 hex. Very effective at Deck altitude.', ruleRef: '14.6' },

  // ── SAM Acquisition ──
  acq_partial: { id: 'acq_partial', title: 'Partial Acquisition', text: 'SAM has partial radar lock on the target. Can fire but with reduced accuracy. May improve to Full or be lost.', ruleRef: '15.23' },
  acq_full: { id: 'acq_full', title: 'Full Acquisition', text: 'SAM has full radar lock. Best attack accuracy. Maintained each turn. Lost if target enters Deck in rough/mountain or radar switches off.', ruleRef: '15.23' },

  // ── Combat ──
  combat_surprise: { id: 'combat_surprise', title: 'Surprise', text: 'Attacker achieved surprise! +3 maneuver bonus. Defender is Disadvantaged (-3 maneuver, cannot jettison ordnance).', ruleRef: '11.25' },
  combat_bvr: { id: 'combat_bvr', title: 'BVR Combat', text: 'Beyond Visual Range — long-range missile engagement using radar-homing missiles. Only the attacker rolls. No scatter.', ruleRef: '11.3' },
  combat_standard: { id: 'combat_standard', title: 'Standard Combat', text: 'Close-range dogfight. Both sides roll for engagement, maneuver, and shots. Results in scatter and morale checks.', ruleRef: '11.3' },

  // ── Throttle ──
  throttle_combat: { id: 'throttle_combat', title: 'Combat Throttle', text: 'Standard power setting. Speed = max combat or one less (min 1). Does not cost fuel.', ruleRef: '6.21' },
  throttle_dash: { id: 'throttle_dash', title: 'Dash Throttle', text: 'Maximum power. Speed between combat max+1 and dash max. Costs 1 fuel per turn. Crippled aircraft cannot Dash.', ruleRef: '6.22' },

  // ── Weapons ──
  weapon_irm: { id: 'weapon_irm', title: 'IR Missile (IRM)', text: 'Heat-seeking air-to-air missile. Used in Standard combat only. Rear-aspect shots are most effective.', ruleRef: '11.11' },
  weapon_rhm: { id: 'weapon_rhm', title: 'Radar Homing Missile (RHM)', text: 'Radar-guided air-to-air missile. Used in both Standard and BVR combat. Range depends on target aspect.', ruleRef: '11.11' },
  weapon_gun: { id: 'weapon_gun', title: 'Gun', text: 'Aircraft cannon. Used in Standard combat. Can also strafe ground targets at Deck altitude.', ruleRef: '11.11' },

  // ── Terrain ──
  terrain_rough: { id: 'terrain_rough', title: 'Rough Terrain', text: 'Hills up to 1,000 ft. Provides -2 detection modifier at Deck. NATO flights at Deck auto-undetect in Track Phase.', ruleRef: '2.22' },
  terrain_mountain: { id: 'terrain_mountain', title: 'Mountain Terrain', text: 'Peaks over 2,000 ft. Cannot enter at Deck without TFR. Blocks Deck-to-Deck LOS. Removes SAM acquisition.', ruleRef: '2.22' },
  terrain_urban: { id: 'terrain_urban', title: 'Urban', text: 'City or town. Urban hexes can be used as Rally Points for disorder recovery.', ruleRef: '8.35' },
};
