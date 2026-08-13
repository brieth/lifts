import { useEffect, useRef } from 'react';

/**
 * Makes the Android back gesture (and browser back) close an overlay rather
 * than leaving the app.
 *
 * While `open`, a history entry is pushed. A back gesture pops it, which fires
 * popstate and closes the overlay instead of navigating away. If the overlay is
 * dismissed some other way (Close button, tapping the backdrop), the cleanup
 * removes the entry we added so back doesn't become a no-op afterwards.
 */
export function useBackToClose(open: boolean, close: () => void): void {
  // Held in a ref so the effect depends only on `open`. Otherwise a caller
  // passing an inline arrow would re-run it every render, pushing an entry each time.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    let poppedByBack = false;
    history.pushState({ overlay: true }, '');
    const onPop = () => {
      poppedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBack) history.back();
    };
  }, [open]);
}
