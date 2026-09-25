import { useState } from 'react'
import { selectedPrinter } from '../../lib/printerProfiles'
import { useDb } from '../../mock/db'
import type { PrintJob, PrintState } from '../../types'

/** Printer + template selection shared by the print station and the queue page. */
export function usePrintSetup() {
  const db = useDb()
  const firstOnline = db.printers.find((p) => p.status === 'CONNECTED') ?? db.printers[0]
  const [printerId, setPrinterId] = useState<string | undefined>(firstOnline?.id)
  const printer = selectedPrinter(db.printers, printerId)
  const [templateOverride, setTemplateOverride] = useState<string | undefined>()
  const templateId = templateOverride ?? printer?.templateId ?? db.templates[0]?.id
  const template = db.templates.find((t) => t.id === templateId)
  return {
    printer,
    template,
    setPrinterId: (id: string) => {
      setPrinterId(id)
      setTemplateOverride(undefined)
    },
    setTemplateId: setTemplateOverride,
  }
}

export type PrintSetup = ReturnType<typeof usePrintSetup>

const ACTIVE: PrintState[] = ['QUEUED', 'VALIDATING', 'GENERATING', 'SENT_TO_PRINTER', 'PRINTING']

export function jobSummary(job: PrintJob) {
  const total = job.items.reduce((a, i) => a + i.quantity, 0)
  const printed = job.items.reduce((a, i) => a + i.printed, 0)
  const failed = job.items.filter((i) => i.state === 'FAILED').reduce((a, i) => a + (i.quantity - i.printed), 0)
  const printing = job.items.filter((i) => ACTIVE.includes(i.state)).reduce((a, i) => a + (i.quantity - i.printed), 0)
  return { total, printed, failed, printing, done: !!job.finishedAt }
}
