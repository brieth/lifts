import { useEffect, useRef } from 'react';

/** Open overlays, outermost first. Only the last one answers a back gesture. */
const overlays: { close: () => void }[] = [];

/**
 * Popstate events we caused ourselves by calling history.back() in a cleanup.
 * A programmatic close has to drop the entry it pushed, but the resulting
 * popstate is indistinguishable from a real back gesture, so it gets counted
 * here and swallowed rather than closing whatever sits underneath.
 */
let selfInflicted = 0;

/**
 * Makes the Android back gesture (and browser back) close an overlay rather
 * than leaving the app.
 *
 * While `open`, a history entry is pushed. A back gesture pops it, which fires
 * popstate and closes the overlay instead of navigating away. If the overlay is
 * dismissed some other way (Close button, tapping the backdrop), the cleanup
 * removes the entry we added so back doesn't become a no-op afterwards.
 *
 * Overlays nest: a station's calibration form sits on top of the station form.
 * Back peels one layer at a time, and closing the top layer any other way
 * leaves the one below it open.
 */
export function useBackToClose(open: boolean, close: () => void): void {
  // Held in a ref so the effect depends only on `open`. Otherwise a caller
  // passing an inline arrow would re-run it every render, pushing an entry each time.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    let poppedByBack = false;
    const entry = { close: () => closeRef.current() };
    overlays.push(entry);
    history.pushState({ overlay: true }, '');
    const onPop = () => {
      if (selfInflicted > 0) {
        selfInflicted--;
        return;
      }
      // Every open overlay hears this, so only the topmost acts on it.
      if (overlays[overlays.length - 1] !== entry) return;
      poppedByBack = true;
      entry.close();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      const i = overlays.indexOf(entry);
      if (i >= 0) overlays.splice(i, 1);
      if (!poppedByBack) {
        selfInflicted++;
        history.back();
      }
    };
  }, [open]);
}
