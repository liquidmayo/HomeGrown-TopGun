/**
 * Combat Resolution Dialog.
 *
 * Shows step-by-step combat results: engagement, maneuver, shots,
 * damage allocation, depletion, morale, and scatter.
 */

import React from 'react';
import { CombatResolution } from '@engine/rules/combat';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#16213e',
    border: '2px solid #e94560',
    borderRadius: 8,
    width: 600,
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: 20,
  },
  title: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  section: {
    marginBottom: 12,
    padding: '8px 12px',
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    border: '1px solid #0f3460',
  },
  sectionTitle: {
    color: '#44aaff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#ccc',
    lineHeight: 1.8,
  },
  label: { color: '#888' },
  hit: { color: '#ff4444', fontWeight: 'bold' },
  miss: { color: '#666' },
  success: { color: '#44ff44', fontWeight: 'bold' },
  fail: { color: '#ff6644' },
  mod: { color: '#aa88ff', fontSize: 11 },
  btn: {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginTop: 12,
    backgroundColor: '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

interface Props {
  combat: CombatResolution;
  attackerId: string;
  defenderId: string;
  onClose: () => void;
}

const CombatResolutionDialog: React.FC<Props> = ({ combat, attackerId, defenderId, onClose }) => {
  const eng = combat.engagement;

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.dialog}>
        <div style={s.title}>
          {combat.type === 'bvr' ? 'BVR' : 'Standard'} Air-to-Air Combat
        </div>

        {/* Engagement */}
        <div style={s.section}>
          <div style={s.sectionTitle}>1. Engagement</div>
          <div style={s.row}>
            <span>{attackerId} (Attacker)</span>
            <span>
              Roll: {eng.attackerRoll.roll}
              {' vs '}{eng.attackerRoll.needed}
              {formatMods(eng.attackerRoll.modifiers)}
              {' → '}
              <span style={eng.attackerRoll.success ? s.success : s.fail}>
                {eng.attackerRoll.success ? 'SUCCESS' : 'FAIL'}
              </span>
            </span>
          </div>
          {eng.defenderRoll && (
            <div style={s.row}>
              <span>{defenderId} (Defender)</span>
              <span>
                Roll: {eng.defenderRoll.roll}
                {' vs '}{eng.defenderRoll.needed}
                {formatMods(eng.defenderRoll.modifiers)}
                {' → '}
                <span style={eng.defenderRoll.success ? s.success : s.fail}>
                  {eng.defenderRoll.success ? 'SUCCESS' : 'FAIL'}
                </span>
              </span>
            </div>
          )}
          <div style={{ ...s.row, marginTop: 4, fontWeight: 'bold' }}>
            <span>Outcome</span>
            <span style={{ color: '#ffcc44' }}>{formatOutcome(eng.outcome)}</span>
          </div>
          {eng.attackerHasSurprise && (
            <div style={{ color: '#ff8844', fontSize: 11, marginTop: 2 }}>
              Attacker has SURPRISE! Defender is DISADVANTAGED.
            </div>
          )}
        </div>

        {/* Maneuver */}
        {combat.combatOccurs && combat.attackerManeuver && (
          <div style={s.section}>
            <div style={s.sectionTitle}>2. Maneuver</div>
            <div style={s.row}>
              <span>{attackerId}</span>
              <span>
                Roll: {combat.attackerManeuver.roll}
                {formatMods(combat.attackerManeuver.modifiers)}
                {' = '}{combat.attackerManeuver.finalRoll}
                {' → '}<strong>{combat.attackerManeuver.shotOpportunities} shot(s)</strong>
              </span>
            </div>
            {combat.defenderManeuver && (
              <div style={s.row}>
                <span>{defenderId}</span>
                <span>
                  Roll: {combat.defenderManeuver.roll}
                  {formatMods(combat.defenderManeuver.modifiers)}
                  {' = '}{combat.defenderManeuver.finalRoll}
                  {' → '}<strong>{combat.defenderManeuver.shotOpportunities} shot(s)</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Shots */}
        {(combat.attackerShots.length > 0 || combat.defenderShots.length > 0) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>3. Shot Resolution</div>
            {combat.attackerShots.map((shot, i) => (
              <div key={`atk-${i}`} style={s.row}>
                <span>{attackerId} fires {shot.weaponId}</span>
                <span>
                  Roll: {shot.roll} + {shot.modifiers['weapon_value'] ?? 0} = {shot.finalRoll}
                  {' → '}
                  <span style={shot.hit ? s.hit : s.miss}>
                    {shot.hit ? shot.damageType!.toUpperCase() : 'MISS'}
                  </span>
                </span>
              </div>
            ))}
            {combat.defenderShots.map((shot, i) => (
              <div key={`def-${i}`} style={s.row}>
                <span>{defenderId} fires {shot.weaponId}</span>
                <span>
                  Roll: {shot.roll} + {shot.modifiers['weapon_value'] ?? 0} = {shot.finalRoll}
                  {' → '}
                  <span style={shot.hit ? s.hit : s.miss}>
                    {shot.hit ? shot.damageType!.toUpperCase() : 'MISS'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Damage Allocation */}
        {combat.damageAllocations.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>4. Damage Allocation</div>
            {combat.damageAllocations.map((d, i) => (
              <div key={i} style={s.row}>
                <span>Aircraft #{d.aircraftIndex}</span>
                <span style={{ color: d.resultingDamage === 'shotdown' ? '#ff4444' : '#ffaa44' }}>
                  {d.previousDamage !== 'none' ? `${d.previousDamage} → ` : ''}
                  {d.resultingDamage.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Depletion */}
        {(combat.attackerDepletion || combat.defenderDepletion) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>5. Ammo Depletion</div>
            {combat.attackerDepletion && (
              <div style={s.row}>
                <span>{attackerId}: {combat.attackerDepletion.weaponId}</span>
                <span>
                  Roll: {combat.attackerDepletion.roll} vs {getWeaponDepNum(combat.attackerDepletion.weaponId)}
                  {' → '}
                  <span style={{ color: combat.attackerDepletion.depleted ? '#ff8844' : '#88ff88' }}>
                    {combat.attackerDepletion.depleted ? 'DEPLETED' : 'OK'}
                  </span>
                </span>
              </div>
            )}
            {combat.defenderDepletion && (
              <div style={s.row}>
                <span>{defenderId}: {combat.defenderDepletion.weaponId}</span>
                <span>
                  Roll: {combat.defenderDepletion.roll} vs {getWeaponDepNum(combat.defenderDepletion.weaponId)}
                  {' → '}
                  <span style={{ color: combat.defenderDepletion.depleted ? '#ff8844' : '#88ff88' }}>
                    {combat.defenderDepletion.depleted ? 'DEPLETED' : 'OK'}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Morale */}
        {(combat.attackerMorale || combat.defenderMorale) && (
          <div style={s.section}>
            <div style={s.sectionTitle}>6. Morale Check</div>
            {combat.attackerMorale && (
              <div style={s.row}>
                <span>{attackerId}</span>
                <span>
                  Roll: {combat.attackerMorale.roll}
                  {formatMods(combat.attackerMorale.modifiers)}
                  {' = '}{combat.attackerMorale.finalRoll}
                  {' → '}{formatMoraleResult(combat.attackerMorale.result)}
                </span>
              </div>
            )}
            {combat.defenderMorale && (
              <div style={s.row}>
                <span>{defenderId}</span>
                <span>
                  Roll: {combat.defenderMorale.roll}
                  {formatMods(combat.defenderMorale.modifiers)}
                  {' = '}{combat.defenderMorale.finalRoll}
                  {' → '}{formatMoraleResult(combat.defenderMorale.result)}
                </span>
              </div>
            )}
          </div>
        )}

        <button style={s.btn} onClick={onClose}>
          Close Combat Results
        </button>
      </div>
    </div>
  );
};

function formatOutcome(outcome: string): string {
  switch (outcome) {
    case 'attackerSurprise': return 'Attacker Surprise!';
    case 'mutual': return 'Mutual Engagement';
    case 'defenderInitiates': return 'Defender Initiates';
    case 'noEngagement': return 'No Engagement';
    default: return outcome;
  }
}

function formatMods(mods: Record<string, number>): string {
  const entries = Object.entries(mods).filter(([, v]) => v !== 0);
  if (entries.length === 0) return '';
  return ' (' + entries.map(([k, v]) => `${v >= 0 ? '+' : ''}${v}`).join(', ') + ')';
}

function formatMoraleResult(result: string): string {
  switch (result) {
    case 'none': return 'No effect';
    case 'jettison': return 'Jettison check';
    case 'disordered': return 'DISORDERED';
    case 'abort': return 'ABORT';
    default: return result;
  }
}

function getWeaponDepNum(weaponId: string): number {
  const { getWeapon } = require('@data/weapons/airToAirWeapons');
  const w = getWeapon(weaponId);
  return w?.depletionNumber ?? 5;
}

export default CombatResolutionDialog;
