import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { MUSCLE_GROUPS, weekStart, weeklyMuscleTally } from '../lib/muscles';

// Bar is full at 20 sets (top of the ~10–20 sets/week effective range); the
// tick sits at 10 (the bottom) so you can see at a glance where each muscle lands.
const SET_SCALE = 20;
const TICK_AT = 10;

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function WeeklyMuscles() {
  const { data } = useStore();
  const [offset, setOffset] = useState(0); // 0 = this week, −1 = last week, …

  const start = useMemo(() => {
    const s = weekStart(new Date());
    s.setDate(s.getDate() + offset * 7);
    return s;
  }, [offset]);

  // Earliest week that has data — the back button stops here instead of scrolling
  // into empty weeks forever. 0 (no earlier navigation) when there's no history.
  const minOffset = useMemo(() => {
    if (data.sessions.length === 0) return 0;
    let earliest = data.sessions[0].date;
    for (const s of data.sessions) if (s.date < earliest) earliest = s.date;
    const earliestWeek = weekStart(new Date(earliest));
    const thisWeek = weekStart(new Date());
    const weeks = Math.round(
      (thisWeek.getTime() - earliestWeek.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    return -weeks;
  }, [data.sessions]);

  // The active session only contributes to the current week's planned/logged.
  const active = offset === 0 ? data.activeSession : null;
  const tally = useMemo(
    () => weeklyMuscleTally(data.sessions, start, active),
    [data.sessions, start, active],
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const dateFmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const totalLogged = MUSCLE_GROUPS.reduce((a, g) => a + tally[g].logged, 0);
  const totalPlanned = MUSCLE_GROUPS.reduce((a, g) => a + tally[g].planned, 0);

  return (
    <div className="weekly">
      <div className="week-nav">
        <button
          className="week-arrow"
          onClick={() => setOffset((o) => Math.max(minOffset, o - 1))}
          disabled={offset <= minOffset}
          aria-label="Previous week"
        >
          ‹
        </button>
        <div className="week-range">
          <span className="week-dates">
            {dateFmt(start)} – {dateFmt(end)}
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

      {totalLogged === 0 && totalPlanned === 0 ? (
        <p className="muted small weekly-empty">No sets logged this week.</p>
      ) : (
        <div className="muscle-list">
          {MUSCLE_GROUPS.map((g) => {
            const { logged, planned } = tally[g];
            const tealW = Math.min(logged, SET_SCALE);
            const totalW = Math.min(logged + planned, SET_SCALE);
            const tealPct = (tealW / SET_SCALE) * 100;
            const whitePct = ((totalW - tealW) / SET_SCALE) * 100;
            const hasTeal = tealW > 0;
            const hasWhite = totalW - tealW > 0;
            return (
              <div key={g} className="muscle-row">
                <span className="muscle-name">{g}</span>
                <div className="muscle-bar-track">
                  {hasTeal && (
                    <div
                      className="muscle-bar-fill"
                      style={{ width: `${tealPct}%`, borderRadius: hasWhite ? '5px 0 0 5px' : '5px' }}
                    />
                  )}
                  {hasWhite && (
                    <div
                      className="muscle-bar-planned"
                      style={{
                        left: `${tealPct}%`,
                        width: `${whitePct}%`,
                        borderRadius: hasTeal ? '0 5px 5px 0' : '5px',
                      }}
                    />
                  )}
                  <span className="muscle-bar-tick" style={{ left: `${(TICK_AT / SET_SCALE) * 100}%` }} />
                </div>
                <strong className={planned > 0 || logged === 0 ? 'muscle-sets planned' : 'muscle-sets'}>
                  {fmt(planned > 0 ? logged + planned : logged)}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
