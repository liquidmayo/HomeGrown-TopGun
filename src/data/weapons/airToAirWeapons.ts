/**
 * Air-to-Air Weapon Database.
 *
 * Each weapon has Standard and optionally BVR combat values,
 * depletion numbers, and range data.
 *
 * Reference: ADC Air-to-Air Weapon Charts, Rules 11.1
 */

export type WeaponClass = 'irm' | 'rhm' | 'gun';

export interface AirToAirWeapon {
  id: string;
  name: string;
  class: WeaponClass;
  side: 'nato' | 'wp' | 'both';

  /** Standard (dogfight) combat value. Rule 11.13 */
  standardCombatValue: number;

  /** BVR combat value, null if not BVR-capable. Rule 11.13 */
  bvrCombatValue: number | null;

  /** BVR range by target arc: [forward, beam, rear]. Null if no BVR. */
  bvrRange: { forward: number; beam: number; rear: number } | null;

  /** Depletion number. Rule 11.34. Roll <= this = depleted. */
  depletionNumber: number;
}

const WEAPONS: Record<string, AirToAirWeapon> = {};

function reg(w: AirToAirWeapon) { WEAPONS[w.id] = w; }

// ── NATO IRM ─────────────────────────────────────────────────────
reg({
  id: 'AIM-9G', name: 'AIM-9G Sidewinder', class: 'irm', side: 'nato',
  standardCombatValue: 3, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});
reg({
  id: 'AIM-9L', name: 'AIM-9L Sidewinder', class: 'irm', side: 'nato',
  standardCombatValue: 4, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});
reg({
  id: 'AIM-9M', name: 'AIM-9M Sidewinder', class: 'irm', side: 'nato',
  standardCombatValue: 5, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});

// ── NATO RHM ─────────────────────────────────────────────────────
reg({
  id: 'AIM-7E2', name: 'AIM-7E2 Sparrow', class: 'rhm', side: 'nato',
  standardCombatValue: 2, bvrCombatValue: 1, bvrRange: { forward: 8, beam: 5, rear: 3 },
  depletionNumber: 5,
});
reg({
  id: 'AIM-7F', name: 'AIM-7F Sparrow', class: 'rhm', side: 'nato',
  standardCombatValue: 3, bvrCombatValue: 2, bvrRange: { forward: 10, beam: 6, rear: 4 },
  depletionNumber: 5,
});
reg({
  id: 'AIM-7M', name: 'AIM-7M Sparrow', class: 'rhm', side: 'nato',
  standardCombatValue: 4, bvrCombatValue: 3, bvrRange: { forward: 12, beam: 8, rear: 5 },
  depletionNumber: 5,
});
reg({
  id: 'Skyflash', name: 'Skyflash', class: 'rhm', side: 'nato',
  standardCombatValue: 3, bvrCombatValue: 2, bvrRange: { forward: 10, beam: 6, rear: 4 },
  depletionNumber: 5,
});

// ── NATO Guns ────────────────────────────────────────────────────
reg({
  id: 'Gun_M61', name: 'M61A1 Vulcan 20mm', class: 'gun', side: 'nato',
  standardCombatValue: 2, bvrCombatValue: null, bvrRange: null, depletionNumber: 6,
});

// ── WP IRM ───────────────────────────────────────────────────────
reg({
  id: 'R-3S', name: 'R-3S (AA-2 Atoll)', class: 'irm', side: 'wp',
  standardCombatValue: 1, bvrCombatValue: null, bvrRange: null, depletionNumber: 3,
});
reg({
  id: 'R-60', name: 'R-60 (AA-8 Aphid)', class: 'irm', side: 'wp',
  standardCombatValue: 2, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});
reg({
  id: 'R-60M', name: 'R-60M (AA-8 Aphid)', class: 'irm', side: 'wp',
  standardCombatValue: 3, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});
reg({
  id: 'R-73', name: 'R-73 (AA-11 Archer)', class: 'irm', side: 'wp',
  standardCombatValue: 5, bvrCombatValue: null, bvrRange: null, depletionNumber: 4,
});

// ── WP RHM ───────────────────────────────────────────────────────
reg({
  id: 'R-27R', name: 'R-27R (AA-10 Alamo)', class: 'rhm', side: 'wp',
  standardCombatValue: 3, bvrCombatValue: 2, bvrRange: { forward: 10, beam: 6, rear: 4 },
  depletionNumber: 5,
});
reg({
  id: 'R-23R', name: 'R-23R (AA-7 Apex)', class: 'rhm', side: 'wp',
  standardCombatValue: 1, bvrCombatValue: 0, bvrRange: { forward: 6, beam: 4, rear: 2 },
  depletionNumber: 4,
});

// ── WP Guns ──────────────────────────────────────────────────────
reg({
  id: 'Gun_GSh-23', name: 'GSh-23 23mm', class: 'gun', side: 'wp',
  standardCombatValue: 1, bvrCombatValue: null, bvrRange: null, depletionNumber: 5,
});
reg({
  id: 'Gun_GSh6-23', name: 'GSh-6-23 23mm Gatling', class: 'gun', side: 'wp',
  standardCombatValue: 2, bvrCombatValue: null, bvrRange: null, depletionNumber: 6,
});
reg({
  id: 'Gun_GSh-301', name: 'GSh-301 30mm', class: 'gun', side: 'wp',
  standardCombatValue: 2, bvrCombatValue: null, bvrRange: null, depletionNumber: 5,
});

// ── Lookup ───────────────────────────────────────────────────────

export function getWeapon(id: string): AirToAirWeapon | undefined {
  return WEAPONS[id];
}

export function getAllWeapons(): AirToAirWeapon[] {
  return Object.values(WEAPONS);
}

export default WEAPONS;
