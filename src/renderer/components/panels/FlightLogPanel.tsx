import React from 'react';
import { FlightState, AltitudeBand, DamageLevel } from '@engine/state/GameState';

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
    marginTop: 8,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#0f3460',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callsign: {
    letterSpacing: 1,
  },
  side: {
    fontSize: 10,
    opacity: 0.7,
  },
  body: {
    padding: '8px 10px',
    fontSize: 11,
    lineHeight: 1.8,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #0f3460',
    paddingBottom: 2,
    marginBottom: 2,
  },
  label: {
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ddd',
    fontFamily: 'monospace',
  },
  aircraft: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  aircraftBox: {
    width: 28,
    height: 28,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    border: '1px solid',
  },
  marker: {
    display: 'inline-block',
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 4,
    marginTop: 4,
  },
};

const ALT_LABELS: Record<AltitudeBand, string> = {
  deck: 'DECK',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  veryHigh: 'V.HIGH',
};

const DAMAGE_COLORS: Record<DamageLevel, { bg: string; border: string; text: string }> = {
  none: { bg: '#1a3a1a', border: '#2a6a2a', text: '#4a4' },
  damaged: { bg: '#3a3a1a', border: '#6a6a2a', text: '#aa4' },
  crippled: { bg: '#3a1a1a', border: '#6a2a2a', text: '#a44' },
  shotdown: { bg: '#2a1a1a', border: '#4a1a1a', text: '#644' },
};

const MARKER_STYLES: Record<string, { bg: string; color: string }> = {
  maneuver: { bg: '#665500', color: '#ffcc00' },
  bvrAvoid: { bg: '#004466', color: '#44aaff' },
  samAvoid: { bg: '#664400', color: '#ffaa44' },
  zoomClimb: { bg: '#006644', color: '#44ffaa' },
  disordered: { bg: '#663300', color: '#ff8800' },
  abort: { bg: '#660000', color: '#ff4444' },
  antiRadarTactics: { bg: '#440066', color: '#aa44ff' },
  lowFuel: { bg: '#664400', color: '#ffaa00' },
};

interface Props {
  flight: FlightState;
  isSelected?: boolean;
  onClick?: () => void;
}

const FlightLogPanel: React.FC<Props> = ({ flight, isSelected, onClick }) => {
  const sideColor = flight.side === 'nato' ? '#4488cc' : '#cc4444';
  const acAlive = flight.aircraft.filter((a) => a.damage !== 'shotdown').length;

  return (
    <div
      style={{
        ...styles.panel,
        borderColor: isSelected ? sideColor : '#0f3460',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div style={{ ...styles.header, backgroundColor: isSelected ? sideColor : '#0f3460' }}>
        <span style={styles.callsign}>{flight.id}</span>
        <span style={styles.side}>
          {flight.aircraftType} · {flight.task.toUpperCase()}
        </span>
      </div>

      <div style={styles.body}>
        {/* Position info */}
        <div style={styles.row}>
          <span style={styles.label}>Position</span>
          <span style={styles.value}>
            {flight.hex.col.toString().padStart(2, '0')}
            {flight.hex.row.toString().padStart(2, '0')}
            {' '}@ {ALT_LABELS[flight.altitude]}
          </span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Heading</span>
          <span style={styles.value}>{flight.heading}°</span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Speed</span>
          <span style={styles.value}>
            {flight.speed > 0
              ? `${flight.mpRemaining}/${flight.speed} MP (${flight.throttle})`
              : `— (${flight.throttle})`}
          </span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Detection</span>
          <span style={{ ...styles.value, color: flight.detected ? '#ff8888' : '#88ff88' }}>
            {flight.detected ? 'DETECTED' : 'UNDETECTED'}
          </span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Fuel</span>
          <span style={styles.value}>
            {flight.fuelUsed}/{flight.fuelAllowance}
          </span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Aggression</span>
          <span style={styles.value}>
            {flight.aggressionValue >= 0 ? '+' : ''}{flight.aggressionValue}
          </span>
        </div>

        {/* Aircraft status boxes */}
        <div style={styles.label}>Aircraft ({acAlive}/{flight.aircraft.length})</div>
        <div style={styles.aircraft}>
          {flight.aircraft.map((ac) => {
            const dc = DAMAGE_COLORS[ac.damage];
            return (
              <div
                key={ac.index}
                style={{
                  ...styles.aircraftBox,
                  backgroundColor: dc.bg,
                  borderColor: dc.border,
                  color: dc.text,
                  textDecoration: ac.damage === 'shotdown' ? 'line-through' : 'none',
                }}
                title={`Aircraft #${ac.index}: ${ac.damage}`}
              >
                #{ac.index}
              </div>
            );
          })}
        </div>

        {/* Weapons */}
        {flight.aircraft[0]?.airToAirWeapons.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <span style={styles.label}>Weapons</span>
            <div style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>
              {flight.aircraft[0].airToAirWeapons.map((w) => (
                <span
                  key={w.weaponId}
                  style={{
                    marginRight: 8,
                    color: w.depleted ? '#666' : '#aaa',
                    textDecoration: w.depleted ? 'line-through' : 'none',
                  }}
                >
                  {w.weaponId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Markers */}
        {flight.markers.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {flight.markers.map((m) => {
              const ms = MARKER_STYLES[m] ?? { bg: '#333', color: '#999' };
              return (
                <span
                  key={m}
                  style={{
                    ...styles.marker,
                    backgroundColor: ms.bg,
                    color: ms.color,
                  }}
                >
                  {m.toUpperCase()}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightLogPanel;
