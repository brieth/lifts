import { useRef, useState } from 'react';
import { useStore } from '../store';

export function RoutinesView() {
  const { data, exerciseName, resetAll, exportData, importData, addGym, renameGym, deleteGym, setCurrentGym } =
    useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    const json = exportData();
    const stamp = new Date().toISOString().slice(0, 10);

    // Native share sheet (Drive, Files, Gmail…) — lets you send the backup
    // anywhere. Android only allows a fixed list of file types, and it checks
    // the extension matches the MIME type, so we share a .txt/text-plain file
    // (the contents are still JSON; Import reads it back fine).
    const shareFile = new File([json], `sandwich-${stamp}.txt`, { type: 'text/plain' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: 'Sandwich backup' });
        setStatus('Backup shared — saved wherever you chose.');
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // user cancelled the sheet
        // otherwise fall through to a plain download
      }
    }

    // Fallback: download to the browser's default location.
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandwich-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded — move it to Drive/Files to keep it safe.');
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      setStatus(ok ? 'Backup restored ✓' : 'That file could not be read as a Sandwich backup.');
    };
    reader.readAsText(file);
  }

  return (
    <div className="view">
      <h1>Routine</h1>

      <div className="routine-detail-list">
        {data.routines.map((r) => (
          <div key={r.id} className="routine-detail">
            <div className="routine-detail-head">
              <span className="routine-detail-name">{r.name}</span>
            </div>
            <ol className="routine-exercises">
              {r.exercises
                .filter((re) => !re.options)
                .map((re, i) => (
                  <li key={`${re.exerciseId}-${i}`}>
                    <span className="re-name">{exerciseName(re.exerciseId)}</span>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="section">Gyms</h2>
      <p className="muted small backup-note">
        Cable &amp; machine history is tracked per gym (resistance varies between gyms). Barbell and
        dumbbell lifts are shared across all gyms.
      </p>
      <div className="gym-manage">
        {data.gyms.map((g) => (
          <div key={g.id} className="gym-row">
            <button
              className={g.id === data.currentGymId ? 'gym-chip active' : 'gym-chip'}
              onClick={() => setCurrentGym(g.id)}
            >
              {g.name}
            </button>
            <div className="gym-row-actions">
              <button
                className="btn ghost small"
                onClick={() => {
                  const n = prompt('Rename gym', g.name)?.trim();
                  if (n) renameGym(g.id, n);
                }}
              >
                Rename
              </button>
              {data.gyms.length > 1 && (
                <button
                  className="btn ghost small danger"
                  onClick={() => {
                    if (confirm(`Delete "${g.name}"? Its logged sessions stay but become unassigned.`))
                      deleteGym(g.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          className="btn ghost block"
          onClick={() => {
            const n = prompt('New gym name')?.trim();
            if (n) addGym(n);
          }}
        >
          + Add gym
        </button>
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
        accept="application/json,.json,text/plain,.txt"
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
