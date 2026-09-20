/** Logo: a tag with a QR-ish corner — product label + identity. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0E8A5F" />
      <path d="M8 11.5A3.5 3.5 0 0 1 11.5 8h6.1c.9 0 1.8.4 2.5 1l4 4c1.3 1.4 1.3 3.6 0 5l-6.1 6.1c-1.4 1.3-3.6 1.3-5 0l-4-4c-.6-.7-1-1.6-1-2.5v-6.1Z" fill="#E7F5EE" />
      <circle cx="12.5" cy="12.5" r="1.8" fill="#0E8A5F" />
      <rect x="15" y="15" width="2.6" height="2.6" rx=".5" fill="#0E8A5F" />
      <rect x="18.4" y="15" width="2.6" height="2.6" rx=".5" fill="#0E8A5F" />
      <rect x="15" y="18.4" width="2.6" height="2.6" rx=".5" fill="#0E8A5F" />
    </svg>
  )
}
