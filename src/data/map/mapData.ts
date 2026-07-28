/**
 * Map hex data for Red Storm.
 *
 * This module provides terrain data for the game map.
 * Hex terrain is classified from the board game map image.
 *
 * Terrain types per hex can include multiple: a hex can be
 * Land+Urban+Road+River+Airfield simultaneously (e.g., hex 5126).
 *
 * The initial dataset covers key hexes for RS1 and Solo scenarios.
 * Remaining hexes default to 'land'. Terrain can be refined using
 * the in-app terrain editor.
 */

import { HexData, HexCoord, TerrainType } from '@engine/state/GameState';
import { hexToId } from '@engine/state/GameState';

// ── Airfield Definitions ─────────────────────────────────────────
// From Appendix B and map. Format: [hex, class, name, side, printedAAA]

interface AirfieldDef {
  hex: string;         // 4-digit hex ID
  name: string;
  airfieldClass: number;
  side: 'nato' | 'wp';
  printedAAA: 'light' | 'medium' | null;
}

export const AIRFIELDS: AirfieldDef[] = [
  // NATO airfields (partial list, covering RS1 and common scenarios)
  { hex: '0116', name: 'Eindhoven', airfieldClass: 5, side: 'nato', printedAAA: 'light' },
  { hex: '1025', name: 'Cologne-Bonn', airfieldClass: 5, side: 'nato', printedAAA: 'light' },
  { hex: '1603', name: 'Dortmund', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '1908', name: 'Gutersloh', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '2328', name: 'Hahn', airfieldClass: 5, side: 'nato', printedAAA: 'light' },
  { hex: '2533', name: 'Ramstein', airfieldClass: 5, side: 'nato', printedAAA: 'light' },
  { hex: '2929', name: 'Sembach', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '3104', name: 'Paderborn', airfieldClass: 3, side: 'nato', printedAAA: 'light' },
  { hex: '3253', name: 'Buchel', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '3641', name: 'Pferdsfeld', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '4505', name: 'Hoxter', airfieldClass: 2, side: 'nato', printedAAA: 'light' },
  { hex: '4514', name: 'Kassel', airfieldClass: 3, side: 'nato', printedAAA: 'light' },
  { hex: '4521', name: 'Fritzlar', airfieldClass: 4, side: 'nato', printedAAA: 'light' },
  { hex: '5126', name: 'Bad Hersfeld', airfieldClass: 3, side: 'nato', printedAAA: 'light' },
  { hex: '5032', name: 'Fulda', airfieldClass: 3, side: 'nato', printedAAA: 'light' },
  { hex: '5536', name: 'Wildflecken', airfieldClass: 2, side: 'nato', printedAAA: 'light' },
  { hex: '5943', name: 'Schweinfurt', airfieldClass: 3, side: 'nato', printedAAA: 'light' },
  { hex: '7044', name: 'Bamberg', airfieldClass: 3, side: 'nato', printedAAA: 'light' },

  // WP airfields (partial list)
  { hex: '6302', name: 'Ohrdruf', airfieldClass: 3, side: 'wp', printedAAA: 'medium' },
  { hex: '7306', name: 'Ballenstedt', airfieldClass: 3, side: 'wp', printedAAA: 'medium' },
  { hex: '7503', name: 'Cochstedt', airfieldClass: 4, side: 'wp', printedAAA: 'medium' },
  { hex: '7706', name: 'Zerbst', airfieldClass: 5, side: 'wp', printedAAA: 'medium' },
  { hex: '6608', name: 'Merseburg', airfieldClass: 4, side: 'wp', printedAAA: 'medium' },
  { hex: '6914', name: 'Altenburg', airfieldClass: 4, side: 'wp', printedAAA: 'medium' },
  { hex: '7210', name: 'Leipzig-Schkeuditz', airfieldClass: 5, side: 'wp', printedAAA: 'medium' },
];

// ── Known Terrain Overrides ──────────────────────────────────────
// Key hexes with specific terrain based on the board game map.
// Format: hexId -> terrain types

const TERRAIN_OVERRIDES: Record<string, TerrainType[]> = {
  // RS1 area - urban hexes (cities/towns)
  '4307': ['land', 'urban'],         // near Orbit Point
  '4505': ['land', 'urban', 'road'], // Hoxter
  '4514': ['land', 'urban', 'road'], // Kassel
  '4706': ['land'],                  // EWR location
  '4904': ['land'],                  // HAWK target
  '5126': ['land', 'urban', 'road', 'river'], // Bad Hersfeld
  '5303': ['land'],                  // Recon target
  '5308': ['land'],                  // HAWK target
  '5404': ['land'],                  // Recon target

  // Rhine river hexes (western part of map)
  '1025': ['land', 'urban', 'river', 'road'],

  // Rough terrain areas (Harz Mountains region, rows 02-08, cols 60-75)
  '6303': ['rough', 'road'],
  '6304': ['rough'],
  '6404': ['rough'],
  '6405': ['rough'],
  '6504': ['rough'],
  '6505': ['rough'],
  '6603': ['rough'],
  '6604': ['rough'],
  '6705': ['rough'],
  '6804': ['rough'],
  '6805': ['rough'],
  '6903': ['rough'],
  '6904': ['rough'],
  '7003': ['rough'],
  '7004': ['rough'],
  '7104': ['rough'],
  '7105': ['rough'],
  '7204': ['rough'],
  '7205': ['rough'],
  '7305': ['rough'],
  '7306': ['rough', 'urban'],        // Ballenstedt

  // Thuringer Wald (forest/rough, cols 58-68, rows 10-16)
  '5810': ['rough'],
  '5910': ['rough'],
  '6010': ['rough'],
  '6110': ['rough'],
  '6210': ['rough'],
  '6009': ['rough'],
  '6109': ['rough'],
  '6209': ['rough'],
  '6309': ['rough', 'road'],

  // Road hexes (major highways)
  '5032': ['land', 'urban', 'road'], // Fulda
  '6502': ['land', 'road'],          // EWR location

  // Mountain terrain (limited in northern area)
  // The Harz mountain area has some mountain hexes

  // Rivers - Weser river runs through the RS1 area
  '4503': ['land', 'river'],
  '4504': ['land', 'river'],
  '4604': ['land', 'river'],
  '4605': ['land', 'river'],

  // Front line area hexes
  '6302': ['land', 'urban', 'road'], // Ohrdruf - WP airfield
  '5718': ['rough'],
  '5721': ['rough'],
};

// ── Map Generation ───────────────────────────────────────────────

/**
 * Generate the full hex data map.
 * Returns a Record keyed by 4-digit hex ID.
 */
export function generateMapData(): Record<string, HexData> {
  const hexes: Record<string, HexData> = {};

  for (let col = 0; col <= 79; col++) {
    for (let row = 0; row <= 50; row++) {
      const id = hexToId({ col, row });
      const override = TERRAIN_OVERRIDES[id];

      // Determine if this is East Germany (east/north of the international border)
      // Simplified: the border roughly runs along cols 58-63
      const isEastGermany = col >= 63 || (col >= 58 && row <= 21);

      // Find airfield data
      const airfield = AIRFIELDS.find((a) => a.hex === id);

      const terrain: TerrainType[] = override
        ? [...override]
        : ['land'];

      // Add airfield terrain if applicable
      if (airfield && !terrain.includes('road')) {
        terrain.push('road'); // Airfields typically have road access
      }

      hexes[id] = {
        coord: { col, row },
        terrain,
        isAirfield: !!airfield,
        airfieldClass: airfield?.airfieldClass ?? null,
        airfieldId: airfield?.name ?? null,
        printedAAA: airfield?.printedAAA ?? null,
        isEastGermany,
      };
    }
  }

  return hexes;
}

/**
 * Generate map data for a specific play area only.
 */
export function generatePlayAreaMap(
  minCol: number, maxCol: number,
  minRow: number, maxRow: number
): Record<string, HexData> {
  const full = generateMapData();
  const filtered: Record<string, HexData> = {};

  for (const [id, data] of Object.entries(full)) {
    if (
      data.coord.col >= minCol && data.coord.col <= maxCol &&
      data.coord.row >= minRow && data.coord.row <= maxRow
    ) {
      filtered[id] = data;
    }
  }

  return filtered;
}
