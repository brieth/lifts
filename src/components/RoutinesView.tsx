import { useRef, useState } from 'react';
import { useStore } from '../store';

export function RoutinesView() {
  const { data, exerciseName, resetAll, exportData, importData } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  function handleExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `lifts-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded. Keep it somewhere safe (Files, Drive, email…).');
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      setStatus(ok ? 'Backup restored ✓' : 'That file could not be read as a lifts backup.');
    };
    reader.readAsText(file);
  }

  return (
    <div className="view">
      <h1>Routine</h1>
      <p className="muted">The 200 lb Minimalist — 6 days, exercises only.</p>

      <div className="routine-detail-list">
        {data.routines.map((r) => (
          <div key={r.id} className="routine-detail">
            <div className="routine-detail-head">
              <span className="routine-detail-name">{r.name}</span>
              <span className="routine-detail-sub">{r.subtitle}</span>
            </div>
            <ol className="routine-exercises">
              {r.exercises.map((re, i) => {
                const prev = r.exercises[i - 1]?.superset;
                const supersetStart = re.superset && re.superset !== prev;
                return (
                  <li
                    key={`${re.exerciseId}-${i}`}
                    className={re.superset ? 'ss' : ''}
                  >
                    {supersetStart && (
                      <span className="ss-label">superset {re.superset}</span>
                    )}
                    <span className="re-name">{exerciseName(re.exerciseId)}</span>
                    <span className="re-target">
                      {re.targetSets}×{re.targetReps}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="section">Backup & Data</h2>
      <p className="muted small backup-note">
        Workouts are saved on this device only. Export a backup file regularly so nothing is lost if
        your browser data gets cleared — and use Import to restore it or move to another device.
      </p>

      <div className="data-buttons">
        <button className="btn ghost" onClick={handleExport}>
          ⬇ Export backup
        </button>
        <button className="btn ghost" onClick={() => fileInput.current?.click()}>
          ⬆ Import backup
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          e.target.value = '';
        }}
      />

      {status && <div className="data-status">{status}</div>}

      <button
        className="btn ghost block danger reset-btn"
        onClick={() => {
          if (confirm('Reset all workouts and restore the default routine? This cannot be undone.'))
            resetAll();
        }}
      >
        Reset all data
      </button>
    </div>
  );
}
