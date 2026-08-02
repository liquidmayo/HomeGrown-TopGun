/**
 * Hex Map View — renders the game map using HTML5 Canvas 2D (no WebGL required).
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { HexCoord, HexData, FlightState, GroundUnitState, hexToId } from '@engine/state/GameState';
import { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT, hexToPixel, pixelToHex, hexCorners } from '@engine/hex';
import { useMovementStore } from '../../store/movementStore';

const MAP_COLS = 80;
const MAP_ROWS = 51;

// ── Colors ───────────────────────────────────────────────────────

const TERRAIN_COLORS: Record<string, string> = {
  land: '#c8c4a0', rough: '#7ba858', mountain: '#4b6838',
  urban: '#d08898', river: '#4888cc', road: '#b8b498',
  default: '#a8a088',
};

const SIDE_COLORS = { nato: '#3366cc', wp: '#cc3333' };
const ALT_SHORT: Record<string, string> = { deck: 'DK', low: 'LO', medium: 'MD', high: 'HI', veryHigh: 'VH' };

// ── Component ────────────────────────────────────────────────────

// ── Map background image bounds ──────────────────────────────────
// The board game map image maps to the hex grid world space.
const MAP_WORLD_X = 0;      // Left edge in world pixels
const MAP_WORLD_Y = 0;
const MAP_WORLD_W = 3374;   // hexToPixel(79,0).x + HEX_SIZE
const MAP_WORLD_H = 2498;   // hexToPixel(0,50).y + HEX_HEIGHT/2

const HexMapView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const mapImageLoadedRef = useRef(false);
  const { selectHex } = useUIStore();
  const { gameState, gameActive } = useGameStore();
  const { validMoveHexes } = useMovementStore();

  const camRef = useRef({ x: 0, y: 0, zoom: 2.0 });
  const dragRef = useRef({ dragging: false, sx: 0, sy: 0, lx: 0, ly: 0 });
  const selectedHexRef = useRef<HexCoord | null>(null);

  // Load the board game map image — try multiple paths for dev and production
  useEffect(() => {
    const tryLoad = (paths: string[], idx: number = 0) => {
      if (idx >= paths.length) return;
      const img = new Image();
      img.onload = () => {
        mapImageRef.current = img;
        mapImageLoadedRef.current = true;
      };
      img.onerror = () => tryLoad(paths, idx + 1);
      img.src = paths[idx];
    };
    tryLoad([
      '../../../Red Storm [GMT Games]Map.png',           // Dev: relative from renderer
      './Red Storm [GMT Games]Map.png',                  // Production: same dir as index.html
      'Red Storm [GMT Games]Map.png',                    // Direct
    ]);
  }, []);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const c = camRef.current;
    return { x: (sx - c.x) / c.zoom, y: (sy - c.y) / c.zoom };
  }, []);

  // ── Draw everything ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cam = camRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#141428';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // ── Draw board game map background ──
    if (mapImageLoadedRef.current && mapImageRef.current) {
      ctx.drawImage(mapImageRef.current, MAP_WORLD_X, MAP_WORLD_Y, MAP_WORLD_W, MAP_WORLD_H);
    }

    const hexKeys = Object.keys(gameState.hexes);
    const hexData = gameState.hexes;

    // ── Draw hex terrain (semi-transparent overlay when map image loaded) ──
    for (const hk of hexKeys) {
      const col = parseInt(hk.substring(0, 2), 10);
      const row = parseInt(hk.substring(2, 4), 10);
      const { x, y } = hexToPixel(col, row);
      const data = hexData[hk];
      const corners = hexCorners(x, y, HEX_SIZE);

      // Fill
      let fillColor = TERRAIN_COLORS.default;
      for (const t of ['mountain', 'rough', 'urban', 'river', 'road', 'land']) {
        if (data?.terrain.includes(t as any)) { fillColor = TERRAIN_COLORS[t]; break; }
      }

      ctx.beginPath();
      ctx.moveTo(corners[0], corners[1]);
      for (let i = 2; i < corners.length; i += 2) ctx.lineTo(corners[i], corners[i + 1]);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = mapImageLoadedRef.current ? 0.15 : 0.7;
      ctx.fill();

      // East Germany tint
      if (data?.isEastGermany) {
        ctx.fillStyle = '#440000';
        ctx.globalAlpha = 0.1;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Grid outline
      ctx.strokeStyle = '#334455';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // River highlight
      if (data?.terrain.includes('river')) {
        ctx.strokeStyle = '#4488cc';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Coordinate label
      ctx.fillStyle = '#556';
      ctx.font = '8px monospace';
      ctx.fillText(hk, x - 10, y + 3);

      // Airfield marker
      if (data?.isAirfield) {
        ctx.fillStyle = '#2255cc';
        ctx.fillRect(x - 10, y - 8, 20, 3);
        ctx.beginPath();
        ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#2255cc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (data.airfieldId) {
          ctx.fillStyle = '#2255cc';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(`${data.airfieldId} (${data.airfieldClass})`, x - 22, y + 14);
        }
      }
    }

    // ── Front line ──
    if (gameActive && gameState.frontHexes.length > 1) {
      ctx.beginPath();
      const p0 = hexToPixel(gameState.frontHexes[0].col, gameState.frontHexes[0].row);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < gameState.frontHexes.length; i++) {
        const p = hexToPixel(gameState.frontHexes[i].col, gameState.frontHexes[i].row);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Ground units ──
    if (gameActive) {
      for (const unit of Object.values(gameState.groundUnits)) {
        if (unit.hidden) continue;
        const { x, y } = hexToPixel(unit.hex.col, unit.hex.row);
        const color = SIDE_COLORS[unit.side];

        ctx.globalAlpha = 0.85;
        if (unit.type === 'sam') {
          // Triangle
          ctx.beginPath();
          ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6);
          ctx.closePath();
          ctx.fillStyle = color; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        } else if (unit.type === 'ewr') {
          // Diamond
          ctx.beginPath();
          ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y);
          ctx.closePath();
          ctx.fillStyle = color; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        } else {
          // Rectangle
          ctx.fillStyle = color;
          ctx.fillRect(x - 8, y - 6, 16, 12);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
          ctx.strokeRect(x - 8, y - 6, 16, 12);
        }
        ctx.globalAlpha = 1;

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(unit.subType, x - 14, y + 18);

        // Radar indicator
        if ((unit.type === 'sam' || unit.type === 'ewr') && unit.radarOn) {
          ctx.fillStyle = '#00ff00';
          ctx.beginPath(); ctx.arc(x + 10, y - 10, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // ── Flight units ──
    if (gameActive) {
      for (const flight of Object.values(gameState.flights)) {
        const { x, y } = hexToPixel(flight.hex.col, flight.hex.row);
        const color = SIDE_COLORS[flight.side];
        const acCount = flight.aircraft.filter((a) => a.damage !== 'shotdown').length;

        // Counter background
        const headRad = (flight.heading * Math.PI) / 180;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(headRad);

        ctx.globalAlpha = flight.detected ? 0.95 : 0.6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-14, -9); ctx.lineTo(14, -9); ctx.lineTo(18, 0);
        ctx.lineTo(14, 9); ctx.lineTo(-14, 9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Callsign
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(flight.isDummy ? '?' : flight.id, x - 12, y + 4);

        // Altitude
        ctx.fillStyle = flight.side === 'nato' ? '#88bbff' : '#ff8888';
        ctx.font = '8px monospace';
        ctx.fillText(ALT_SHORT[flight.altitude] ?? '', x - 6, y + 14);

        // Aircraft count
        ctx.fillStyle = '#ccc';
        ctx.font = '8px monospace';
        ctx.fillText(`×${acCount}`, x + 12, y - 8);

        // Status markers
        if (flight.disordered) {
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath(); ctx.arc(x + 16, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        }
        if (flight.aborted) {
          ctx.fillStyle = '#ff0000';
          ctx.beginPath(); ctx.arc(x + 16, y + 4, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // ── SAM range rings ──
    if (gameActive) {
      for (const unit of Object.values(gameState.groundUnits)) {
        if (unit.type !== 'sam' || unit.damage === 'destroyed') continue;
        if (!unit.located && !unit.isSAMWarning) continue;
        const { x, y } = hexToPixel(unit.hex.col, unit.hex.row);
        const color = unit.side === 'nato' ? '#4488cc' : '#cc4444';

        // Acquisition range ring (dashed)
        const samTypes: Record<string, number> = {
          'HAWK_C': 15, 'HAWK_D': 18, 'Patriot': 25, 'Nike_Hercules': 20,
          'Roland_2': 6, 'Rapier': 5, 'SA-2': 20, 'SA-4': 20, 'SA-6': 12,
          'SA-8': 8, 'SA-11': 14, 'SA-12': 25, 'SA-13': 4,
        };
        const acqRange = samTypes[unit.subType] ?? 10;
        const acqPx = acqRange * HEX_WIDTH * 0.75;

        ctx.beginPath();
        ctx.arc(x, y, acqPx, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = unit.radarOn ? 0.35 : 0.1;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Attack range ring (solid, if radar on)
        if (unit.radarOn) {
          const atkTypes: Record<string, number> = {
            'HAWK_C': 12, 'HAWK_D': 14, 'Patriot': 20, 'Nike_Hercules': 18,
            'Roland_2': 4, 'Rapier': 4, 'SA-2': 18, 'SA-4': 16, 'SA-6': 10,
            'SA-8': 6, 'SA-11': 12, 'SA-12': 20, 'SA-13': 4,
          };
          const atkRange = atkTypes[unit.subType] ?? 8;
          const atkPx = atkRange * HEX_WIDTH * 0.75;

          ctx.beginPath();
          ctx.arc(x, y, atkPx, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Flight path lines ──
    if (gameActive) {
      for (const flight of Object.values(gameState.flights)) {
        if (!flight.flightPath || flight.flightPath.length < 2) continue;
        const color = flight.side === 'nato' ? '#4488ff' : '#ff4444';

        ctx.beginPath();
        const p0 = hexToPixel(flight.flightPath[0].hex.col, flight.flightPath[0].hex.row);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < flight.flightPath.length; i++) {
          const p = hexToPixel(flight.flightPath[i].hex.col, flight.flightPath[i].hex.row);
          ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Waypoint markers
        for (const wp of flight.flightPath) {
          const p = hexToPixel(wp.hex.col, wp.hex.row);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Valid move highlights ──
    if (validMoveHexes.length > 0) {
      for (const vh of validMoveHexes) {
        const { x, y } = hexToPixel(vh.hex.col, vh.hex.row);
        const corners = hexCorners(x, y, HEX_SIZE - 1);

        ctx.beginPath();
        ctx.moveTo(corners[0], corners[1]);
        for (let i = 2; i < corners.length; i += 2) ctx.lineTo(corners[i], corners[i + 1]);
        ctx.closePath();
        ctx.fillStyle = '#44ff44';
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.strokeStyle = '#44ff44';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ── Selected hex highlight ──
    if (selectedHexRef.current) {
      const { x, y } = hexToPixel(selectedHexRef.current.col, selectedHexRef.current.row);
      const corners = hexCorners(x, y, HEX_SIZE - 1);
      ctx.beginPath();
      ctx.moveTo(corners[0], corners[1]);
      for (let i = 2; i < corners.length; i += 2) ctx.lineTo(corners[i], corners[i + 1]);
      ctx.closePath();
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }, [gameState, gameActive, validMoveHexes]);

  // ── Resize canvas to fill container ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        draw();
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // ── Redraw on state changes ──
  useEffect(() => { draw(); }, [draw]);

  // ── Center camera when scenario loads ──
  useEffect(() => {
    if (!canvasRef.current || !gameActive) return;
    const humanFlights = Object.values(gameState.flights).filter(
      (f) => f.side === gameState.humanSide && !f.isOnGround
    );
    const centerFlight = humanFlights[0] ?? Object.values(gameState.flights)[0];
    if (centerFlight) {
      const cp = hexToPixel(centerFlight.hex.col, centerFlight.hex.row);
      const cw = canvasRef.current.width;
      const ch = canvasRef.current.height;
      camRef.current = { x: cw / 2 - cp.x * 2.5, y: ch / 2 - cp.y * 2.5, zoom: 2.5 };
      draw();
    }
  }, [gameState.scenarioId]);

  // ── Mouse handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { dragging: true, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current.dragging) {
      camRef.current.x += e.clientX - dragRef.current.lx;
      camRef.current.y += e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      draw();
    }
  }, [draw]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const totalDrag = Math.abs(e.clientX - dragRef.current.sx) + Math.abs(e.clientY - dragRef.current.sy);
    dragRef.current.dragging = false;
    if (totalDrag < 5 && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hex = pixelToHex(world.x, world.y);
      if (hex.col >= 0 && hex.col < MAP_COLS && hex.row >= 0 && hex.row < MAP_ROWS) {
        selectedHexRef.current = hex;
        selectHex(hex);
        draw();
      }
    }
  }, [draw, screenToWorld, selectHex]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const cam = camRef.current;
    const newZoom = Math.max(0.3, Math.min(5, cam.zoom * factor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - cam.x) / cam.zoom;
    const wy = (my - cam.y) / cam.zoom;
    cam.zoom = newZoom;
    cam.x = mx - wx * newZoom;
    cam.y = my - wy * newZoom;
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { dragRef.current.dragging = false; }}
      onWheel={handleWheel}
    />
  );
};

export default HexMapView;
