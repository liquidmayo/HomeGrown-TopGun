/**
 * Weather rules.
 * Reference: Rules section 22.0
 */

import { AltitudeBand, HexCoord, WeatherState, CloudLayer } from '../state/GameState';
import { roll1d10 } from './detection';

export interface WeatherRollResult {
  roll: number;
  column: 'good' | 'poor';
  conditions: WeatherConditions;
}

export interface WeatherConditions {
  haze: boolean;
  hazeMaxAltitude: AltitudeBand | null;
  mist: boolean;
  cloudLayers: CloudLayer[];
  goodContrast: boolean;
}

/** Weather Table (simplified). Rule 22.2 */
const WEATHER_TABLE: Record<'good' | 'poor', Record<number, WeatherConditions>> = {
  good: {
    1: { haze: false, hazeMaxAltitude: null, mist: false, cloudLayers: [], goodContrast: true },
    2: { haze: false, hazeMaxAltitude: null, mist: false, cloudLayers: [], goodContrast: true },
    3: { haze: false, hazeMaxAltitude: null, mist: false, cloudLayers: [], goodContrast: false },
    4: { haze: true, hazeMaxAltitude: 'low', mist: false, cloudLayers: [], goodContrast: false },
    5: { haze: true, hazeMaxAltitude: 'low', mist: false, cloudLayers: [], goodContrast: false },
    6: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'broken', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    7: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'broken', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    8: { haze: true, hazeMaxAltitude: 'deck', mist: false,
      cloudLayers: [{ type: 'broken', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    9: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'dense', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    10: { haze: false, hazeMaxAltitude: null, mist: true, cloudLayers: [], goodContrast: false },
  },
  poor: {
    1: { haze: false, hazeMaxAltitude: null, mist: false, cloudLayers: [], goodContrast: false },
    2: { haze: true, hazeMaxAltitude: 'low', mist: false, cloudLayers: [], goodContrast: false },
    3: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'broken', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    4: { haze: true, hazeMaxAltitude: 'deck', mist: false,
      cloudLayers: [{ type: 'broken', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    5: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'dense', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    6: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'dense', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    7: { haze: false, hazeMaxAltitude: null, mist: false,
      cloudLayers: [{ type: 'dense', betweenLow: 'deck', betweenHigh: 'low' },
        { type: 'broken', betweenLow: 'medium', betweenHigh: 'high' }], goodContrast: false },
    8: { haze: false, hazeMaxAltitude: null, mist: true,
      cloudLayers: [{ type: 'dense', betweenLow: 'low', betweenHigh: 'medium' }], goodContrast: false },
    9: { haze: false, hazeMaxAltitude: null, mist: true,
      cloudLayers: [{ type: 'dense', betweenLow: 'deck', betweenHigh: 'medium' }], goodContrast: false },
    10: { haze: false, hazeMaxAltitude: null, mist: true,
      cloudLayers: [{ type: 'dense', betweenLow: 'deck', betweenHigh: 'high' }], goodContrast: false },
  },
};

export function rollWeather(column: 'good' | 'poor'): WeatherRollResult {
  const roll = roll1d10();
  return { roll, column, conditions: WEATHER_TABLE[column][roll] };
}

/** Check if LOS passes through a cloud layer. Rule 22.1a */
export function isLOSBlockedByCloud(
  fromAlt: AltitudeBand, toAlt: AltitudeBand, weather: WeatherState
): boolean {
  const altOrder: AltitudeBand[] = ['deck', 'low', 'medium', 'high', 'veryHigh'];
  const fromIdx = altOrder.indexOf(fromAlt);
  const toIdx = altOrder.indexOf(toAlt);
  const lowIdx = Math.min(fromIdx, toIdx);
  const highIdx = Math.max(fromIdx, toIdx);

  for (const layer of weather.cloudLayers) {
    const layerLow = altOrder.indexOf(layer.betweenLow);
    const layerHigh = altOrder.indexOf(layer.betweenHigh);
    // Cloud blocks if the layer is between the two altitudes
    if (layer.type === 'dense' && layerLow >= lowIdx && layerHigh <= highIdx) return true;
  }
  return false;
}

/** Check if a flight is in haze. Rule 22.3 */
export function isInHaze(alt: AltitudeBand, weather: WeatherState): boolean {
  if (!weather.haze || !weather.hazeMaxAltitude) return false;
  const altOrder: AltitudeBand[] = ['deck', 'low', 'medium', 'high', 'veryHigh'];
  return altOrder.indexOf(alt) <= altOrder.indexOf(weather.hazeMaxAltitude);
}

/** Check if a flight is in mist. Rule 22.5 */
export function isInMist(alt: AltitudeBand, weather: WeatherState): boolean {
  return weather.mist && alt === 'deck';
}
