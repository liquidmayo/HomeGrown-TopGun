/**
 * Enhanced Phase Guide panel with detailed step-by-step guidance.
 */

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PHASE_TIPS } from '@tutorial/tips/phaseTips';

const s: Record<string, React.CSSProperties> = {
  panel: { backgroundColor: '#1a1a2e', borderRadius: 4, border: '1px solid #0f3460', padding: 12, marginTop: 8 },
  title: { color: '#44aaff', fontWeight: 'bold', fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summary: { color: '#bbb', fontSize: 12, lineHeight: 1.6, marginBottom: 8 },
  sectionTitle: { color: '#888', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 8, marginBottom: 4 },
  step: { color: '#aaa', fontSize: 11, lineHeight: 1.7, paddingLeft: 12, borderLeft: '2px solid #0f3460', marginBottom: 4 },
  tip: { color: '#88aa44', fontSize: 11, lineHeight: 1.5, paddingLeft: 8, marginBottom: 3 },
  ruleRef: { color: '#666', fontSize: 10, fontStyle: 'italic', marginTop: 6 },
  toggle: { color: '#666', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' },
};

const PhaseGuide: React.FC = () => {
  const { gameState } = useGameStore();
  const [expanded, setExpanded] = useState(true);
  const tip = PHASE_TIPS[gameState.phase];

  if (!tip) return null;

  return (
    <div style={s.panel}>
      <div style={s.title}>
        <span>Phase Guide: {tip.title}</span>
        <span style={s.toggle} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </div>
      <div style={s.summary}>{tip.summary}</div>

      {expanded && (
        <>
          <div style={s.sectionTitle}>Steps</div>
          {tip.steps.map((step, i) => (
            <div key={i} style={s.step}>{i + 1}. {step}</div>
          ))}

          <div style={s.sectionTitle}>Tips</div>
          {tip.tips.map((t, i) => (
            <div key={i} style={s.tip}>• {t}</div>
          ))}

          <div style={s.ruleRef}>Rule reference: [{tip.ruleRef}]</div>
        </>
      )}
    </div>
  );
};

export default PhaseGuide;
