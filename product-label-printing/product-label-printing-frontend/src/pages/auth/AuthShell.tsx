import type { ReactNode } from 'react'
import { CheckCircleFilled } from '@ant-design/icons'
import { BrandMark } from '../../components/BrandMark'

const POINTS = ['One global ID per product — labels stay printer-independent', 'Zebra, TSC and TVS printers from one print queue', 'Every print and every QR scan tracked end to end']

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0C1F18] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[460px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={38} />
          <div>
            <div className="text-[17px] font-bold tracking-tight">Smart Label</div>
            <div className="text-[12px] text-white/50">Product Label &amp; Traceability Platform</div>
          </div>
        </div>

        <div className="relative my-auto max-w-[480px]">
          <h2 className="m-0 text-[38px] leading-[1.12] font-bold tracking-tight">
            Print it. Scan it.
            <br />
            <span className="text-emerald-300">Trace every label.</span>
          </h2>
          <ul className="m-0 mt-8 list-none space-y-3.5 p-0">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] text-white/75">
                <CheckCircleFilled className="mt-1 text-emerald-400" />
                {p}
              </li>
            ))}
          </ul>

          {/* Illustrative label */}
          <div className="mt-12 w-[330px] rotate-[-3deg] rounded-md bg-white p-4 font-[Arial] text-black shadow-2xl shadow-black/40 transition-transform duration-500 hover:rotate-0">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="text-[12px] font-bold">VIJAYA DURGA SUPER MARKET</div>
                <div className="text-[10px]">JUBILEE HILLS</div>
                <div className="mt-1.5 text-[16px] font-bold">TOOR DAL 1KG</div>
                <div className="text-[11px]">
                  MRP <s>₹195</s> &nbsp;<b>SALE ₹138</b>
                </div>
                <div className="mt-2 flex h-7 items-end gap-[1.5px]">
                  {'2113121221132112312211321213'.split('').map((w, i) => (
                    <span key={i} className={i % 2 ? 'bg-transparent' : 'bg-black'} style={{ width: Number(w) * 1.3, height: '100%' }} />
                  ))}
                </div>
                <div className="mt-0.5 text-[10px] tracking-[0.2em]">00000401</div>
              </div>
              <div className="grid size-[74px] shrink-0 grid-cols-7 grid-rows-7 gap-px self-center">
                {Array.from({ length: 49 }, (_, i) => {
                  const r = Math.floor(i / 7)
                  const c = i % 7
                  const finder = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2)
                  return <span key={i} className={finder || (i * 7 + 3) % 5 < 2 ? 'bg-black' : 'bg-white'} />
                })}
              </div>
            </div>
            <div className="mt-1.5 text-[10px]">Packed: 06-09-26 &nbsp; Expiry: 06-12-26</div>
          </div>
        </div>

        <div className="relative text-[12px] text-white/35">© {new Date().getFullYear()} Smart Label Platform</div>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="page-enter w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark size={34} />
            <span className="text-[17px] font-bold">Smart Label</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
