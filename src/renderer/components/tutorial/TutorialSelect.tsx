/**
 * Tutorial selection dialog.
 */

import React from 'react';
import { TUTORIALS } from '@tutorial/tutorials/tutorialDefinitions';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#16213e', border: '2px solid #44cc88', borderRadius: 8,
    width: 500, padding: 20,
  },
  title: { color: '#44cc88', fontSize: 20, fontWeight: 'bold', letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 12, marginBottom: 16 },
  card: {
    padding: '10px 14px', marginBottom: 8, borderRadius: 4,
    border: '1px solid #2a5a3a', backgroundColor: '#1a2a1e',
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  cardName: { color: '#ddd', fontSize: 14, fontWeight: 'bold' },
  cardDesc: { color: '#888', fontSize: 11, marginTop: 2 },
  closeBtn: {
    padding: '8px 16px', marginTop: 8, width: '100%',
    backgroundColor: '#333', color: '#aaa', border: 'none',
    borderRadius: 4, fontSize: 12, cursor: 'pointer', textAlign: 'center',
  },
};

interface Props {
  onSelect: (tutorialId: string) => void;
  onClose: () => void;
}

const TutorialSelect: React.FC<Props> = ({ onSelect, onClose }) => {
  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.dialog}>
        <div style={s.title}>Tutorials</div>
        <div style={s.subtitle}>Learn Red Storm step by step. Each tutorial covers a key game system.</div>

        {TUTORIALS.map((tut) => (
          <div
            key={tut.id}
            style={s.card}
            onClick={() => onSelect(tut.id)}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#44cc88')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a5a3a')}
          >
            <div style={s.cardName}>{tut.name}</div>
            <div style={s.cardDesc}>{tut.description} ({tut.steps.length} steps)</div>
          </div>
        ))}

        <button style={s.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default TutorialSelect;
