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
import { getScenario } from '../data/scenarios/scenarioRegistry';
import { ScenarioDefinition } from '../data/scenarios/scenarioTypes';

/**
 * Load a scenario by ID and return an initialized GameState.
 */
export function loadScenario(scenarioId: string): GameState {
  if (scenarioId === 'rs01') {
    return loadRS1();
  }

  // Try loading from the scenario registry
  const scenarioDef = getScenario(scenarioId);
  if (scenarioDef) {
    return loadFromDefinition(scenarioDef);
  }

  throw new Error(`Unknown scenario: ${scenarioId}`);
}

/**
 * Generic loader that creates a GameState from a ScenarioDefinition.
 * Used for solo scenarios and any future scenarios entered via the registry.
 */
function loadFromDefinition(scenario: ScenarioDefinition): GameState {
  const state = createEmptyGameState();

  state.scenarioId = scenario.id;
  state.scenarioName = scenario.name;
  state.turn = 1;
  state.maxTurns = scenario.maxTurns;
  state.phase = 'setup';
  state.timeOfDay = scenario.dayNight;
  state.moonPhase = scenario.moonPhase;
  state.natoDetectionLevel = scenario.natoDetectionLevel;
  state.wpDetectionLevel = scenario.wpDetectionLevel;
  state.humanSide = scenario.humanSide === 'either' ? 'nato' : scenario.humanSide;
  state.botSide = state.humanSide === 'nato' ? 'wp' : 'nato';

  // Load map
  state.hexes = generatePlayAreaMap(
    scenario.playArea.minCol, scenario.playArea.maxCol,
    scenario.playArea.minRow, scenario.playArea.maxRow,
  );

  // Front line
  state.frontHexes = scenario.front;

  // Bot state
  const botOOB = state.botSide === 'nato' ? scenario.natoOOB : scenario.wpOOB;
  const humanOOB = state.humanSide === 'nato' ? scenario.natoOOB : scenario.wpOOB;
  const botActivation = botOOB.botFlightActivation;
  state.botState = {
    realSAMsInPlay: 0,
    realAAAInPlay: 0,
    realFlightsInPlay: 0,
    maxRealFlights: botActivation?.[0]?.maxRealFlights ?? 10,
  };

  // Load flights from both OOBs
  const loadFlights = (oob: typeof scenario.natoOOB, side: 'nato' | 'wp') => {
    for (const setup of oob.flights) {
      const flight: FlightState = {
        id: setup.id,
        side,
        nation: setup.nation,
        aircraftType: setup.aircraftType,
        genericCounterId: setup.setupType === 'generic' ? setup.id : null,
        isVisuallyIdentified: setup.setupType !== 'generic',
        isDummy: false,
        hex: setup.setupHex
          ? { col: parseInt(setup.setupHex.substring(0, 2), 10), row: parseInt(setup.setupHex.substring(2, 4), 10) }
          : setup.enterHex
          ? { col: parseInt(setup.enterHex.substring(0, 2), 10), row: parseInt(setup.enterHex.substring(2, 4), 10) }
          : { col: side === 'nato' ? 30 : 70, row: 5 },
        onHexside: false,
        heading: side === 'nato' ? 0 : 180,
        altitude: setup.setupAltitude ?? 'medium',
        throttle: 'combat',
        speed: 0,
        mpRemaining: 0,
        hasMoved: false,
        hasMovedThisPhase: false,
        aircraft: Array.from({ length: setup.count }, (_, i) => ({
          index: i + 1,
          damage: 'none' as const,
          bombStrength: 0,
          bombStrengthRemaining: 0,
          ordnance: [],
          airToAirWeapons: [{ weaponId: side === 'nato' ? 'AIM-7M' : 'R-27R', depleted: false }],
          crewCount: 1,
          crewStatus: ['ok' as const],
        })),
        task: setup.task,
        raidId: null,
        flightPath: null,
        currentWaypointIndex: 0,
        detected: false,
        disordered: false,
        aborted: false,
        inDefensiveWheel: false,
        isOnGround: setup.setupType === 'qra',
        groundState: setup.setupType === 'qra' ? 'ready' : null,
        takeoffTurn: null,
        landingTurn: null,
        markers: [],
        pilotQuality: 'regular',
        aggressionValue: setup.aggressionValue,
        fuelUsed: 0,
        fuelAllowance: 5,
        extraFuelUsed: 0,
      };
      state.flights[setup.id] = flight;
    }
  };

  loadFlights(scenario.natoOOB, 'nato');
  loadFlights(scenario.wpOOB, 'wp');

  // Load ground units from both OOBs
  const loadGroundUnits = (oob: typeof scenario.natoOOB, side: 'nato' | 'wp') => {
    for (const setup of oob.groundUnits) {
      const unit: GroundUnitState = {
        id: setup.id,
        type: setup.type,
        subType: setup.subType,
        side,
        hex: { col: parseInt(setup.hex.substring(0, 2), 10), row: parseInt(setup.hex.substring(2, 4), 10) },
        hidden: !setup.located,
        located: setup.located,
        isSAMWarning: false,
        isDummy: false,
        radarOn: setup.radarOn,
        ammoRemaining: setup.type === 'sam' ? 9 : 0,
        ammoMax: setup.type === 'sam' ? 9 : 0,
        acquisitions: {},
        phasedArrayArc: null,
        active: setup.type === 'aaaConcentation' || setup.type === 'ewr',
        concentration: setup.type === 'aaaConcentation' ? 'light' : null,
        damage: 'none',
        radarSuppressedTurns: 0,
        radarShutdown: false,
        aaaSuppression: 0,
        organicSmallArms: ['armor', 'mech', 'artillery', 'hq', 'supply', 'missile'].includes(setup.type),
        organicLightAAA: setup.type === 'sam' || setup.type === 'ewr',
        organicMobileAAA: null,
        organicMobileRadarOn: false,
      };
      state.groundUnits[setup.id] = unit;
    }
  };

  loadGroundUnits(scenario.natoOOB, 'nato');
  loadGroundUnits(scenario.wpOOB, 'wp');

  state.eventLog.push({
    turn: 0, phase: 'setup', timestamp: Date.now(),
    type: 'scenario_loaded',
    message: `Scenario "${scenario.name}" loaded. ${scenario.date}, ${scenario.timeOfDay}.`,
  });

  return state;
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
