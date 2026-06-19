import { useEffect, useRef, useState } from 'react';

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const tick = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          beep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running]);

  function start(seconds: number) {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(true);
  }

  function toggle() {
    if (remaining === 0) start(duration);
    else setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setRemaining(0);
  }

  const display = remaining > 0 ? remaining : duration;
  const mm = String(Math.floor(display / 60)).padStart(2, '0');
  const ss = String(display % 60).padStart(2, '0');

  return (
    <div className={`rest-timer ${running ? 'running' : ''}`}>
      <div className="rest-timer-row">
        <button className="timer-display" onClick={toggle} aria-label="Toggle rest timer">
          {mm}:{ss}
        </button>
        <div className="rest-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={p === duration ? 'preset active' : 'preset'}
              onClick={() => start(p)}
            >
              {p < 60 ? `${p}s` : `${p / 60}m`}
            </button>
          ))}
          <button className="preset ghost" onClick={reset}>
            reset
          </button>
        </div>
      </div>
    </div>
  );
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* audio not available */
  }
}
