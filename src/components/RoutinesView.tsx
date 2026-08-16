import { useRef, useState } from 'react';
import { useStore } from '../store';
import { AB_OPTION_IDS, LEG_OPTION_IDS } from '../seed';
import { Stations } from './Stations';

export function RoutinesView() {
  const { data, exerciseName, resetAll, exportData, importData } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleExport() {
    const json = exportData();
    const stamp = new Date().toISOString().slice(0, 10);

    // Open the native share sheet (Drive, Files, Gmail…). Chrome's Web Share
    // checks the file extension matches the MIME type and only allows a fixed
    // list of types, so we share a .txt/text-plain file — the contents are
    // still JSON and Import reads it back fine.
    const file = new File([json], `sandwich-${stamp}.txt`, { type: 'text/plain' });
    try {
      // No title — some targets (e.g. Drive) use it as the upload name and
      // would drop the real filename. Let the file's own name come through.
      await navigator.share({ files: [file] });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // user cancelled the sheet
      setStatus('Could not open the share sheet on this device.');
    }
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

        {/* The two pick-one menus. They're filtered out of the workout lists
            above (every workout carries a leg slot and an ab slot), so they're
            listed once here instead of repeated six times. */}
        {[
          { name: 'Legs', ids: LEG_OPTION_IDS },
          { name: 'Abs', ids: AB_OPTION_IDS },
        ].map((menu) => (
          <div key={menu.name} className="routine-detail">
            <div className="routine-detail-head">
              <span className="routine-detail-name">{menu.name}</span>
            </div>
            <ol className="routine-exercises">
              {[...menu.ids]
                .sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)))
                .map((id) => (
                  <li key={id}>
                    <span className="re-name">{exerciseName(id)}</span>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>

      <Stations />

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
