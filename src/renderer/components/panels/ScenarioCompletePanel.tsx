/**
 * End-of-scenario summary screen.
 * Shows detailed AAR with VP breakdown, kill list, flight status, and timeline.
 */

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { calculateVP, determineVictoryLevel, VPTally } from '@engine/rules/victory';
import { FlightState, hexToId } from '@engine/state/GameState';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e', borderRadius: 4, border: '2px solid #e94560',
    marginTop: 8, padding: 16, maxHeight: 600, overflowY: 'auto',
  },
  title: {
    color: '#e94560', fontWeight: 'bold', fontSize: 18, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center',
  },
  subtitle: {
    color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 16,
  },
  verdictBox: {
    padding: '12px 16px', borderRadius: 6, marginBottom: 16,
    textAlign: 'center', fontSize: 16, fontWeight: 'bold', letterSpacing: 1,
  },
  section: {
    marginBottom: 12, padding: '8px 10px', backgroundColor: '#0a1628',
    borderRadius: 4, border: '1px solid #0f3460',
  },
  sectionTitle: {
    color: '#44aaff', fontWeight: 'bold', fontSize: 12, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', fontSize: 11,
    color: '#ccc', lineHeight: 1.8, borderBottom: '1px solid #0f3460',
    padding: '1px 0',
  },
  label: { color: '#888' },
  value: { fontFamily: 'monospace', fontWeight: 'bold' },
  vpBar: {
    display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden',
    marginBottom: 8, border: '1px solid #333',
  },
  flightRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 6px', marginBottom: 2, borderRadius: 3, fontSize: 11,
    fontFamily: 'monospace',
  },
  alive: { backgroundColor: '#1a2a1a', border: '1px solid #2a5a2a', color: '#6c6' },
  damaged: { backgroundColor: '#2a2a1a', border: '1px solid #5a5a2a', color: '#cc6' },
  destroyed: { backgroundColor: '#2a1a1a', border: '1px solid #5a2a2a', color: '#c66' },
  timeline: {
    fontSize: 10, color: '#888', fontFamily: 'monospace', lineHeight: 1.6,
    maxHeight: 150, overflowY: 'auto',
  },
};

const VERDICT_COLORS: Record<string, { bg: string; color: string }> = {
  decisiveWin: { bg: '#1a3a1a', color: '#44ff44' },
  substantialWin: { bg: '#1a3a1a', color: '#88cc44' },
  marginalWin: { bg: '#1a2a1a', color: '#aacc44' },
  draw: { bg: '#2a2a1a', color: '#cccc44' },
  marginalLoss: { bg: '#2a1a1a', color: '#ccaa44' },
  substantialLoss: { bg: '#2a1a1a', color: '#cc6644' },
  decisiveLoss: { bg: '#3a1a1a', color: '#ff4444' },
};

const VERDICT_LABELS: Record<string, string> = {
  decisiveWin: 'DECISIVE VICTORY', substantialWin: 'SUBSTANTIAL VICTORY',
  marginalWin: 'MARGINAL VICTORY', draw: 'DRAW',
  marginalLoss: 'MARGINAL DEFEAT', substantialLoss: 'SUBSTANTIAL DEFEAT',
  decisiveLoss: 'DECISIVE DEFEAT',
};

function flightStatusText(f: FlightState): string {
  const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
  const dmg = f.aircraft.filter(a => a.damage === 'damaged').length;
  const crip = f.aircraft.filter(a => a.damage === 'crippled').length;
  const dead = f.aircraft.filter(a => a.damage === 'shotdown').length;
  let t = `${alive}/${f.aircraft.length} surviving`;
  if (dmg) t += `, ${dmg} damaged`;
  if (crip) t += `, ${crip} crippled`;
  if (dead) t += `, ${dead} shot down`;
  if (f.disordered) t += ' [DIS]';
  if (f.aborted) t += ' [ABT]';
  return t;
}

const ScenarioCompletePanel: React.FC = () => {
  const { gameState } = useGameStore();

  const natoVP = calculateVP(gameState, 'nato');
  const wpVP = calculateVP(gameState, 'wp');
  const victory = determineVictoryLevel(natoVP.total, wpVP.total, gameState.humanSide);
  const vc = VERDICT_COLORS[victory.level] ?? VERDICT_COLORS.draw;

  const natoFlights = Object.values(gameState.flights).filter(f => f.side === 'nato');
  const wpFlights = Object.values(gameState.flights).filter(f => f.side === 'wp');

  const combatEvents = gameState.eventLog.filter(e => e.type === 'combat' || e.type === 'random_event' || e.type === 'save');
  const totalNatoAc = natoFlights.reduce((s, f) => s + f.aircraft.length, 0);
  const totalWpAc = wpFlights.reduce((s, f) => s + f.aircraft.length, 0);
  const natoLost = natoFlights.reduce((s, f) => s + f.aircraft.filter(a => a.damage === 'shotdown').length, 0);
  const wpLost = wpFlights.reduce((s, f) => s + f.aircraft.filter(a => a.damage === 'shotdown').length, 0);

  const totalVP = Math.max(1, natoVP.total + wpVP.total);

  return (
    <div style={s.panel}>
      <div style={s.title}>Scenario Complete</div>
      <div style={s.subtitle}>{gameState.scenarioName} — Turn {gameState.turn}</div>

      {/* Verdict */}
      <div style={{ ...s.verdictBox, backgroundColor: vc.bg, color: vc.color, border: `2px solid ${vc.color}` }}>
        {VERDICT_LABELS[victory.level] ?? 'DRAW'}
      </div>

      {/* VP Bar */}
      <div style={s.vpBar}>
        <div style={{ width: `${(natoVP.total / totalVP) * 100}%`, backgroundColor: '#3366cc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
          NATO {natoVP.total}
        </div>
        <div style={{ width: `${(wpVP.total / totalVP) * 100}%`, backgroundColor: '#cc3333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
          WP {wpVP.total}
        </div>
      </div>

      {/* VP Breakdown */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Victory Points</div>
        <div style={s.row}><span style={s.label}>NATO VP Total</span><span style={{ ...s.value, color: '#4488cc' }}>{natoVP.total}</span></div>
        <div style={s.row}><span style={s.label}>  Aircraft shot down</span><span style={s.value}>{natoVP.aircraftShotDown}</span></div>
        <div style={s.row}><span style={s.label}>  Aircraft damaged</span><span style={s.value}>{natoVP.aircraftDamaged}</span></div>
        <div style={s.row}><span style={s.label}>  Crew captured</span><span style={s.value}>{natoVP.crewCaptured}</span></div>
        <div style={s.row}><span style={s.label}>  Ground targets</span><span style={s.value}>{natoVP.groundTargets}</span></div>
        <div style={s.row}><span style={s.label}>  SAMs destroyed</span><span style={s.value}>{natoVP.samDestroyed}</span></div>
        <div style={{ ...s.row, marginTop: 6 }}><span style={s.label}>WP VP Total</span><span style={{ ...s.value, color: '#cc4444' }}>{wpVP.total}</span></div>
        <div style={s.row}><span style={s.label}>  Aircraft shot down</span><span style={s.value}>{wpVP.aircraftShotDown}</span></div>
        <div style={s.row}><span style={s.label}>  Aircraft damaged</span><span style={s.value}>{wpVP.aircraftDamaged}</span></div>
        <div style={s.row}><span style={s.label}>  Crew captured</span><span style={s.value}>{wpVP.crewCaptured}</span></div>
        <div style={{ ...s.row, borderBottom: 'none' }}><span style={s.label}>Margin</span><span style={{ ...s.value, color: vc.color }}>{victory.margin >= 0 ? '+' : ''}{victory.margin}</span></div>
      </div>

      {/* Losses */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Losses Summary</div>
        <div style={s.row}><span style={s.label}>NATO aircraft lost</span><span style={s.value}>{natoLost} / {totalNatoAc}</span></div>
        <div style={s.row}><span style={s.label}>WP aircraft lost</span><span style={s.value}>{wpLost} / {totalWpAc}</span></div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.label}>Kill ratio</span>
          <span style={s.value}>{wpLost} : {natoLost} (NATO:WP kills)</span>
        </div>
      </div>

      {/* Flight Status */}
      <div style={s.section}>
        <div style={s.sectionTitle}>NATO Flight Status</div>
        {natoFlights.map(f => {
          const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
          const total = f.aircraft.length;
          const style = alive === 0 ? s.destroyed : alive < total ? s.damaged : s.alive;
          return (
            <div key={f.id} style={{ ...s.flightRow, ...style }}>
              <span>{f.id} ({f.aircraftType})</span>
              <span>{flightStatusText(f)}</span>
            </div>
          );
        })}
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>WP Flight Status</div>
        {wpFlights.map(f => {
          const alive = f.aircraft.filter(a => a.damage !== 'shotdown').length;
          const total = f.aircraft.length;
          const style = alive === 0 ? s.destroyed : alive < total ? s.damaged : s.alive;
          return (
            <div key={f.id} style={{ ...s.flightRow, ...style }}>
              <span>{f.id} ({f.aircraftType})</span>
              <span>{flightStatusText(f)}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {combatEvents.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Key Events</div>
          <div style={s.timeline}>
            {combatEvents.map((e, i) => (
              <div key={i}>T{e.turn} [{e.phase}] {e.message}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioCompletePanel;
