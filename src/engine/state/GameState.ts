/**
 * Core game state types for Red Storm.
 * This is the single source of truth for all game data.
 * All state is serializable to JSON for save/load and undo.
 */

// ── Hex Coordinates ──────────────────────────────────────────────

/** 4-digit hex coordinate matching the board game scheme (col 00-79, row 00-50) */
export interface HexCoord {
  col: number;
  row: number;
}

/** Convert a HexCoord to its 4-digit string ID (e.g., {col:51, row:26} -> "5126") */
export function hexToId(hex: HexCoord): string {
  return `${hex.col.toString().padStart(2, '0')}${hex.row.toString().padStart(2, '0')}`;
}

/** Parse a 4-digit hex ID back to a HexCoord */
export function idToHex(id: string): HexCoord {
  return {
    col: parseInt(id.substring(0, 2), 10),
    row: parseInt(id.substring(2, 4), 10),
  };
}

// ── Enums and Literals ───────────────────────────────────────────

export type Side = 'nato' | 'wp';

export type Nation =
  | 'US' | 'UK' | 'FRG' | 'BE' | 'NE' | 'CAN'   // NATO nations
  | 'USSR' | 'GDR';                                 // Warsaw Pact nations

export type AltitudeBand = 'deck' | 'low' | 'medium' | 'high' | 'veryHigh';

export type TerrainType = 'land' | 'rough' | 'mountain' | 'urban' | 'river' | 'road' | 'highway';

export type PilotQuality = 'ace' | 'veteran' | 'regular' | 'trained' | 'green';

export type TaskType =
  | 'bombing' | 'sead' | 'cap' | 'closeEscort' | 'fac'
  | 'rescueSupport' | 'recon' | 'escortJamming' | 'standoffJamming'
  | 'csar' | 'transport' | 'laserDesignation' | 'chaffLaying';

export type DamageLevel = 'none' | 'damaged' | 'crippled' | 'shotdown';

export type AcquisitionLevel = 'none' | 'partial' | 'full';

export type Throttle = 'combat' | 'dash';

/** Game phases in order per section 3.2 */
export type GamePhase =
  | 'setup'
  | 'randomEvent'
  | 'jamming'
  | 'detection'
  | 'movement'
  | 'fuel'
  | 'samLocation'
  | 'track'
  | 'samAcquisition'
  | 'admin'
  | 'completed';

export type FlightMarkerType =
  | 'maneuver' | 'bvrAvoid' | 'samAvoid' | 'antiRadarTactics'
  | 'zoomClimb' | 'maxTurn' | 'lowFuel' | 'samLaunch'
  | 'radarShutdown' | 'radarSuppressed' | 'abort' | 'disordered';

// ── Hex Data ─────────────────────────────────────────────────────

export interface HexData {
  coord: HexCoord;
  terrain: TerrainType[];
  isAirfield: boolean;
  airfieldClass: number | null;       // 1-5 or null
  airfieldId: string | null;
  printedAAA: 'light' | 'medium' | null;
  isEastGermany: boolean;
}

// ── Flight State ─────────────────────────────────────────────────

export interface WeaponSlot {
  weaponId: string;
  depleted: boolean;
}

export interface OrdnanceSlot {
  type: string;                       // 'bomb' | 'lgb' | 'eogm' | 'harm' | etc.
  shotsRemaining: number;
  shotsMax: number;
}

export interface AircraftState {
  index: number;                      // 1-4 position in flight
  damage: DamageLevel;
  bombStrength: number;
  bombStrengthRemaining: number;
  ordnance: OrdnanceSlot[];
  airToAirWeapons: WeaponSlot[];
  crewCount: number;
  crewStatus: ('ok' | 'kia' | 'captured' | 'rescued' | 'parachuting')[];
}

export interface Waypoint {
  hex: HexCoord;
  type: 'ingress' | 'release' | 'rejoin' | 'egress' | 'other';
}

export interface FlightState {
  id: string;                         // Callsign
  side: Side;
  nation: Nation;
  aircraftType: string;               // References aircraft database
  genericCounterId: string | null;
  isVisuallyIdentified: boolean;
  isDummy: boolean;

  // Position
  hex: HexCoord;
  onHexside: boolean;
  heading: number;                    // 0, 30, 60, ... 330 degrees
  altitude: AltitudeBand;

  // Movement
  throttle: Throttle;
  speed: number;
  mpRemaining: number;
  hasMoved: boolean;
  hasMovedThisPhase: boolean;

  // Aircraft
  aircraft: AircraftState[];

  // Task & Raid
  task: TaskType;
  raidId: string | null;
  flightPath: Waypoint[] | null;
  currentWaypointIndex: number;

  // Detection
  detected: boolean;

  // Status flags
  disordered: boolean;
  aborted: boolean;
  inDefensiveWheel: boolean;
  isOnGround: boolean;
  groundState: 'ready' | 'unready' | 'revetted' | null;
  takeoffTurn: number | null;
  landingTurn: number | null;

  // Markers
  markers: FlightMarkerType[];

  // Pilot quality & morale
  pilotQuality: PilotQuality;
  aggressionValue: number;

  // Fuel
  fuelUsed: number;
  fuelAllowance: number;
  extraFuelUsed: number;
}

// ── Ground Unit State ────────────────────────────────────────────

export type GroundUnitType =
  | 'sam' | 'aaaConcentation' | 'radarAAA' | 'mobileAAA'
  | 'ewr' | 'armor' | 'mech' | 'artillery' | 'hq' | 'supply' | 'missile';

export interface GroundUnitState {
  id: string;
  type: GroundUnitType;
  subType: string;                    // e.g., 'SA-6', 'HAWK_C', 'Fire_Can', etc.
  side: Side;
  hex: HexCoord;

  // Visibility
  hidden: boolean;
  located: boolean;
  isSAMWarning: boolean;
  isDummy: boolean;

  // SAM-specific
  radarOn: boolean;
  ammoRemaining: number;
  ammoMax: number;
  acquisitions: Record<string, AcquisitionLevel>; // flightId -> level
  phasedArrayArc: number | null;

  // AAA-specific
  active: boolean;
  concentration: 'light' | 'medium' | 'heavy' | null;

  // Damage
  damage: 'none' | 'slight' | 'heavy' | 'destroyed';
  radarSuppressedTurns: number;
  radarShutdown: boolean;
  aaaSuppression: number;             // 0-3

  // Organic attachments
  organicSmallArms: boolean;
  organicLightAAA: boolean;
  organicMobileAAA: string | null;    // 'gepard' | 'vulcan' | '2k22'
  organicMobileRadarOn: boolean;
}

// ── Weather ──────────────────────────────────────────────────────

export interface CloudLayer {
  type: 'dense' | 'broken';
  betweenLow: AltitudeBand;
  betweenHigh: AltitudeBand;
}

export interface WeatherState {
  haze: boolean;
  hazeMaxAltitude: AltitudeBand | null;
  mist: boolean;
  cloudLayers: CloudLayer[];
  cloudBreaks: HexCoord[];
  goodContrast: boolean;
}

// ── Initiative ───────────────────────────────────────────────────

export interface InitiativeState {
  winner: Side | null;
  currentDrawer: Side | null;
  chitValue: number | null;
  flightsMovedThisChit: number;
  allFlightsMoved: boolean;
}

// ── Bot State (Full Solitaire Play) ──────────────────────────────

export interface BotState {
  realSAMsInPlay: number;
  realAAAInPlay: number;
  realFlightsInPlay: number;
  maxRealFlights: number;
}

// ── Game Events (for the event log) ──────────────────────────────

export interface GameEvent {
  turn: number;
  phase: GamePhase;
  timestamp: number;
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Master Game State ────────────────────────────────────────────

export interface GameState {
  scenarioId: string;
  scenarioName: string;
  turn: number;
  maxTurns: number | null;
  phase: GamePhase;

  // Initiative
  initiative: InitiativeState;

  // Weather & environment
  weather: WeatherState;
  timeOfDay: 'day' | 'night';
  moonPhase: 'full' | 'none' | null;

  // The Front
  frontHexes: HexCoord[];

  // Units
  flights: Record<string, FlightState>;
  groundUnits: Record<string, GroundUnitState>;

  // Map (hex data loaded from scenario)
  hexes: Record<string, HexData>;

  // Victory
  natoVP: number;
  wpVP: number;

  // Detection levels
  natoDetectionLevel: string;        // A through F
  wpDetectionLevel: string;

  // Event log
  eventLog: GameEvent[];

  // Solitaire
  humanSide: Side;
  botSide: Side;
  botState: BotState | null;

  // Undo
  undoStack: string[];                // Serialized prior states
}

/** Create a fresh default game state */
export function createEmptyGameState(): GameState {
  return {
    scenarioId: '',
    scenarioName: '',
    turn: 1,
    maxTurns: null,
    phase: 'setup',
    initiative: {
      winner: null,
      currentDrawer: null,
      chitValue: null,
      flightsMovedThisChit: 0,
      allFlightsMoved: false,
    },
    weather: {
      haze: false,
      hazeMaxAltitude: null,
      mist: false,
      cloudLayers: [],
      cloudBreaks: [],
      goodContrast: false,
    },
    timeOfDay: 'day',
    moonPhase: null,
    frontHexes: [],
    flights: {},
    groundUnits: {},
    hexes: {},
    natoVP: 0,
    wpVP: 0,
    natoDetectionLevel: 'C',
    wpDetectionLevel: 'C',
    eventLog: [],
    humanSide: 'nato',
    botSide: 'wp',
    botState: null,
    undoStack: [],
  };
}
