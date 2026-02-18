/**
 * Hook to detect if the window has focus.
 * Useful for pausing polling when user switches to another window.
 */
import { useEffect, useState } from 'react';

export function useWindowFocus(): boolean {
  const [isFocused, setIsFocused] = useState<boolean>(
    typeof document !== 'undefined' ? document.hasFocus() : true
  );

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}
