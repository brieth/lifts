import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { MUSCLE_GROUPS, weekStart, weeklyMuscleSets } from '../lib/muscles';

// Bar is full at 20 sets (top of the ~10–20 sets/week effective range); the
// tick sits at 10 (the bottom) so you can see at a glance where each muscle lands.
const SET_SCALE = 20;
const TICK_AT = 10;

export function WeeklyMuscles() {
  const { data } = useStore();
  const [offset, setOffset] = useState(0); // 0 = this week, −1 = last week, …

  const start = useMemo(() => {
    const s = weekStart(new Date());
    s.setDate(s.getDate() + offset * 7);
    return s;
  }, [offset]);

  const sets = useMemo(() => weeklyMuscleSets(data.sessions, start), [data.sessions, start]);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const total = MUSCLE_GROUPS.reduce((a, g) => a + sets[g], 0);

  return (
    <div className="weekly">
      <div className="week-nav">
        <button className="week-arrow" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week">
          ‹
        </button>
        <div className="week-range">
          <span className="week-dates">
            {fmt(start)} – {fmt(end)}
          </span>
          {offset === 0 && <span className="week-tag">This week</span>}
        </div>
        <button
          className="week-arrow"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {total === 0 ? (
        <p className="muted small weekly-empty">No sets logged this week.</p>
      ) : (
        <div className="muscle-list">
          {MUSCLE_GROUPS.map((g) => {
            const n = sets[g];
            const pct = Math.min(n / SET_SCALE, 1) * 100;
            return (
              <div key={g} className="muscle-row">
                <span className="muscle-name">{g}</span>
                <div className="muscle-bar-track">
                  <div className="muscle-bar-fill" style={{ width: `${pct}%` }} />
                  <span className="muscle-bar-tick" style={{ left: `${(TICK_AT / SET_SCALE) * 100}%` }} />
                </div>
                <span className="muscle-sets">
                  <strong>{n}</strong>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="muted small weekly-note">
        Hard sets per muscle this week ({total} total). Bar spans the ~10–20 sets/week range; the tick
        marks 10.
      </p>
    </div>
  );
}
