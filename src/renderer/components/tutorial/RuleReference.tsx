/**
 * Searchable Rule Reference panel.
 */

import React, { useState, useMemo } from 'react';
import { searchRules, RULE_ENTRIES, RuleEntry } from '@tutorial/ruleReference';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#16213e', border: '2px solid #44aaff', borderRadius: 8,
    width: 600, maxHeight: '80vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  header: { padding: '16px 20px', backgroundColor: '#0f3460', borderBottom: '1px solid #44aaff' },
  title: { color: '#44aaff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  searchBox: {
    width: '100%', padding: '8px 12px', marginTop: 8,
    backgroundColor: '#1a1a2e', color: '#ddd', border: '1px solid #0f3460',
    borderRadius: 4, fontSize: 13, outline: 'none',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 20px' },
  entry: {
    padding: '8px 12px', marginBottom: 6, borderRadius: 4,
    border: '1px solid #0f3460', backgroundColor: '#1a1a2e',
  },
  section: { color: '#44aaff', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  entryTitle: { color: '#ddd', fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  entrySummary: { color: '#aaa', fontSize: 11, lineHeight: 1.6, marginTop: 4 },
  closeBtn: {
    padding: '10px 20px', margin: '12px 20px',
    backgroundColor: '#333', color: '#aaa', border: 'none',
    borderRadius: 4, fontSize: 13, cursor: 'pointer', textAlign: 'center',
  },
  count: { color: '#666', fontSize: 11, marginTop: 4 },
};

interface Props {
  onClose: () => void;
}

const RuleReference: React.FC<Props> = ({ onClose }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchRules(query), [query]);

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.dialog}>
        <div style={s.header}>
          <div style={s.title}>Rule Reference</div>
          <input
            style={s.searchBox}
            placeholder="Search rules by keyword or section number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div style={s.count}>{results.length} of {RULE_ENTRIES.length} entries</div>
        </div>

        <div style={s.list}>
          {results.map((entry) => (
            <div key={entry.section} style={s.entry}>
              <span style={s.section}>[{entry.section}]</span>
              <span style={s.entryTitle}>{entry.title}</span>
              <div style={s.entrySummary}>{entry.summary}</div>
            </div>
          ))}
        </div>

        <button style={s.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default RuleReference;
