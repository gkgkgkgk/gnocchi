import { useEffect, useState } from 'react';

import { useResolvedScheme } from '@/contexts/theme-context';

/**
 * Web variant. Returns 'light' until the client has hydrated to avoid a
 * static-render mismatch, then defers to the user's in-app preference
 * (resolved via ThemeProvider). See `contexts/theme-context.tsx`.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const scheme = useResolvedScheme();

  return hasHydrated ? scheme : 'light';
}
