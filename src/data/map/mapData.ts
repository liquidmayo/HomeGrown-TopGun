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
  // ── RS1 AREA (cols 39-79, rows 00-10) ──────────────────────────

  // Urban hexes / cities
  '4002': ['land', 'urban', 'road'],       // Hildesheim area
  '4105': ['land', 'urban'],
  '4307': ['land', 'urban', 'road'],       // Orbit Point area
  '4404': ['land', 'road'],
  '4505': ['land', 'urban', 'road'],       // Hoxter airfield
  '4706': ['land', 'road'],                // EWR location
  '4904': ['land', 'road'],
  '5003': ['land', 'urban', 'road'],       // Goslar
  '5105': ['land', 'road'],
  '5303': ['land', 'road'],                // Recon target
  '5308': ['land'],                        // HAWK target
  '5404': ['land'],                        // Recon target

  // Weser River (runs north-south through cols 44-46)
  '4401': ['land', 'river'],
  '4402': ['land', 'river'],
  '4403': ['land', 'river'],
  '4404': ['land', 'river', 'road'],
  '4503': ['land', 'river'],
  '4504': ['land', 'river'],
  '4505': ['land', 'river', 'urban', 'road'], // Hoxter on river
  '4506': ['land', 'river'],
  '4606': ['land', 'river'],
  '4607': ['land', 'river'],
  '4608': ['land', 'river'],

  // Roads - major highways (Autobahn) through RS1 area
  '3900': ['land', 'road'],
  '4000': ['land', 'road'],
  '4100': ['land', 'road'],
  '4200': ['land', 'road'],
  '4300': ['land', 'road'],
  '4400': ['land', 'road'],
  '4500': ['land', 'road'],
  '4600': ['land', 'road'],
  '4700': ['land', 'road'],
  '4800': ['land', 'road'],
  '4900': ['land', 'road'],
  '5000': ['land', 'road'],
  '5100': ['land', 'road'],
  '5200': ['land', 'road'],
  '5300': ['land', 'road'],
  '5400': ['land', 'road'],
  '5500': ['land', 'road'],
  '4205': ['land', 'road'],
  '4305': ['land', 'road'],
  '4405': ['land', 'road'],
  '4806': ['land', 'road'],
  '4906': ['land', 'road'],
  '5006': ['land', 'road'],
  '5106': ['land', 'road'],
  '5206': ['land', 'road'],

  // Harz Mountains - Rough terrain (rows 02-07, cols 50-72)
  '5002': ['rough'], '5003': ['rough', 'urban', 'road'],
  '5102': ['rough'], '5103': ['rough'],
  '5202': ['rough'], '5203': ['rough'], '5204': ['rough'],
  '5302': ['rough'], '5303': ['rough', 'road'],
  '5402': ['rough'], '5403': ['rough'],
  '5502': ['rough'], '5503': ['rough'],
  '5602': ['rough'], '5603': ['rough'],
  '5702': ['rough'], '5703': ['rough'],
  '5802': ['rough'], '5803': ['rough'],
  '5902': ['rough'], '5903': ['rough'],
  '6002': ['rough'], '6003': ['rough'],
  '6102': ['rough'], '6103': ['rough'],
  '6202': ['rough'], '6203': ['rough'],
  '6302': ['land', 'urban', 'road'],       // Ohrdruf airfield
  '6303': ['rough', 'road'],
  '6304': ['rough'],
  '6404': ['rough'], '6405': ['rough'],
  '6504': ['rough'], '6505': ['rough'],
  '6603': ['rough'], '6604': ['rough'],
  '6705': ['rough'],
  '6804': ['rough'], '6805': ['rough'],
  '6903': ['rough'], '6904': ['rough'],
  '7003': ['rough'], '7004': ['rough'],
  '7104': ['rough'], '7105': ['rough'],
  '7204': ['rough'], '7205': ['rough'],
  '7305': ['rough'],

  // Harz Mountain peaks (mountain hexes within the Harz)
  '5603': ['mountain'], '5703': ['mountain'],
  '5804': ['mountain'], '5904': ['mountain'],
  '6004': ['mountain'], '6104': ['mountain'],
  '6204': ['mountain'],

  // ── WIDER MAP FEATURES ─────────────────────────────────────────

  // Major cities
  '4514': ['land', 'urban', 'road'],       // Kassel
  '4521': ['land', 'urban', 'road'],       // Fritzlar airfield
  '5126': ['land', 'urban', 'road', 'river'], // Bad Hersfeld
  '5032': ['land', 'urban', 'road'],       // Fulda
  '5536': ['land', 'urban'],               // Wildflecken
  '5943': ['land', 'urban', 'road'],       // Schweinfurt
  '7044': ['land', 'urban', 'road'],       // Bamberg
  '7306': ['rough', 'urban'],              // Ballenstedt airfield
  '7503': ['land', 'urban', 'road'],       // Cochstedt airfield
  '7706': ['land', 'urban', 'road'],       // Zerbst airfield
  '6608': ['land', 'urban', 'road'],       // Merseburg airfield
  '6914': ['land', 'urban', 'road'],       // Altenburg airfield
  '7210': ['land', 'urban', 'road'],       // Leipzig airfield
  '6502': ['land', 'road'],                // EWR location
  '1025': ['land', 'urban', 'river', 'road'], // Cologne-Bonn
  '1603': ['land', 'urban', 'road'],       // Dortmund
  '1908': ['land', 'urban', 'road'],       // Gutersloh
  '2533': ['land', 'urban', 'road'],       // Ramstein
  '3104': ['land', 'urban', 'road'],       // Paderborn

  // Thuringer Wald (rough terrain, cols 56-66, rows 09-16)
  '5609': ['rough'], '5610': ['rough'],
  '5709': ['rough'], '5710': ['rough'],
  '5809': ['rough'], '5810': ['rough'],
  '5909': ['rough'], '5910': ['rough'],
  '6009': ['rough'], '6010': ['rough'],
  '6109': ['rough'], '6110': ['rough'],
  '6209': ['rough'], '6210': ['rough'],
  '6309': ['rough', 'road'],
  '5611': ['rough'], '5711': ['rough'], '5811': ['rough'],
  '5912': ['rough'], '6012': ['rough'], '6112': ['rough'],
  '5613': ['rough'], '5713': ['rough'], '5813': ['rough'],
  '5614': ['rough'], '5714': ['rough'],
  '5615': ['rough'], '5715': ['rough'],

  // Rhon Mountains (rough/mountain, cols 50-56, rows 28-35)
  '5028': ['rough'], '5029': ['rough'], '5030': ['rough'],
  '5128': ['rough'], '5129': ['rough'], '5130': ['rough'],
  '5228': ['rough'], '5229': ['rough'],
  '5131': ['mountain'], '5231': ['mountain'], '5331': ['mountain'],
  '5132': ['rough', 'urban', 'road'], // town in rough

  // Rhine River (western edge of map, cols 10-15)
  '1020': ['land', 'river'], '1021': ['land', 'river'], '1022': ['land', 'river'],
  '1023': ['land', 'river'], '1024': ['land', 'river'], '1025': ['land', 'river', 'urban', 'road'],
  '1026': ['land', 'river'], '1027': ['land', 'river'], '1028': ['land', 'river'],
  '1120': ['land', 'river'], '1121': ['land', 'river'],
  '0920': ['land', 'river'], '0921': ['land', 'river'],

  // Fulda River (cols 49-52, rows 26-32)
  '4926': ['land', 'river'], '4927': ['land', 'river'],
  '5027': ['land', 'river'], '5028': ['land', 'river', 'rough'],
  '5029': ['land', 'river', 'rough'],
  '5030': ['land', 'river', 'rough'],
  '5031': ['land', 'river'],
  '5032': ['land', 'river', 'urban', 'road'], // Fulda city on river
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
