/**
 * Event Log panel — scrollable history of all game events.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameEvent } from '@engine/state/GameState';

const s: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#1a1a2e', borderRadius: 4, border: '1px solid #0f3460',
    marginTop: 8, overflow: 'hidden', maxHeight: 300,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '6px 10px', backgroundColor: '#0f3460',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 12, fontWeight: 'bold', color: '#aaa',
  },
  filterRow: {
    padding: '4px 10px', display: 'flex', gap: 4, flexWrap: 'wrap',
    borderBottom: '1px solid #0f3460',
  },
  filterBtn: {
    padding: '2px 6px', fontSize: 9, borderRadius: 3, cursor: 'pointer',
    border: '1px solid #333', backgroundColor: '#1a1a2e', color: '#888',
  },
  filterActive: { backgroundColor: '#0f3460', color: '#ddd', border: '1px solid #0f3460' },
  list: { flex: 1, overflowY: 'auto', padding: '4px 10px' },
  entry: {
    fontSize: 10, lineHeight: 1.5, color: '#999', fontFamily: 'monospace',
    padding: '2px 0', borderBottom: '1px solid #0a0a18',
  },
  turn: { color: '#e94560', fontWeight: 'bold', marginRight: 4 },
  phase: { color: '#44aaff', marginRight: 4 },
  type: { color: '#888', marginRight: 4 },
};

const EVENT_COLORS: Record<string, string> = {
  scenario_loaded: '#44cc88',
  random_event: '#ffaa44',
  detection: '#44aaff',
  combat: '#ff4444',
  movement: '#88ff88',
  sam: '#ff8844',
  damage: '#ff4444',
};

const EVENT_FILTERS = ['all', 'combat', 'detection', 'movement', 'sam', 'damage', 'random_event'];

const EventLogPanel: React.FC = () => {
  const { gameState } = useGameStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState('all');

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [gameState.eventLog.length]);

  const filtered = filter === 'all'
    ? gameState.eventLog
    : gameState.eventLog.filter((e) => e.type.includes(filter));

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span>Event Log</span>
        <span style={{ color: '#666', fontSize: 10 }}>{gameState.eventLog.length} events</span>
      </div>

      <div style={s.filterRow}>
        {EVENT_FILTERS.map((f) => (
          <span
            key={f}
            style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f}
          </span>
        ))}
      </div>

      <div style={s.list} ref={listRef}>
        {filtered.length === 0 && (
          <div style={{ ...s.entry, color: '#555' }}>No events yet.</div>
        )}
        {filtered.map((event, i) => (
          <div key={i} style={s.entry}>
            <span style={s.turn}>T{event.turn}</span>
            <span style={s.phase}>{event.phase}</span>
            <span style={{ color: EVENT_COLORS[event.type] ?? '#999' }}>
              {event.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLogPanel;
