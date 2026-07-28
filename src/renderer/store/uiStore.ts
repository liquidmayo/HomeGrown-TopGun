import { create } from 'zustand';
import { HexCoord } from '@engine/state/GameState';

interface UIStore {
  /** Currently selected hex on the map */
  selectedHex: HexCoord | null;

  /** Currently selected flight ID */
  selectedFlightId: string | null;

  /** Currently selected ground unit ID */
  selectedGroundUnitId: string | null;

  /** Which panels are open */
  panels: {
    flightLog: boolean;
    eventLog: boolean;
    samLog: boolean;
    phaseGuide: boolean;
    ruleReference: boolean;
  };

  /** Whether tips/tooltips are enabled */
  tipsEnabled: boolean;

  /** Map camera state */
  camera: {
    x: number;
    y: number;
    zoom: number;
  };

  // Actions
  selectHex: (hex: HexCoord | null) => void;
  selectFlight: (id: string | null) => void;
  selectGroundUnit: (id: string | null) => void;
  togglePanel: (panel: keyof UIStore['panels']) => void;
  toggleTips: () => void;
  setCamera: (camera: Partial<UIStore['camera']>) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedHex: null,
  selectedFlightId: null,
  selectedGroundUnitId: null,
  panels: {
    flightLog: true,
    eventLog: false,
    samLog: false,
    phaseGuide: true,
    ruleReference: false,
  },
  tipsEnabled: true,
  camera: { x: 0, y: 0, zoom: 1 },

  selectHex: (hex) => set({ selectedHex: hex }),
  selectFlight: (id) => set({ selectedFlightId: id }),
  selectGroundUnit: (id) => set({ selectedGroundUnitId: id }),
  togglePanel: (panel) =>
    set((state) => ({
      panels: { ...state.panels, [panel]: !state.panels[panel] },
    })),
  toggleTips: () => set((state) => ({ tipsEnabled: !state.tipsEnabled })),
  setCamera: (camera) =>
    set((state) => ({ camera: { ...state.camera, ...camera } })),
}));
