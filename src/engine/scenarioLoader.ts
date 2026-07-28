/**
 * Scenario loader: takes a scenario definition and creates a GameState.
 * This is the bridge between static scenario data and the live game.
 */

import {
  GameState,
  createEmptyGameState,
  FlightState,
  GroundUnitState,
  HexCoord,
} from './state/GameState';
import { generatePlayAreaMap } from '../data/map/mapData';
import {
  RS1_SCENARIO,
  RS1_NATO_SETUP,
  RS1_WP_SETUP,
  RS1_TARGETS,
} from '../data/scenarios/rs01-morning-recon';

/**
 * Load a scenario by ID and return an initialized GameState.
 */
export function loadScenario(scenarioId: string): GameState {
  switch (scenarioId) {
    case 'rs01':
      return loadRS1();
    default:
      throw new Error(`Unknown scenario: ${scenarioId}`);
  }
}

function loadRS1(): GameState {
  const state = createEmptyGameState();
  const scenario = RS1_SCENARIO;

  // Basic scenario info
  state.scenarioId = scenario.id;
  state.scenarioName = scenario.name;
  state.turn = 1;
  state.maxTurns = scenario.maxTurns;
  state.phase = 'setup';
  state.timeOfDay = scenario.dayNight;
  state.natoDetectionLevel = scenario.natoDetectionLevel;
  state.wpDetectionLevel = scenario.wpDetectionLevel;
  state.humanSide = 'nato';
  state.botSide = 'wp';

  // Load map data for the play area
  // RS1: on/north of hexrow xx10 and on/east of hex column 39xx
  // "on/north" means row <= 10 (row 0 is northernmost)
  state.hexes = generatePlayAreaMap(
    scenario.playArea.minCol,
    scenario.playArea.maxCol,
    scenario.playArea.minRow,
    scenario.playArea.maxRow
  );

  // Front line
  state.frontHexes = scenario.front;

  // ── NATO Setup ──

  // NATO CAP flight: 2 x FGR2
  const natoCap: FlightState = {
    id: 'CAP-1',
    side: 'nato',
    nation: 'UK',
    aircraftType: 'FGR2',
    genericCounterId: null,
    isVisuallyIdentified: true,
    isDummy: false,
    hex: { col: 43, row: 8 },  // Adjacent to orbit point 4307
    onHexside: false,
    heading: 0,
    altitude: 'deck',
    throttle: 'combat',
    speed: 0,
    mpRemaining: 0,
    hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [
      {
        index: 1,
        damage: 'none',
        bombStrength: 0,
        bombStrengthRemaining: 0,
        ordnance: [],
        airToAirWeapons: [
          { weaponId: 'AIM-7E2', depleted: false },
          { weaponId: 'AIM-9G', depleted: false },
        ],
        crewCount: 2,
        crewStatus: ['ok', 'ok'],
      },
      {
        index: 2,
        damage: 'none',
        bombStrength: 0,
        bombStrengthRemaining: 0,
        ordnance: [],
        airToAirWeapons: [
          { weaponId: 'AIM-7E2', depleted: false },
          { weaponId: 'AIM-9G', depleted: false },
        ],
        crewCount: 2,
        crewStatus: ['ok', 'ok'],
      },
    ],
    task: 'cap',
    raidId: null,
    flightPath: null,
    currentWaypointIndex: 0,
    detected: false,
    disordered: false,
    aborted: false,
    inDefensiveWheel: false,
    isOnGround: false,
    groundState: null,
    takeoffTurn: null,
    landingTurn: null,
    markers: [],
    pilotQuality: 'veteran',
    aggressionValue: 1,
    fuelUsed: 0,
    fuelAllowance: 5,
    extraFuelUsed: 0,
  };
  state.flights['CAP-1'] = natoCap;

  // NATO Ground Units: 2 x HAWK C, 1 x EWR
  const hawk1: GroundUnitState = {
    id: 'HAWK-1',
    type: 'sam',
    subType: 'HAWK_C',
    side: 'nato',
    hex: { col: 53, row: 3 },
    hidden: false,
    located: true,
    isSAMWarning: false,
    isDummy: false,
    radarOn: true,
    ammoRemaining: 9,
    ammoMax: 9,
    acquisitions: {},
    phasedArrayArc: null,
    active: true,
    concentration: null,
    damage: 'none',
    radarSuppressedTurns: 0,
    radarShutdown: false,
    aaaSuppression: 0,
    organicSmallArms: false,
    organicLightAAA: true,
    organicMobileAAA: null,
    organicMobileRadarOn: false,
  };

  const hawk2: GroundUnitState = {
    ...hawk1,
    id: 'HAWK-2',
    hex: { col: 53, row: 8 },
  };

  const ewr1: GroundUnitState = {
    id: 'EWR-1',
    type: 'ewr' as const,
    subType: 'EWR',
    side: 'nato',
    hex: { col: 47, row: 6 },
    hidden: false,
    located: true,
    isSAMWarning: false,
    isDummy: false,
    radarOn: true,
    ammoRemaining: 0,
    ammoMax: 0,
    acquisitions: {},
    phasedArrayArc: null,
    active: true,
    concentration: null,
    damage: 'none',
    radarSuppressedTurns: 0,
    radarShutdown: false,
    aaaSuppression: 0,
    organicSmallArms: false,
    organicLightAAA: true,
    organicMobileAAA: null,
    organicMobileRadarOn: false,
  };

  state.groundUnits['HAWK-1'] = hawk1;
  state.groundUnits['HAWK-2'] = hawk2;
  state.groundUnits['EWR-1'] = ewr1;

  // ── WP Setup ──

  // WP Recon flight enters on Turn 1 near hex 7706
  const wpRecon: FlightState = {
    id: 'RECON-1',
    side: 'wp',
    nation: 'USSR',
    aircraftType: 'Su-24MR',
    genericCounterId: 'A',
    isVisuallyIdentified: false,
    isDummy: false,
    hex: { col: 77, row: 6 },
    onHexside: false,
    heading: 180,  // Heading west
    altitude: 'medium',
    throttle: 'combat',
    speed: 0,
    mpRemaining: 0,
    hasMoved: false,
    hasMovedThisPhase: false,
    aircraft: [
      {
        index: 1,
        damage: 'none',
        bombStrength: 0,
        bombStrengthRemaining: 0,
        ordnance: [],
        airToAirWeapons: [],
        crewCount: 2,
        crewStatus: ['ok', 'ok'],
      },
      {
        index: 2,
        damage: 'none',
        bombStrength: 0,
        bombStrengthRemaining: 0,
        ordnance: [],
        airToAirWeapons: [],
        crewCount: 2,
        crewStatus: ['ok', 'ok'],
      },
    ],
    task: 'recon',
    raidId: 'WP-RECON',
    flightPath: null,  // Will be plotted by player/bot
    currentWaypointIndex: 0,
    detected: false,
    disordered: false,
    aborted: false,
    inDefensiveWheel: false,
    isOnGround: false,
    groundState: null,
    takeoffTurn: null,
    landingTurn: null,
    markers: [],
    pilotQuality: 'regular',
    aggressionValue: 2,
    fuelUsed: 0,
    fuelAllowance: 4,
    extraFuelUsed: 0,
  };
  state.flights['RECON-1'] = wpRecon;

  // WP EWR
  const ewr2: GroundUnitState = {
    id: 'EWR-2',
    type: 'ewr' as const,
    subType: 'EWR',
    side: 'wp',
    hex: { col: 65, row: 2 },
    hidden: false,
    located: true,
    isSAMWarning: false,
    isDummy: false,
    radarOn: true,
    ammoRemaining: 0,
    ammoMax: 0,
    acquisitions: {},
    phasedArrayArc: null,
    active: true,
    concentration: null,
    damage: 'none',
    radarSuppressedTurns: 0,
    radarShutdown: false,
    aaaSuppression: 0,
    organicSmallArms: false,
    organicLightAAA: true,
    organicMobileAAA: null,
    organicMobileRadarOn: false,
  };
  state.groundUnits['EWR-2'] = ewr2;

  // Add an event log entry
  state.eventLog.push({
    turn: 0,
    phase: 'setup',
    timestamp: Date.now(),
    type: 'scenario_loaded',
    message: `Scenario "${RS1_SCENARIO.name}" loaded. ${RS1_SCENARIO.date}, ${RS1_SCENARIO.timeOfDay}.`,
  });

  return state;
}
