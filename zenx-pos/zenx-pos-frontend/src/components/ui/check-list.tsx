import { CircleCheck } from 'lucide-react'
import { cn } from './layout'

/**
 * Bullet list with check marks. Items written as "Label: detail" show the label in bold,
 * as the original industry pages did.
 */
export function CheckList({ items, columns = 1, className }: { items: string[]; columns?: 1 | 2; className?: string }) {
  return (
    <ul className={cn('grid gap-3', columns === 2 && 'sm:grid-cols-2', className)}>
      {items.map(item => {
        const split = item.indexOf(': ')
        const label = split > 0 && split < 40 ? item.slice(0, split) : null
        return (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-body sm:text-base">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-500" />
            <span>{label ? <><strong className="font-semibold text-ink">{label}:</strong> {item.slice(split + 2)}</> : item}</span>
          </li>
        )
      })}
    </ul>
  )
}
