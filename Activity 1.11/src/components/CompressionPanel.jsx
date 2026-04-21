/**
 * CompressionPanel.jsx — Phase 2
 * Push / Reset / Replay / Hint / Compare controls + live force meters.
 */
import { useState } from 'react';
import './CompressionPanel.css';
import { soundManager } from '../scene/SoundManager';

// ── Static data ────────────────────────────────────────────────────────────
const ICONS  = { air: '💨', water: '💧', chalk: '🪨' };
const TITLES = { air: 'Syringe 1 — Air', water: 'Syringe 2 — Water', chalk: 'Syringe 3 — Chalk' };
const CTYPES = { air: 'Gas (Air)', water: 'Liquid (Water)', chalk: 'Solid (Chalk)' };

const PARTS = [
  { icon: '⬆️', name: 'T-Handle (Piston)',  desc: 'Push this to apply force downward into the syringe.' },
  { icon: '🔩', name: 'Metal Rod',          desc: 'Transfers your pushing force from handle to the rubber seal.' },
  { icon: '⬛', name: 'Rubber Seal',        desc: 'Tight-fitting rubber disc that compresses the contents below it.' },
  { icon: '📏', name: 'Barrel (100 mL)',    desc: 'Graduated glass cylinder — shows volume measurement marks at every 10 mL.' },
  { icon: '💨', name: 'Trapped Gas (Air)',  desc: 'Gas molecules have large spaces between them — easy to compress!' },
  { icon: '💧', name: 'Water',             desc: 'Liquid molecules are tightly packed — almost impossible to compress.' },
  { icon: '🪨', name: 'Chalk Pieces',      desc: 'Solid particles are rigid and locked in place — strongly resist compression.' },
  { icon: '🔴', name: 'Rubber Cork',       desc: 'Seals the nozzle tip so nothing escapes when you push the piston.' },
  { icon: '↕️', name: 'Compression',       desc: 'Distance the piston travels shows how compressible the material is.' },
];

const COMPARE_ROWS = [
  { prop: 'State',          air: 'Gas',       water: 'Liquid',        chalk: 'Solid' },
  { prop: 'Compressible?',  air: '✅ Yes',    water: '❌ No',         chalk: '❌ No' },
  { prop: 'Piston Travel',  air: 'Far (2.1)', water: 'Tiny (0.08)',   chalk: 'Very little (0.2)' },
  { prop: 'Force Required', air: '~20 %',     water: '~97 %',         chalk: '~84 %' },
  { prop: 'Molecules',      air: 'Spread out — large gaps',   water: 'Tightly packed', chalk: 'Rigid lattice' },
  { prop: 'Reason',         air: 'Gaps allow squeezing',      water: 'No space to reduce', chalk: 'Solid bonds resist' },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function CompressionPanel({ progress, phase, onPush, onReset, onReplay }) {
  const [showHint,    setShowHint]    = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const isPushing  = phase === 'pushing';
  const noProgress = progress.every(p => p.comprFrac < 0.01);
  const isIdle     = phase === 'idle';

  return (
    <>
      <div className="cp-panel">

        {/* ── Buttons ───────────────────────────────────────────────────── */}
        <div className="cp-buttons">
          <button id="btn-push" className={`cp-btn cp-btn--primary ${isPushing ? 'cp-btn--active' : ''}`}
            onClick={onPush} disabled={isPushing} title="Push all pistons down">
            <span>🔽</span><span>Push Piston</span>
          </button>
          <button id="btn-reset" className="cp-btn cp-btn--secondary"
            onClick={onReset} disabled={noProgress && isIdle} title="Return pistons to start">
            <span>🔄</span><span>Reset</span>
          </button>
          <button id="btn-replay" className="cp-btn cp-btn--secondary"
            onClick={onReplay} title="Reset then replay automatically">
            <span>▶</span><span>Replay</span>
          </button>
          <button id="btn-hint" className="cp-btn cp-btn--tertiary"
            onClick={() => { soundManager.playPop(); setShowHint(true); }} title="Show syringe parts and science hints">
            <span>💡</span><span>Hint</span>
          </button>
          <button id="btn-compare" className="cp-btn cp-btn--tertiary"
            onClick={() => { soundManager.playPop(); setShowCompare(true); }} title="Compare compressibility">
            <span>📊</span><span>Compare</span>
          </button>
        </div>

        {/* ── Force meters ──────────────────────────────────────────────── */}
        <div className="cp-meters">
          {progress.map(p => <ForceMeter key={p.id} data={p} />)}
        </div>

      </div>

      {/* ── Hint modal ────────────────────────────────────────────────── */}
      {showHint && (
        <Modal title="💡 Syringe Parts & Science" onClose={() => setShowHint(false)}>
          <div className="hint-grid">
            {PARTS.map(pt => (
              <div className="hint-item" key={pt.name}>
                <span className="hint-icon">{pt.icon}</span>
                <div>
                  <div className="hint-name">{pt.name}</div>
                  <div className="hint-desc">{pt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hint-takeaway">
            <span>🔬</span>
            <p><strong>Key takeaway:</strong> Only gases can be significantly compressed because their
              molecules have large gaps between them. Liquids and solids are already closely packed —
              they resist compression strongly.</p>
          </div>
        </Modal>
      )}

      {/* ── Compare modal ─────────────────────────────────────────────── */}
      {showCompare && (
        <Modal title="📊 Compressibility Comparison" onClose={() => setShowCompare(false)}>
          <div className="compare-wrapper">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th className="col-air">💨 Air</th>
                  <th className="col-water">💧 Water</th>
                  <th className="col-chalk">🪨 Chalk</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(r => (
                  <tr key={r.prop}>
                    <td className="row-label">{r.prop}</td>
                    <td className="col-air">{r.air}</td>
                    <td className="col-water">{r.water}</td>
                    <td className="col-chalk">{r.chalk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="compare-conclusion">
            🧠 <strong>Conclusion:</strong> The state of matter determines compressibility.
            Gases compress easily; liquids and solids do not.
          </div>
        </Modal>
      )}
    </>
  );
}

// ── ForceMeter ─────────────────────────────────────────────────────────────
function ForceMeter({ data }) {
  const { id, contents, comprFrac, forceFrac, label, science, glowHex } = data;
  const fp = Math.round(forceFrac * 100);
  const cp = Math.round(comprFrac * 100);

  return (
    <div className={`cp-card cp-card--${id}`} style={{ '--accent': glowHex }}>
      <div className="cp-card-header">
        <span className="cp-card-icon">{ICONS[contents]}</span>
        <span className="cp-card-title">{TITLES[contents]}</span>
        <span className="cp-card-tag">{CTYPES[contents]}</span>
      </div>

      <div className="cp-row"><span className="cp-lbl">Resistance Force</span><span className="cp-pct" style={{ color: glowHex }}>{fp}%</span></div>
      <div className="cp-bar-track">
        <div className="cp-bar-fill" style={{ width: `${fp}%`, background: `linear-gradient(90deg,${glowHex}88,${glowHex})`, boxShadow: fp > 5 ? `0 0 8px ${glowHex}80` : 'none' }} />
      </div>

      <div className="cp-row mt4"><span className="cp-lbl">Compression</span><span className="cp-pct-sm">{cp}%</span></div>
      <div className="cp-bar-track cp-bar-sm">
        <div className="cp-bar-fill" style={{ width: `${cp}%`, background: glowHex + '55' }} />
      </div>

      <div className="cp-status" style={{ color: glowHex }}>{label || '—'}</div>
      <div className="cp-science">{science}</div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={() => { soundManager.playClick(); onClose(); }} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
