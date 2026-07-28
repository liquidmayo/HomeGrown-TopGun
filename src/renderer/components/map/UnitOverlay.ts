/**
 * Draws flight and ground unit markers on the hex map.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FlightState, GroundUnitState, Side } from '@engine/state/GameState';
import { hexToPixel, HEX_SIZE } from '@engine/hex';

// ── Style Constants ──────────────────────────────────────────────

const SIDE_COLORS: Record<Side, number> = {
  nato: 0x3366cc,
  wp: 0xcc3333,
};

const FLIGHT_LABEL_STYLE = new TextStyle({
  fontSize: 8,
  fill: '#ffffff',
  fontFamily: 'monospace',
  fontWeight: 'bold',
});

const GROUND_LABEL_STYLE = new TextStyle({
  fontSize: 7,
  fill: '#ffffff',
  fontFamily: 'monospace',
});

const ALT_LABELS: Record<string, string> = {
  deck: 'DK',
  low: 'LO',
  medium: 'MD',
  high: 'HI',
  veryHigh: 'VH',
};

// ── Drawing Functions ────────────────────────────────────────────

/**
 * Draw all flight counters onto the given container.
 */
export function drawFlights(
  container: Container,
  flights: Record<string, FlightState>
): void {
  for (const flight of Object.values(flights)) {
    const { x, y } = hexToPixel(flight.hex.col, flight.hex.row);
    const color = SIDE_COLORS[flight.side];

    const group = new Container();

    // Flight counter (rectangle with pointed front)
    const counter = new Graphics();
    const w = 22;
    const h = 14;

    // Draw a pointed counter showing heading
    const headingRad = (flight.heading * Math.PI) / 180;
    counter.beginPath();

    // Simple rectangle for now, rotated to show heading
    const cos = Math.cos(headingRad);
    const sin = Math.sin(headingRad);

    // Four corners of a rectangle centered at origin, rotated
    const corners = [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2 + 4, y: 0 },  // Pointed front
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ];

    const rotated = corners.map((c) => ({
      x: x + c.x * cos - c.y * sin,
      y: y + c.x * sin + c.y * cos,
    }));

    counter.moveTo(rotated[0].x, rotated[0].y);
    for (let i = 1; i < rotated.length; i++) {
      counter.lineTo(rotated[i].x, rotated[i].y);
    }
    counter.closePath();

    // Fill: solid for detected, semi-transparent for undetected
    const alpha = flight.detected ? 0.9 : 0.5;
    counter.fill({ color, alpha });
    counter.stroke({ width: 1, color: 0xffffff, alpha: 0.7 });

    group.addChild(counter);

    // Callsign label
    const label = new Text({
      text: flight.isDummy ? '?' : flight.id,
      style: FLIGHT_LABEL_STYLE,
    });
    label.x = x - 10;
    label.y = y - 5;
    group.addChild(label);

    // Altitude indicator (small text below)
    const altText = new Text({
      text: ALT_LABELS[flight.altitude] ?? '',
      style: new TextStyle({
        fontSize: 7,
        fill: flight.side === 'nato' ? '#88bbff' : '#ff8888',
        fontFamily: 'monospace',
      }),
    });
    altText.x = x - 6;
    altText.y = y + 8;
    group.addChild(altText);

    // Aircraft count indicator
    const acCount = flight.aircraft.filter((a) => a.damage !== 'shotdown').length;
    if (acCount > 0) {
      const countText = new Text({
        text: `×${acCount}`,
        style: new TextStyle({
          fontSize: 7,
          fill: '#cccccc',
          fontFamily: 'monospace',
        }),
      });
      countText.x = x + 10;
      countText.y = y - 12;
      group.addChild(countText);
    }

    // Disorder/Abort markers
    if (flight.disordered) {
      const marker = new Graphics();
      marker.circle(x + 14, y - 8, 3);
      marker.fill({ color: 0xffaa00 });
      group.addChild(marker);
    }
    if (flight.aborted) {
      const marker = new Graphics();
      marker.circle(x + 14, y - 2, 3);
      marker.fill({ color: 0xff0000 });
      group.addChild(marker);
    }

    container.addChild(group);
  }
}

/**
 * Draw all ground unit markers onto the given container.
 */
export function drawGroundUnits(
  container: Container,
  units: Record<string, GroundUnitState>
): void {
  for (const unit of Object.values(units)) {
    if (unit.hidden) continue;

    const { x, y } = hexToPixel(unit.hex.col, unit.hex.row);
    const color = SIDE_COLORS[unit.side];

    const group = new Container();

    // Unit symbol
    const symbol = new Graphics();

    if (unit.type === 'sam') {
      // SAM: triangle
      symbol.moveTo(x, y - 8);
      symbol.lineTo(x + 7, y + 5);
      symbol.lineTo(x - 7, y + 5);
      symbol.closePath();
      symbol.fill({ color, alpha: 0.8 });
      symbol.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
    } else if (unit.type === 'ewr') {
      // EWR: diamond
      symbol.moveTo(x, y - 7);
      symbol.lineTo(x + 7, y);
      symbol.lineTo(x, y + 7);
      symbol.lineTo(x - 7, y);
      symbol.closePath();
      symbol.fill({ color, alpha: 0.7 });
      symbol.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
    } else if (unit.type === 'aaaConcentation' || unit.type === 'radarAAA' || unit.type === 'mobileAAA') {
      // AAA: small square
      symbol.rect(x - 5, y - 5, 10, 10);
      symbol.fill({ color, alpha: 0.7 });
      symbol.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
    } else {
      // Army ground unit: rectangle
      symbol.rect(x - 7, y - 5, 14, 10);
      symbol.fill({ color, alpha: 0.6 });
      symbol.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    }

    group.addChild(symbol);

    // Label
    const label = new Text({
      text: unit.subType,
      style: GROUND_LABEL_STYLE,
    });
    label.x = x - 12;
    label.y = y + 8;
    group.addChild(label);

    // Radar on/off indicator for SAMs and EWR
    if ((unit.type === 'sam' || unit.type === 'ewr') && unit.radarOn) {
      const radarDot = new Graphics();
      radarDot.circle(x + 9, y - 9, 2);
      radarDot.fill({ color: 0x00ff00 });
      group.addChild(radarDot);
    }

    container.addChild(group);
  }
}
