/**
 * Scenario definition types and registry.
 */

import { Side, Nation, TaskType, AltitudeBand, PilotQuality, HexCoord } from '@engine/state/GameState';

export interface ScenarioDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  background: string;
  category: 'introductory' | 'standard' | 'solo' | 'campaign';
  size: 'small' | 'medium' | 'large';

  date: string;
  timeOfDay: string;
  dayNight: 'day' | 'night';
  moonPhase: 'full' | 'none' | null;

  playArea: { minCol: number; maxCol: number; minRow: number; maxRow: number };
  front: HexCoord[];

  natoDetectionLevel: string;
  wpDetectionLevel: string;

  weather: 'clear' | 'roll_good' | 'roll_poor';
  maxTurns: number | null;

  humanSide: 'nato' | 'wp' | 'either';
  isSoloScenario: boolean;

  closedAirfields: { hex: string; aaaActive: boolean }[];
  inherentAAA: { side: Side; rangeFromFront: number } | null;

  isr: { side: Side | null };
  sead: { side: Side | null };
  earlyWarning: { side: Side | null; surpriseAttack: boolean };

  natoAirDefenseZone: string;
  flightRestrictions: FlightRestriction[];
  zoneLimits: ZoneLimit[];

  natoOOB: OrderOfBattle;
  wpOOB: OrderOfBattle;

  ssrs: string[];
  victoryType: 'standard' | 'custom';
  victoryDescription: string;
}

export interface FlightRestriction {
  side: Side;
  description: string;
}

export interface ZoneLimit {
  side: Side;
  description: string;
  hexColumnLimit?: number;
  distFromFront?: number;
}

export interface OrderOfBattle {
  flights: FlightSetup[];
  groundUnits: GroundUnitSetup[];
  orbitPoints: HexCoord[];
  rallyPoints: HexCoord[];
  dummyFlights: number;
  pilotQuality: Record<string, PilotQuality>;
  // Solo scenario bot fields
  botFlightActivation?: BotFlightActivation[];
  samActivation?: SAMActivationInfo;
  aaaActivation?: AAAActivationInfo;
}

export interface FlightSetup {
  id: string;
  aircraftType: string;
  nation: Nation;
  task: TaskType;
  count: number;
  aggressionValue: number;
  setupType: 'onMap' | 'enterTurn' | 'qra' | 'generic';
  setupHex?: string;
  setupAltitude?: AltitudeBand;
  setupHeading?: number;
  enterHex?: string;
  enterTurn?: number;
}

export interface GroundUnitSetup {
  id: string;
  type: 'sam' | 'ewr' | 'aaaConcentation' | 'radarAAA' | 'mobileAAA' | 'armor' | 'mech' | 'artillery' | 'hq' | 'supply' | 'missile';
  subType: string;
  hex: string;
  located: boolean;
  radarOn: boolean;
}

export interface BotFlightActivation {
  task: TaskType;
  count: number;
  activationTable: { minRoll: number; maxRoll: number; aircraftType: string; nation: string }[];
  maxRealFlights: number;
}

export interface SAMActivationInfo {
  zones: {
    name: string;
    warningLocations: { hex: string; radarOn: boolean }[];
    typeTable: { minRoll: number; maxRoll: number; samType: string }[];
  }[];
  maxTypes: Record<string, number>;
}

export interface AAAActivationInfo {
  locations: { hex: string }[];
  typeTable: { minRoll: number; maxRoll: number; aaaType: string; concentration?: string; hasFireCan?: boolean }[];
  maxTypes: Record<string, number>;
}
