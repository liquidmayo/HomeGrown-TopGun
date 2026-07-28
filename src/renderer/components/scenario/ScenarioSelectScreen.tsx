/**
 * Scenario Selection Screen.
 * Shows available scenarios grouped by category.
 */

import React, { useState } from 'react';
import { getScenarioList, getPlayableScenarios, ScenarioListEntry } from '@data/scenarios/scenarioRegistry';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#16213e', border: '2px solid #e94560',
    borderRadius: 8, width: 700, maxHeight: '85vh',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '16px 20px', backgroundColor: '#0f3460',
    borderBottom: '2px solid #e94560',
  },
  title: {
    color: '#e94560', fontSize: 22, fontWeight: 'bold',
    letterSpacing: 3, textTransform: 'uppercase',
  },
  subtitle: {
    color: '#888', fontSize: 12, marginTop: 4,
  },
  tabs: {
    display: 'flex', padding: '8px 20px', gap: 8,
    borderBottom: '1px solid #0f3460',
  },
  tab: {
    padding: '6px 14px', fontSize: 12, borderRadius: 4,
    cursor: 'pointer', border: '1px solid #0f3460',
    backgroundColor: '#1a1a2e', color: '#aaa',
  },
  tabActive: {
    backgroundColor: '#e94560', color: '#fff', border: '1px solid #e94560',
  },
  list: {
    flex: 1, overflowY: 'auto', padding: '12px 20px',
  },
  card: {
    padding: '10px 14px', marginBottom: 8, borderRadius: 4,
    border: '1px solid #0f3460', backgroundColor: '#1a1a2e',
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  cardPlayable: {
    borderColor: '#2a5a2a',
  },
  cardDisabled: {
    opacity: 0.4, cursor: 'not-allowed',
  },
  cardName: {
    fontSize: 14, fontWeight: 'bold', color: '#ddd',
  },
  cardSub: {
    fontSize: 11, color: '#888', marginTop: 2,
  },
  cardMeta: {
    display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: '#666',
  },
  badge: {
    padding: '1px 6px', borderRadius: 3, fontSize: 9,
    fontWeight: 'bold', textTransform: 'uppercase',
  },
  closeBtn: {
    padding: '10px 20px', margin: '12px 20px',
    backgroundColor: '#333', color: '#aaa', border: 'none',
    borderRadius: 4, fontSize: 13, cursor: 'pointer',
    textAlign: 'center',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Scenarios',
  solo: 'Solo (vs AI)',
  introductory: 'Introductory',
  standard: 'Standard',
};

interface Props {
  onSelectScenario: (scenarioId: string) => void;
  onClose: () => void;
}

const ScenarioSelectScreen: React.FC<Props> = ({ onSelectScenario, onClose }) => {
  const [filter, setFilter] = useState<string>('solo');
  const allScenarios = getScenarioList();
  const playableIds = new Set(getPlayableScenarios().map((s) => s.id));

  const filtered = filter === 'all'
    ? allScenarios
    : allScenarios.filter((s) => s.category === filter);

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.dialog}>
        <div style={s.header}>
          <div style={s.title}>Select Scenario</div>
          <div style={s.subtitle}>
            {playableIds.size} playable scenarios · {allScenarios.length} total
          </div>
        </div>

        <div style={s.tabs}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div
              key={key}
              style={{ ...s.tab, ...(filter === key ? s.tabActive : {}) }}
              onClick={() => setFilter(key)}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={s.list}>
          {filtered.map((scenario) => {
            const isPlayable = playableIds.has(scenario.id);
            return (
              <div
                key={scenario.id}
                style={{
                  ...s.card,
                  ...(isPlayable ? s.cardPlayable : s.cardDisabled),
                }}
                onClick={() => isPlayable && onSelectScenario(scenario.id)}
                onMouseEnter={(e) => {
                  if (isPlayable) (e.currentTarget as HTMLDivElement).style.borderColor = '#e94560';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = isPlayable ? '#2a5a2a' : '#0f3460';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={s.cardName}>{scenario.name}</div>
                  <div>
                    {isPlayable && (
                      <span style={{ ...s.badge, backgroundColor: '#2a5a2a', color: '#6c6' }}>
                        Playable
                      </span>
                    )}
                    {scenario.category === 'solo' && (
                      <span style={{ ...s.badge, backgroundColor: '#4a2a5a', color: '#c8c', marginLeft: 4 }}>
                        Solo
                      </span>
                    )}
                  </div>
                </div>
                <div style={s.cardSub}>{scenario.subtitle}</div>
                <div style={s.cardMeta}>
                  <span>{scenario.date}</span>
                  <span>{scenario.dayNight === 'night' ? '🌙 Night' : '☀ Day'}</span>
                  <span>Size: {scenario.size}</span>
                  <span>Play as: {scenario.humanSide.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button style={s.closeBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default ScenarioSelectScreen;
