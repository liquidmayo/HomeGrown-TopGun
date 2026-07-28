/**
 * Tutorial walkthrough overlay.
 * Steps through a tutorial sequence with navigation controls.
 */

import React, { useState } from 'react';
import { TUTORIALS, TutorialDef, TutorialStep } from '@tutorial/tutorials/tutorialDefinitions';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    width: 500, backgroundColor: '#16213e', border: '2px solid #44cc88',
    borderRadius: 8, padding: 16, zIndex: 900, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#44cc88', fontSize: 14, fontWeight: 'bold' },
  close: { color: '#888', cursor: 'pointer', fontSize: 18, padding: '0 4px' },
  stepTitle: { color: '#eee', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  stepText: { color: '#bbb', fontSize: 13, lineHeight: 1.7, marginBottom: 12 },
  ruleRef: { color: '#666', fontSize: 10, fontStyle: 'italic', marginBottom: 8 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btn: {
    padding: '6px 16px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
    border: '1px solid #0f3460', backgroundColor: '#0f3460', color: '#ddd',
  },
  btnPrimary: { backgroundColor: '#44cc88', color: '#000', border: '1px solid #44cc88', fontWeight: 'bold' },
  progress: { color: '#888', fontSize: 11 },
};

interface Props {
  tutorialId: string;
  onClose: () => void;
  onComplete: () => void;
}

const TutorialOverlay: React.FC<Props> = ({ tutorialId, onClose, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const tutorial = TUTORIALS.find((t) => t.id === tutorialId);
  if (!tutorial) return null;

  const step = tutorial.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorial.steps.length - 1;

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <span style={s.title}>{tutorial.name}</span>
        <span style={s.close} onClick={onClose} title="Close tutorial">✕</span>
      </div>

      <div style={s.stepTitle}>{step.title}</div>
      <div style={s.stepText}>{step.text}</div>
      {step.ruleRef && <div style={s.ruleRef}>Rule [{step.ruleRef}]</div>}

      <div style={s.nav}>
        <button
          style={s.btn}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
        >
          Previous
        </button>
        <span style={s.progress}>Step {stepIndex + 1} of {tutorial.steps.length}</span>
        {isLast ? (
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onComplete}>
            Complete Tutorial
          </button>
        ) : (
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={() => setStepIndex((i) => i + 1)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default TutorialOverlay;
