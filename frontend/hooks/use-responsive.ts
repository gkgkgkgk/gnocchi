import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@/constants/theme';

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

export interface Responsive {
  width: number;
  height: number;
  /** Device class derived from width against the shared breakpoints. */
  device: DeviceClass;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True at `md` and up — where two-pane / multi-column layouts turn on. */
  isWide: boolean;
  landscape: boolean;
  /** Suggested grid column count for card lists (1–4). */
  columns: number;
}

/**
 * Single source of truth for layout decisions. Replaces the ad-hoc
 * `Math.floor(width / 300)` scattered across screens so breakpoints stay
 * consistent as we build out the iPad/phone layouts in Phase 4.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  const device: DeviceClass =
    width >= breakpoints.lg ? 'desktop' : width >= breakpoints.sm ? 'tablet' : 'phone';

  const columns = Math.max(1, Math.min(4, Math.floor(width / 300)));

  return {
    width,
    height,
    device,
    isPhone: device === 'phone',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isWide: width >= breakpoints.md,
    landscape: width > height,
    columns,
  };
}
