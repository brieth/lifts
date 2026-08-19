import { useState } from 'react';
import { useStore, todayISODate } from '../store';
import { calibrationAt, fitCalibration, fitError, latestCalibration } from '../lib/stations';
import { useBackToClose } from '../lib/useBackToClose';
import type { Calibration, Station, WeightUnit } from '../types';

/** "Jun 4, 2026", or "Undated" for a calibration carried over from before dates. */
function calDate(date: string): string {
  if (!date) return 'Undated';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Force is always pounds; the stack is only annotated when it isn't. */
function equation(cal: { slope: number; offset: number }, unit: WeightUnit): string {
  const sign = cal.offset >= 0 ? ' + ' : ' − ';
  const stack = unit === 'lb' ? 'stack' : `stack(${unit})`;
  return `force = ${cal.slope.toFixed(3)} × ${stack}${sign}${Math.abs(cal.offset).toFixed(1)} lb`;
}

/**
 * Inline station picker: the current station reads as plain text with a dotted
 * underline, with a transparent native select laid over it (same treatment as
 * the editable date in workout history). Renders nothing when no stations
 * exist, since there'd be nothing to choose.
 */
export function StationPicker({
  stations,
  value,
  onChange,
}: {
  stations: Station[];
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  if (stations.length === 0) return null;
  const current = stations.find((s) => s.id === value);
  // A native option is plain text, so it can't carry the unit chip. Stations
  // that share a name (the two barbells) spell the unit out instead.
  const optionLabel = (s: Station) =>
    stations.filter((o) => o.name === s.name).length > 1 ? `${s.name} (${s.unit})` : s.name;
  return (
    <span className={current ? 'station-pick' : 'station-pick none'}>
      <span className="station-pick-name">{current?.name ?? 'No station'}</span>
      {current && <span className="unit-chip">{current.unit}</span>}
      <select
        className="station-pick-native"
        value={value ?? ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">No station</option>
        {stations.map((s) => (
          <option key={s.id} value={s.id}>
            {optionLabel(s)}
          </option>
        ))}
      </select>
    </span>
  );
}

type Sample = { stack: string; force: string };
const BLANK: Sample[] = [
  { stack: '', force: '' },
  { stack: '', force: '' },
  { stack: '', force: '' },
];

/**
 * Managing calibrated machines.
 *
 * A stack number is not pounds of resistance: pulley ratio scales it, the
 * carriage adds a constant, and the plates may be marked in kilos. Calibrating
 * one means measuring `force = slope * stack + offset` with a hanging scale,
 * after which every weight logged there converts to real force and history
 * stays comparable across machines.
 */
export function Stations() {
  const { data, deleteStation } = useStore();
  const [editing, setEditing] = useState<Station | 'new' | null>(null);
  useBackToClose(editing !== null, () => setEditing(null));

  /** What the muted second line under a station's name says. */
  const summary = (s: Station): string => {
    const latest = latestCalibration(s);
    if (latest) return `${equation(latest, s.unit)} · ${calDate(latest.date)}`;
    return s.unit === 'kg' ? 'Uncalibrated, converted as kilos' : 'Uncalibrated';
  };

  // Re-read the station being edited from the store so calibration edits show
  // up immediately instead of against the snapshot the modal opened with.
  const active =
    editing && editing !== 'new' ? data.stations.find((s) => s.id === editing.id) ?? null : null;

  return (
    <>
      <h2 className="section">Stations</h2>
      <p className="muted small backup-note">
        Cable stacks differ between machines, so the same number can be very different resistance.
        Calibrate the ones you use and every weight logged there converts to real force, keeping
        history comparable. Exercises with no station are treated as already normalized, so you only
        need this for machines you actually want to compare.
      </p>

      {/* The built-in barbells aren't listed: nothing about them is editable,
          and they show up where they're used, in the picker. */}
      <div className="gym-manage">
        {data.stations.map((s) => (
          <div key={s.id} className="station-row">
            <div className="station-info">
              <span className="station-name">
                {s.name}
                <span className="unit-chip">{s.unit}</span>
              </span>
              <span className="muted small">{summary(s)}</span>
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
        <StationForm
          station={active}
          onClose={() => setEditing(null)}
          onCreated={(s) => setEditing(s)}
        />
      )}
    </>
  );
}

/**
 * Station editor: identity (name, stack units) plus the log of calibrations.
 *
 * Creating a station only needs a name and a unit. Measuring is a separate step
 * because it needs a scale in hand, and because it happens again every time the
 * machine is serviced or starts feeling different.
 */
function StationForm({
  station,
  onClose,
  onCreated,
}: {
  station: Station | null;
  onClose: () => void;
  onCreated: (s: Station) => void;
}) {
  const { addStation, updateStation, saveCalibration, deleteCalibration } = useStore();
  const [name, setName] = useState(station?.name ?? '');
  const [unit, setUnit] = useState<WeightUnit>(station?.unit ?? 'lb');
  const [measuring, setMeasuring] = useState<Calibration | 'new' | null>(null);
  useBackToClose(measuring !== null, () => setMeasuring(null));

  // Newest first for reading; the math sorts on its own.
  const calibrations = [...(station?.calibrations ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  function commit() {
    if (!name.trim()) return;
    if (station) updateStation(station.id, { name: name.trim(), unit });
    else onCreated(addStation({ name: name.trim(), unit }));
  }

  if (measuring && station) {
    return (
      <CalibrationForm
        station={station}
        calibration={measuring === 'new' ? null : measuring}
        onBack={() => setMeasuring(null)}
        onSave={(cal) => {
          saveCalibration(station.id, cal);
          setMeasuring(null);
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal station-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{station ? 'Edit station' : 'Add station'}</span>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </div>

        <label className="station-field">
          <span className="set-edit-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="station-field">
          <span className="set-edit-label">Unit</span>
          <div className="metric-toggle unit-toggle">
            {(['lb', 'kg'] as WeightUnit[]).map((u) => (
              <button key={u} className={u === unit ? 'active' : ''} onClick={() => setUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {station && (
          <div className="station-section">
            <h3 className="station-guide-title">Calibrations</h3>
            <p className="muted small">
              A fit describes the machine on the day you measured it. Add a new one when it changes,
              and past sessions keep using the calibration in effect at the time.
            </p>
            {calibrations.length === 0 && (
              <p className="muted small">
                {unit === 'kg'
                  ? 'Not measured, so the stack number is read as kilos.'
                  : 'Not measured, so the stack number is taken at face value.'}
              </p>
            )}
            {calibrations.map((c) => (
              <div key={c.id} className="cal-row">
                <div className="station-info">
                  <span className="station-name">{calDate(c.date)}</span>
                  <span className="muted small">{equation(c, unit)}</span>
                </div>
                <div className="gym-row-actions">
                  <button className="btn ghost small" onClick={() => setMeasuring(c)}>
                    Edit
                  </button>
                  <button
                    className="btn ghost small danger"
                    onClick={() => {
                      if (confirm(`Delete the ${calDate(c.date)} calibration?`))
                        deleteCalibration(station.id, c.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <button className="btn ghost block" onClick={() => setMeasuring('new')}>
              + Add calibration
            </button>
          </div>
        )}

        <button
          className="btn primary block"
          disabled={!name.trim()}
          onClick={() => {
            commit();
            if (station) onClose();
          }}
        >
          {station ? 'Save changes' : 'Add station'}
        </button>
      </div>
    </div>
  );
}

function CalibrationForm({
  station,
  calibration,
  onBack,
  onSave,
}: {
  station: Station;
  calibration: Calibration | null;
  onBack: () => void;
  onSave: (cal: Omit<Calibration, 'id'> & { id?: string }) => void;
}) {
  const [date, setDate] = useState(calibration?.date || todayISODate());
  const [samples, setSamples] = useState<Sample[]>(
    calibration?.samples?.length
      ? calibration.samples.map((s) => ({ stack: String(s.stack), force: String(s.force) }))
      : BLANK,
  );

  const parsed = samples
    .map((s) => ({ stack: Number(s.stack), force: Number(s.force) }))
    .filter((s) => s.stack > 0 && s.force > 0);
  const fit = fitCalibration(parsed);
  const err = fit ? fitError(parsed, fit) : 0;
  const lo = parsed.length ? Math.min(...parsed.map((s) => s.stack)) : 0;
  const hi = parsed.length ? Math.max(...parsed.map((s) => s.stack)) : 0;

  // What this measurement replaces, so an unexpected shift is visible.
  const previous = calibrationAt(
    { ...station, calibrations: station.calibrations.filter((c) => c.id !== calibration?.id) },
    date,
  );
  const drift =
    fit && previous && previous.slope !== 0
      ? ((fit.slope - previous.slope) / previous.slope) * 100
      : null;

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal station-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{calibration ? 'Edit calibration' : 'New calibration'}</span>
          <button className="btn ghost small" onClick={onBack}>
            Back
          </button>
        </div>

        <label className="station-field">
          <span className="set-edit-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="station-section">
          <h3 className="station-guide-title">How to measure</h3>
          <ol className="station-guide">
            <li>Zero the scale before hanging it on anything. Zeroing it under load subtracts that
              load from every reading.</li>
            <li>Clip it to the bare end of the cable with a rated carabiner, not an open hook. An
              attachment below it is optional and doesn&apos;t change the reading.</li>
            <li>Set the stack to a low number, pull steadily until the plates just lift, and read the
              locked value. Don&apos;t jerk it.</li>
            <li>Repeat at two more settings, spread out. Three points reveal whether the machine is
              linear; two only assume it.</li>
          </ol>
        </div>

        <div className="station-samples">
          <div className="station-sample head">
            <span>Stack ({station.unit})</span>
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
            <p className="station-fit-eq">{equation(fit, station.unit)}</p>
            <p className="muted small">
              {parsed.length < 3
                ? 'Two points fit a line exactly, so this assumes the machine is linear rather than checking it. Add a third.'
                : err < 3
                  ? `Points sit within ${err.toFixed(1)}% of the line, so the machine is linear across ${lo} to ${hi}.`
                  : `Points deviate up to ${err.toFixed(1)}% from the line. That's more curve than expected, so re-check your readings.`}
            </p>
            {/* Collinear points say nothing about how far the line can be
                trusted past them. A short span is a weak lever: the further you
                predict beyond it, the more a small misread is multiplied. */}
            <p className="muted small">
              Anything above {hi} is extrapolated, and a small misread there is magnified. Put your
              highest sample near the weight you actually train at.
            </p>
            {drift != null && Math.abs(drift) >= 1 && (
              <p className="muted small">
                {Math.abs(drift).toFixed(1)}% {drift > 0 ? 'heavier' : 'lighter'} than the{' '}
                {calDate(previous!.date)} calibration. Sessions before this date keep using that one.
              </p>
            )}
          </div>
        ) : (
          <p className="muted small">Enter at least two measurements to compute the calibration.</p>
        )}

        <button
          className="btn primary block"
          disabled={!fit}
          onClick={() =>
            fit && onSave({ id: calibration?.id, date, slope: fit.slope, offset: fit.offset, samples: parsed })
          }
        >
          {calibration ? 'Save calibration' : 'Add calibration'}
        </button>
      </div>
    </div>
  );
}
