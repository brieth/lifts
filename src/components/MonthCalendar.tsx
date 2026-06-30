import { useMemo, useState } from 'react';
import { useStore } from '../store';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun–Sat
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function MonthCalendar() {
  const { data } = useStore();
  const [offset, setOffset] = useState(0); // months from the current month

  // Days that have at least one logged session, plus the earliest session date.
  const { logged, earliest } = useMemo(() => {
    const s = new Set<string>();
    let min: Date | null = null;
    for (const sess of data.sessions) {
      const d = new Date(sess.date);
      s.add(dayKey(d));
      if (!min || d < min) min = d;
    }
    return { logged: s, earliest: min };
  }, [data.sessions]);

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const todayKey = dayKey(today);

  const firstDow = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Don't page back past the first logged month (or at all if nothing's logged).
  const atFirstMonth =
    !earliest ||
    year < earliest.getFullYear() ||
    (year === earliest.getFullYear() && month <= earliest.getMonth());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="weekly">
      <div className="week-nav">
        <button
          className="week-arrow"
          onClick={() => setOffset((o) => o - 1)}
          disabled={atFirstMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="week-range">
          <span className="week-dates">
            {MONTHS[month]} {year}
          </span>
          {offset === 0 && <span className="week-tag">This month</span>}
        </div>
        <button
          className="week-arrow"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => (
          <span key={`dow-${i}`} className="cal-dow">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`blank-${i}`} className="cal-cell empty" />;
          const key = `${year}-${month}-${d}`;
          const cls =
            'cal-cell' + (logged.has(key) ? ' done' : '') + (key === todayKey ? ' today' : '');
          return (
            <span key={`d-${d}`} className={cls}>
              {d}
            </span>
          );
        })}
      </div>
    </div>
  );
}
