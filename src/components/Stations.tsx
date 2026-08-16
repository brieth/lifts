import { useState } from 'react';
import { useStore } from '../store';
import { fitCalibration, fitError } from '../lib/stations';
import { useBackToClose } from '../lib/useBackToClose';
import type { Station } from '../types';

type Sample = { stack: string; force: string };
const BLANK: Sample[] = [
  { stack: '', force: '' },
  { stack: '', force: '' },
  { stack: '', force: '' },
];

/**
 * Managing calibrated machines.
 *
 * A stack number is not pounds of resistance: pulley ratio scales it and the
 * carriage adds a constant, both specific to the machine. Calibrating one means
 * measuring `force = slope * stack + offset` with a hanging scale, after which
 * every weight logged there converts to real force and history stays comparable
 * across machines.
 */
export function Stations() {
  const { data, addStation, updateStation, deleteStation } = useStore();
  const [editing, setEditing] = useState<Station | 'new' | null>(null);
  useBackToClose(editing !== null, () => setEditing(null));

  return (
    <>
      <h2 className="section">Stations</h2>
      <p className="muted small backup-note">
        Cable stacks differ between machines, so the same number can be very different resistance.
        Calibrate the ones you use and every weight logged there converts to real force, keeping
        history comparable. Exercises with no station are treated as already normalized, so you only
        need this for machines you actually want to compare.
      </p>

      <div className="gym-manage">
        {data.stations.map((s) => (
          <div key={s.id} className="station-row">
            <div className="station-info">
              <span className="station-name">{s.name}</span>
              <span className="muted small">
                force = {s.slope.toFixed(3)} × stack
                {s.offset >= 0 ? ' + ' : ' − '}
                {Math.abs(s.offset).toFixed(1)} lb
              </span>
            </div>
            <div className="gym-row-actions">
              <button className="btn ghost small" onClick={() => setEditing(s)}>
                Edit
              </button>
              <button
                className="btn ghost small danger"
                onClick={() => {
                  if (confirm(`Delete "${s.name}"? Sets logged there revert to unconverted.`))
                    deleteStation(s.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <button className="btn ghost block" onClick={() => setEditing('new')}>
          + Add station
        </button>
      </div>

      {editing && (
        <CalibrationForm
          station={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(name, fit, samples) => {
            if (editing === 'new') addStation({ name, ...fit, samples });
            else updateStation(editing.id, { name, ...fit, samples });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function CalibrationForm({
  station,
  onClose,
  onSave,
}: {
  station: Station | null;
  onClose: () => void;
  onSave: (
    name: string,
    fit: { slope: number; offset: number },
    samples: { stack: number; force: number }[],
  ) => void;
}) {
  const [name, setName] = useState(station?.name ?? '');
  const [samples, setSamples] = useState<Sample[]>(
    station?.samples?.length
      ? station.samples.map((s) => ({ stack: String(s.stack), force: String(s.force) }))
      : BLANK,
  );

  const parsed = samples
    .map((s) => ({ stack: Number(s.stack), force: Number(s.force) }))
    .filter((s) => s.stack > 0 && s.force > 0);
  const fit = fitCalibration(parsed);
  const err = fit ? fitError(parsed, fit) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{station ? 'Edit station' : 'Add station'}</span>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="station-field">
          <span className="set-edit-label">Name</span>
          <input
            value={name}
            placeholder="e.g. Planet Fitness, cable by water fountain"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <h3 className="station-guide-title">How to measure</h3>
        <ol className="station-guide">
          <li>Clip a hanging scale inline between the cable and the attachment, using a rated
            carabiner at each end rather than an open hook.</li>
          <li>Tare it so the attachment&apos;s own weight reads zero.</li>
          <li>Set the stack to a low number, pull steadily until the plates just lift, and read the
            locked value. Don&apos;t jerk it.</li>
          <li>Repeat at two more settings, spread out. Three points reveal whether the machine is
            linear; two only assume it.</li>
        </ol>

        <div className="station-samples">
          <div className="station-sample head">
            <span>Stack</span>
            <span>Measured lb</span>
          </div>
          {samples.map((s, i) => (
            <div key={i} className="station-sample">
              <input
                type="number"
                inputMode="decimal"
                value={s.stack}
                placeholder="—"
                onChange={(e) =>
                  setSamples((v) => v.map((x, j) => (j === i ? { ...x, stack: e.target.value } : x)))
                }
              />
              <input
                type="number"
                inputMode="decimal"
                value={s.force}
                placeholder="—"
                onChange={(e) =>
                  setSamples((v) => v.map((x, j) => (j === i ? { ...x, force: e.target.value } : x)))
                }
              />
            </div>
          ))}
        </div>

        {fit ? (
          <div className="station-fit">
            <p className="station-fit-eq">
              force = {fit.slope.toFixed(3)} × stack
              {fit.offset >= 0 ? ' + ' : ' − '}
              {Math.abs(fit.offset).toFixed(1)} lb
            </p>
            <p className="muted small">
              {parsed.length < 3
                ? 'Two points fit a line exactly, so this assumes the machine is linear rather than checking it. Add a third.'
                : err < 3
                  ? `Points sit within ${err.toFixed(1)}% of the line, so the machine is linear and this holds beyond the range you measured.`
                  : `Points deviate up to ${err.toFixed(1)}% from the line. That's more curve than expected — re-check your readings, and don't trust it far outside the range you measured.`}
            </p>
          </div>
        ) : (
          <p className="muted small">Enter at least two measurements to compute the calibration.</p>
        )}

        <button
          className="btn primary block"
          disabled={!fit || !name.trim()}
          onClick={() => fit && onSave(name.trim(), fit, parsed)}
        >
          {station ? 'Save changes' : 'Add station'}
        </button>
      </div>
    </div>
  );
}
