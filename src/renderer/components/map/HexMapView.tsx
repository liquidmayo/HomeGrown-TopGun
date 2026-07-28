import React, { useRef, useEffect, useCallback } from 'react';
import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { HexCoord, HexData, hexToId } from '@engine/state/GameState';
import {
  HEX_SIZE, HEX_WIDTH, HEX_HEIGHT,
  hexToPixel, pixelToHex, hexCorners,
} from '@engine/hex';
import { drawFlights, drawGroundUnits } from './UnitOverlay';
import { useMovementStore } from '../../store/movementStore';

// Map dimensions (columns 00-79, rows 00-50)
const MAP_COLS = 80;
const MAP_ROWS = 51;

// ── Terrain Colors ────────────────────────────────────────────────

const TERRAIN_FILL: Record<string, { color: number; alpha: number }> = {
  land:     { color: 0xc8c4a0, alpha: 0.65 },
  rough:    { color: 0x7ba858, alpha: 0.75 },
  mountain: { color: 0x5b7040, alpha: 0.80 },
  urban:    { color: 0xd08898, alpha: 0.75 },
  river:    { color: 0x4888cc, alpha: 0.70 },
  road:     { color: 0xc8c0a0, alpha: 0.65 },
  highway:  { color: 0xc8c0a0, alpha: 0.65 },
  default:  { color: 0xa8a088, alpha: 0.50 },
};

// ── Render Helpers ────────────────────────────────────────────────

function getHexFill(hexData: HexData | undefined): { color: number; alpha: number } {
  if (!hexData || hexData.terrain.length === 0) return TERRAIN_FILL.default;

  // Priority: mountain > rough > urban > river > road > land
  const priority = ['mountain', 'rough', 'urban', 'river', 'road', 'land'];
  for (const t of priority) {
    if (hexData.terrain.includes(t as any)) {
      return TERRAIN_FILL[t] ?? TERRAIN_FILL.default;
    }
  }
  return TERRAIN_FILL.default;
}

const COORD_TEXT_STYLE = new TextStyle({
  fontSize: 9,
  fill: '#334',
  fontFamily: 'monospace',
});

const AIRFIELD_TEXT_STYLE = new TextStyle({
  fontSize: 8,
  fill: '#1144aa',
  fontFamily: 'Segoe UI, sans-serif',
  fontWeight: 'bold',
});

// ── Component ─────────────────────────────────────────────────────

const HexMapView: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const mapContainerRef = useRef<Container | null>(null);
  const highlightRef = useRef<Graphics | null>(null);
  const hoverHighlightRef = useRef<Graphics | null>(null);

  const { selectHex, camera, setCamera } = useUIStore();
  const { gameState, gameActive } = useGameStore();
  const { validMoveHexes } = useMovementStore();

  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });

  const initPixi = useCallback(async () => {
    if (!canvasRef.current || appRef.current) return;

    const app = new Application();
    await app.init({
      resizeTo: canvasRef.current,
      backgroundColor: 0x141428,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    canvasRef.current.appendChild(app.canvas as HTMLCanvasElement);
    appRef.current = app;

    // Map container for pan/zoom
    const mapContainer = new Container();
    mapContainer.eventMode = 'static';
    app.stage.addChild(mapContainer);
    mapContainerRef.current = mapContainer;

    // Layer 0: Hex grid with terrain
    const gridLayer = new Container();
    mapContainer.addChild(gridLayer);
    drawHexGrid(gridLayer, gameState.hexes);

    // Layer 1: Front line (if game active)
    if (gameActive && gameState.frontHexes.length > 0) {
      const frontLayer = new Graphics();
      drawFrontLine(frontLayer, gameState.frontHexes);
      mapContainer.addChild(frontLayer);
    }

    // Layer 2: Ground units
    if (gameActive) {
      const groundLayer = new Container();
      drawGroundUnits(groundLayer, gameState.groundUnits);
      mapContainer.addChild(groundLayer);
    }

    // Layer 3: Flight units
    if (gameActive) {
      const flightLayer = new Container();
      drawFlights(flightLayer, gameState.flights);
      mapContainer.addChild(flightLayer);
    }

    // Layer 4: Valid move highlights
    if (validMoveHexes.length > 0) {
      const moveHighlights = new Graphics();
      for (const vh of validMoveHexes) {
        const { x, y } = hexToPixel(vh.hex.col, vh.hex.row);
        const corners = hexCorners(x, y, HEX_SIZE - 2);
        moveHighlights.poly(corners);
        moveHighlights.fill({ color: 0x44ff44, alpha: 0.2 });
        moveHighlights.stroke({ width: 2, color: 0x44ff44, alpha: 0.7 });
      }
      mapContainer.addChild(moveHighlights);
    }

    // Layer 5: Selection highlight
    const highlight = new Graphics();
    highlight.visible = false;
    mapContainer.addChild(highlight);
    highlightRef.current = highlight;

    // Layer 5: Hover highlight
    const hoverHighlight = new Graphics();
    hoverHighlight.visible = false;
    mapContainer.addChild(hoverHighlight);
    hoverHighlightRef.current = hoverHighlight;

    // ── Mouse interaction ──
    const canvas = app.canvas as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const localX = (e.clientX - rect.left - mapContainer.x) / mapContainer.scale.x;
      const localY = (e.clientY - rect.top - mapContainer.y) / mapContainer.scale.y;
      const hex = pixelToHex(localX, localY);

      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        mapContainer.x += dx;
        mapContainer.y += dy;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
      }

      // Hover highlight
      if (hoverHighlightRef.current && hex.col >= 0 && hex.col < MAP_COLS && hex.row >= 0 && hex.row < MAP_ROWS) {
        const { x, y } = hexToPixel(hex.col, hex.row);
        hoverHighlightRef.current.clear();
        hoverHighlightRef.current.poly(hexCorners(x, y, HEX_SIZE - 1));
        hoverHighlightRef.current.stroke({ width: 1.5, color: 0x88aacc, alpha: 0.6 });
        hoverHighlightRef.current.visible = true;
      }
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      canvas.style.cursor = 'grab';
      if (!dragRef.current.dragging) return;

      const totalDrag =
        Math.abs(e.clientX - dragRef.current.startX) +
        Math.abs(e.clientY - dragRef.current.startY);
      dragRef.current.dragging = false;

      // Treat as click if barely moved
      if (totalDrag < 5) {
        const rect = canvas.getBoundingClientRect();
        const localX = (e.clientX - rect.left - mapContainer.x) / mapContainer.scale.x;
        const localY = (e.clientY - rect.top - mapContainer.y) / mapContainer.scale.y;
        const hex = pixelToHex(localX, localY);

        if (hex.col >= 0 && hex.col < MAP_COLS && hex.row >= 0 && hex.row < MAP_ROWS) {
          selectHex(hex);

          if (highlightRef.current) {
            const { x: hx, y: hy } = hexToPixel(hex.col, hex.row);
            highlightRef.current.clear();
            highlightRef.current.poly(hexCorners(hx, hy, HEX_SIZE - 1));
            highlightRef.current.stroke({ width: 2.5, color: 0xe94560 });
            highlightRef.current.visible = true;
          }
        }
      }
    });

    canvas.addEventListener('pointerleave', () => {
      dragRef.current.dragging = false;
      canvas.style.cursor = 'grab';
      if (hoverHighlightRef.current) hoverHighlightRef.current.visible = false;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.15, Math.min(4, mapContainer.scale.x * zoomFactor));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - mapContainer.x) / mapContainer.scale.x;
      const worldY = (mouseY - mapContainer.y) / mapContainer.scale.y;

      mapContainer.scale.set(newScale);
      mapContainer.x = mouseX - worldX * newScale;
      mapContainer.y = mouseY - worldY * newScale;
    }, { passive: false });

    // Center the view on the play area if game is active
    if (gameActive && Object.keys(gameState.hexes).length > 0) {
      // Find bounds of hexes that exist
      const hexIds = Object.keys(gameState.hexes);
      let minCol = 79, maxCol = 0, minRow = 50, maxRow = 0;
      for (const id of hexIds) {
        const c = parseInt(id.substring(0, 2), 10);
        const r = parseInt(id.substring(2, 4), 10);
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }

      const centerPixel = hexToPixel(
        Math.floor((minCol + maxCol) / 2),
        Math.floor((minRow + maxRow) / 2)
      );

      const canvasWidth = canvasRef.current?.clientWidth ?? 1200;
      const canvasHeight = canvasRef.current?.clientHeight ?? 800;

      // Calculate zoom to fit the play area
      const areaWidthPx = (maxCol - minCol + 1) * HEX_WIDTH * 0.75;
      const areaHeightPx = (maxRow - minRow + 1) * HEX_HEIGHT;
      const zoomX = canvasWidth / areaWidthPx;
      const zoomY = canvasHeight / areaHeightPx;
      const zoom = Math.min(zoomX, zoomY) * 1.8; // Zoom in for detail

      mapContainer.scale.set(zoom);
      mapContainer.x = canvasWidth / 2 - centerPixel.x * zoom;
      mapContainer.y = canvasHeight / 2 - centerPixel.y * zoom;
    } else {
      // Default view: center on map
      mapContainer.x = 50;
      mapContainer.y = 50;
      mapContainer.scale.set(0.55);
    }

  }, [gameActive, gameState.hexes, gameState.frontHexes, gameState.flights, gameState.groundUnits, validMoveHexes, selectHex]);

  useEffect(() => {
    initPixi();
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        mapContainerRef.current = null;
        highlightRef.current = null;
        hoverHighlightRef.current = null;
      }
    };
  }, [initPixi]);

  return (
    <div
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
    />
  );
};

// ── Drawing Functions ─────────────────────────────────────────────

function drawHexGrid(
  container: Container,
  hexData: Record<string, HexData>
): void {
  // Terrain fill layer
  const terrainGraphics = new Graphics();
  // Grid line layer (drawn on top of terrain)
  const gridGraphics = new Graphics();
  // Coordinate labels
  const labelContainer = new Container();
  // Airfield markers
  const airfieldContainer = new Container();

  // Determine which hexes to draw: only those with data if data exists, else full grid
  const hasData = Object.keys(hexData).length > 0;
  const hexKeys = hasData
    ? Object.keys(hexData)
    : Array.from({ length: MAP_COLS * MAP_ROWS }, (_, i) => {
        const c = Math.floor(i / MAP_ROWS);
        const r = i % MAP_ROWS;
        return `${c.toString().padStart(2, '0')}${r.toString().padStart(2, '0')}`;
      });

  for (const hKey of hexKeys) {
    {
      const col = parseInt(hKey.substring(0, 2), 10);
      const row = parseInt(hKey.substring(2, 4), 10);
      const { x, y } = hexToPixel(col, row);
      const data = hexData[hKey];
      const corners = hexCorners(x, y, HEX_SIZE);

      // Fill hex with terrain color
      const fill = getHexFill(data);
      terrainGraphics.poly(corners);
      terrainGraphics.fill({ color: fill.color, alpha: fill.alpha });

      // East Germany shading
      if (data?.isEastGermany) {
        terrainGraphics.poly(corners);
        terrainGraphics.fill({ color: 0x440000, alpha: 0.08 });
      }

      // Grid lines
      gridGraphics.poly(corners);
      gridGraphics.stroke({ width: 0.6, color: 0x334455, alpha: 0.6 });

      // Coordinate label (show every other hex to reduce clutter)
      if ((col + row) % 2 === 0) {
        const label = new Text({
          text: hKey,
          style: COORD_TEXT_STYLE,
        });
        label.x = x - 10;
        label.y = y - 4;
        labelContainer.addChild(label);
      }

      // Airfield marker
      if (data?.isAirfield) {
        // Draw a small runway indicator
        const af = new Graphics();
        af.rect(x - 8, y - 1, 16, 2);
        af.fill({ color: 0x2255aa, alpha: 0.8 });
        af.circle(x, y, 4);
        af.stroke({ width: 1, color: 0x2255aa, alpha: 0.8 });
        airfieldContainer.addChild(af);

        // Airfield name
        if (data.airfieldId) {
          const nameLabel = new Text({
            text: `${data.airfieldId} (${data.airfieldClass})`,
            style: AIRFIELD_TEXT_STYLE,
          });
          nameLabel.x = x - 20;
          nameLabel.y = y + 8;
          airfieldContainer.addChild(nameLabel);
        }
      }

      // River indicator (blue border)
      if (data?.terrain.includes('river')) {
        gridGraphics.poly(corners);
        gridGraphics.stroke({ width: 1.5, color: 0x4488cc, alpha: 0.5 });
      }
    }
  }

  container.addChild(terrainGraphics);
  container.addChild(gridGraphics);
  container.addChild(labelContainer);
  container.addChild(airfieldContainer);
}

function drawFrontLine(graphics: Graphics, frontHexes: HexCoord[]): void {
  if (frontHexes.length < 2) return;

  graphics.moveTo(
    ...(() => {
      const p = hexToPixel(frontHexes[0].col, frontHexes[0].row);
      return [p.x, p.y] as [number, number];
    })()
  );

  for (let i = 1; i < frontHexes.length; i++) {
    const p = hexToPixel(frontHexes[i].col, frontHexes[i].row);
    graphics.lineTo(p.x, p.y);
  }

  graphics.stroke({ width: 3, color: 0xff2222, alpha: 0.7 });
}

export default HexMapView;
