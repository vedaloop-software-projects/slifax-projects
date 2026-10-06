/**
 * ZenxPOS wordmark. `light` (white + cyan) sits on dark backgrounds such as the sidebar;
 * `dark` (navy + cyan) on light ones. Transparent PNGs cut from the brand artwork.
 */
export function ZenxLogo({ variant = 'light', height = 36, className }: { variant?: 'light' | 'dark'; height?: number; className?: string }) {
  return (
    <img
      src={variant === 'light' ? '/brand/zenxpos-logo-light.png' : '/brand/zenxpos-logo-dark.png'}
      alt="ZenxPOS"
      height={height}
      style={{ height, width: 'auto' }}
      className={className}
      draggable={false}
    />
  )
}
