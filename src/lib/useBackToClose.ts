import { useEffect, useRef } from 'react';

/** Open overlays, outermost first. Only the last one answers a back gesture. */
const overlays: { close: () => void }[] = [];

/**
 * Number of history.back() calls we made ourselves and haven't seen land yet.
 * A programmatic close has to drop the entry it pushed, but the resulting
 * popstate is indistinguishable from a real back gesture, so overlays stand
 * down while this is above zero rather than treating it as a gesture.
 */
let closing = 0;

/**
 * Drop the history entry an overlay pushed, absorbing the popstate it causes.
 *
 * The listener that clears the flag has to be its own, not an overlay's: when
 * the last overlay closes there are no overlay listeners left to run, and a
 * flag cleared by one of those would stay stuck and swallow the next real back
 * gesture. Registering it here also puts it last, so any still-open overlay
 * sees the flag and stands down before this clears it.
 */
function popSelf(): void {
  closing++;
  const absorb = () => {
    window.removeEventListener('popstate', absorb);
    closing--;
  };
  window.addEventListener('popstate', absorb);
  history.back();
}

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
      if (closing > 0) return;
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
      if (!poppedByBack) popSelf();
    };
  }, [open]);
}
