const liveGameCss = `
  .live-game-progress {
    margin: 0 0 0.35rem;
    color: #0f766e;
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .error-message {
    margin: 0;
    color: #7f1d1d;
    font-weight: 700;
  }
  .loading-placeholder {
    min-height: 10rem;
    border: 1px dashed #a1a1aa;
    border-radius: 8px;
    padding: 1rem;
    display: grid;
    place-items: center;
    background: #ffffff;
    color: #52525b;
    font-size: 0.9rem;
  }
`;

const liveMotionCss = `
@keyframes playcraft-drag-ghost {
  from { transform: scale(0.96) rotate(-1deg); opacity: 0.72; }
  to { transform: scale(1.03) rotate(1deg); opacity: 0.96; }
}
@keyframes playcraft-bin-target {
  from { box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.16), 0 16px 28px rgba(249, 115, 22, 0.16); }
  to { box-shadow: 0 0 0 7px rgba(249, 115, 22, 0.08), 0 18px 34px rgba(249, 115, 22, 0.22); }
}
@keyframes playcraft-bin-success {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.36); }
  48% { transform: scale(1.025); box-shadow: 0 0 0 8px rgba(22, 163, 74, 0.18); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
@keyframes playcraft-bin-failure {
  0%, 100% { transform: translateX(0); }
  18% { transform: translateX(-6px); }
  36% { transform: translateX(5px); }
  54% { transform: translateX(-4px); }
  72% { transform: translateX(3px); }
}
@keyframes playcraft-gentle-shake {
  0%, 100% { transform: translateX(0); }
  12% { transform: translateX(-3px); }
  24% { transform: translateX(3px); }
  36% { transform: translateX(-2px); }
  48% { transform: translateX(2px); }
  60% { transform: translateX(0); }
}
`;

const liveA11yCss = `
.memory-card:focus-visible,
.sort-item:focus-visible,
.sequence-choice:focus-visible,
.inline-action:focus-visible {
  outline: 2px solid #4A90E2 !important;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .memory-card,
  .sort-item,
  .sequence-choice,
  .inline-action {
    transition: none !important;
    animation: none !important;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

export { liveGameCss, liveMotionCss, liveA11yCss };
