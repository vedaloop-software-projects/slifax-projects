import { Button, Input, InputNumber, Segmented, Tooltip } from 'antd'
import { AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, BoldOutlined, CopyOutlined, DeleteOutlined, FontSizeOutlined } from '@ant-design/icons'
import type { LabelElement } from '../../types'
import { ELEMENT_INFO, MAX_FONT_MM, MAX_TEXT_LENGTH, MIN_FONT_MM, PT_PER_MM, clampElement, shapeOf } from '../../lib/freeLayout'

const toPt = (mm: number) => Math.round(mm * PT_PER_MM)
const MIN_PT = Math.ceil(MIN_FONT_MM * PT_PER_MM)
const MAX_PT = Math.floor(MAX_FONT_MM * PT_PER_MM)

/** Formatting bar for the selected element (font size, bold, alignment, text, exact position). */
export function ElementToolbar({
  el,
  frame,
  onChange,
  onDelete,
  onDuplicate,
}: {
  el: LabelElement
  frame: { width: number; height: number }
  onChange: (el: LabelElement) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const info = ELEMENT_INFO[el.kind]
  const text = shapeOf(el.kind) === 'text'
  const set = (patch: Partial<LabelElement>) => onChange(clampElement({ ...el, ...patch }, frame))

  const setFontPt = (pt: number) => {
    const fontMm = Math.min(MAX_FONT_MM, Math.max(MIN_FONT_MM, pt / PT_PER_MM))
    // Grow the box when the text no longer fits its height.
    set({ fontMm, hMm: Math.max(el.hMm, fontMm * 1.2) })
  }
  const pt = toPt(el.fontMm ?? 2.4)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
      <span className="mr-1 rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand-dark">{info.label}</span>

      {text && (
        <>
          <div className="flex items-center gap-1">
            <Tooltip title="Smaller text">
              <Button size="small" aria-label="Smaller text" icon={<FontSizeOutlined style={{ fontSize: 10 }} />} disabled={pt <= MIN_PT} onClick={() => setFontPt(pt - 1)} />
            </Tooltip>
            <InputNumber size="small" aria-label="Text size in points" className="w-[72px]!" min={MIN_PT} max={MAX_PT} value={pt} suffix="pt" onChange={(v) => v && setFontPt(v)} />
            <Tooltip title="Bigger text">
              <Button size="small" aria-label="Bigger text" icon={<FontSizeOutlined style={{ fontSize: 15 }} />} disabled={pt >= MAX_PT} onClick={() => setFontPt(pt + 1)} />
            </Tooltip>
          </div>
          <Tooltip title="Bold">
            <Button size="small" aria-label="Bold" aria-pressed={!!el.bold} type={el.bold ? 'primary' : 'default'} icon={<BoldOutlined />} onClick={() => set({ bold: !el.bold })} />
          </Tooltip>
          <Segmented
            size="small"
            value={el.align ?? 'left'}
            onChange={(align) => set({ align: align as LabelElement['align'] })}
            options={[
              { value: 'left', icon: <AlignLeftOutlined />, title: 'Align left' },
              { value: 'center', icon: <AlignCenterOutlined />, title: 'Centre' },
              { value: 'right', icon: <AlignRightOutlined />, title: 'Align right' },
            ]}
          />
          {el.kind === 'text' && (
            <Input size="small" aria-label="Text" className="w-48!" maxLength={MAX_TEXT_LENGTH} value={el.text ?? ''} placeholder="Type text" onChange={(e) => set({ text: e.target.value })} />
          )}
          {info.prefix !== undefined && (
            <Tooltip title="Word shown before the value. Clear it to show only the value.">
              <Input size="small" aria-label="Prefix" className="w-28!" maxLength={20} value={el.prefix ?? info.prefix} onChange={(e) => set({ prefix: e.target.value })} />
            </Tooltip>
          )}
        </>
      )}

      <div className="flex items-center gap-1 text-[12px] text-muted">
        {(['xMm', 'yMm', 'wMm', 'hMm'] as const).map((key) => (
          <InputNumber
            key={key}
            size="small"
            aria-label={{ xMm: 'X position', yMm: 'Y position', wMm: 'Width', hMm: 'Height' }[key]}
            className="w-[76px]!"
            step={0.5}
            precision={1}
            prefix={<span className="text-[11px] text-muted">{{ xMm: 'X', yMm: 'Y', wMm: 'W', hMm: 'H' }[key]}</span>}
            value={el[key]}
            onChange={(v) => v !== null && set({ [key]: v })}
          />
        ))}
        <span>mm</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {el.kind === 'text' && (
          <Tooltip title="Duplicate (Ctrl+D)">
            <Button size="small" aria-label="Duplicate" icon={<CopyOutlined />} onClick={onDuplicate} />
          </Tooltip>
        )}
        <Tooltip title="Remove from label (Delete)">
          <Button size="small" danger aria-label="Remove element" icon={<DeleteOutlined />} onClick={onDelete} />
        </Tooltip>
      </div>
    </div>
  )
}
