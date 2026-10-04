/** Zenx POS mark: a crisp blue label tile with a white Z monogram. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#2563EB" />
      <path d="M8 9h16v3L13 21h11v3H8v-3l11-9H8V9Z" fill="white" />
      <path d="M24 7v5h-2V9h-3V7h5Z" fill="#BFDBFE" />
    </svg>
  )
}
