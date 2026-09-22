import { Segmented, Tooltip } from 'antd'
import type { LabelTemplate } from '../types'
import { sheetGeometry, type PageMode, type PrintSetup, type Rotation } from './geometry'
import { templateSetup } from './labelOutput'

/**
 * Page size and rotation for browser printing. These must match the paper the
 * printer driver holds, otherwise Chrome rotates/shrinks the labels to fit.
 */
export function PageSetupControls({ template, setup, onChange }: { template: LabelTemplate; setup: PrintSetup; onChange: (s: PrintSetup) => void }) {
  const merged = templateSetup(template, setup)
  const geo = sheetGeometry(template, merged)
  const set = <K extends keyof PrintSetup>(k: K, v: PrintSetup[K]) => onChange({ ...setup, [k]: v })

  return (
    <div className="mt-3 rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">Page setup</span>
        <Tooltip title="Set this exact size as the paper size in your printer driver">
          <span className="font-mono text-[11.5px] font-semibold text-brand">
            {geo.pageW.toFixed(1)} × {geo.pageH.toFixed(1)} mm
          </span>
        </Tooltip>
      </div>
      <Segmented<PageMode>
        block
        size="small"
        value={merged.pageMode ?? 'ROW'}
        onChange={(v) => set('pageMode', v)}
        options={[
          { value: 'SINGLE', label: 'One label' },
          { value: 'ROW', label: `Row (${template.columns}UP)` },
        ]}
      />
      <Segmented<Rotation>
        block
        size="small"
        className="mt-1.5"
        value={merged.rotate ?? 0}
        onChange={(v) => set('rotate', v)}
        options={[
          { value: 0, label: '0°' },
          { value: 90, label: '90°' },
          { value: 180, label: '180°' },
          { value: 270, label: '270°' },
        ]}
      />
    </div>
  )
}
