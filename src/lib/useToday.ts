import { useEffect, useState } from 'react';

/**
 * Today's date, re-rendering when the day rolls over.
 *
 * A session is stamped with the moment it's finished, not the moment it
 * started, so a workout carried past midnight logs as the new day. The chip
 * follows that instead of freezing on the day the session began.
 *
 * Timers are throttled or suspended while a PWA is backgrounded, which is
 * exactly when a rollover is most likely to be missed, so returning to the app
 * re-checks as well.
 */
export function useToday(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => {
      const d = new Date();
      // Only re-render on an actual day change, not on every wake.
      if (d.toDateString() !== now.toDateString()) setNow(d);
    };
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(refresh, midnight.getTime() - Date.now() + 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [now]);

  return now;
}
