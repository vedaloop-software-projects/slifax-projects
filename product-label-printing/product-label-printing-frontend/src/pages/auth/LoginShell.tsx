import { useEffect, type ReactNode } from 'react'
import { AppstoreOutlined, PrinterOutlined, TagsOutlined } from '@ant-design/icons'

const FEATURES = [
  { icon: AppstoreOutlined, title: 'Your products, organised', description: 'Keep product details and prices in one place.' },
  { icon: TagsOutlined, title: 'Labels made simple', description: 'Choose a template and prepare your barcodes.' },
  { icon: PrinterOutlined, title: 'Ready for your next print', description: 'Manage printers and review your print history.' },
]

function Wordmark() {
  return <span className="text-[32px] font-extrabold leading-none tracking-tight">Zenx<span className="text-blue-400">POS</span></span>
}

export function LoginShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'ZenxPOS | Sign in'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col overflow-hidden bg-[#101A2D] px-10 py-10 text-white lg:flex xl:px-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-1/3 size-[520px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <Wordmark />
          <p className="mt-3 text-[13px] text-slate-400">Barcode Label Management</p>
        </div>

        <div className="relative my-auto max-w-[460px] py-14">
          <div className="mb-5 text-[12px] font-semibold tracking-[0.16em] text-blue-300 uppercase">Made for your everyday operations</div>
          <h2 className="m-0 text-[40px] leading-[1.2] font-bold tracking-tight xl:text-[48px]">
            Every product.<br />Every label.<br /><span className="text-blue-400">One workspace.</span>
          </h2>
          <p className="mt-5 max-w-[380px] text-[15px] leading-7 text-slate-300">
            Bring your products, barcode labels and printers together with ZenxPOS.
          </p>
          <ul className="m-0 mt-10 list-none space-y-6 p-0">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-400/10 text-[20px] text-blue-300"><Icon aria-hidden="true" /></span>
                <div>
                  <div className="text-[14px] font-semibold text-white">{title}</div>
                  <p className="m-0 mt-1 text-[13px] leading-6 text-slate-400">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative border-t border-white/10 pt-6 text-[12px] text-slate-400">© {new Date().getFullYear()} ZenxPOS</div>
      </aside>

      <main className="flex min-w-0 flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="mb-8 text-center lg:hidden">
          <Wordmark />
          <p className="mt-3 mb-0 text-[13px] text-muted">Barcode Label Management</p>
        </div>
        <div className="page-enter w-full max-w-[480px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-10">
          {children}
        </div>
        <p className="mt-6 mb-0 text-center text-[12px] text-muted">ZenxPOS · Product labels, simplified.</p>
      </main>
    </div>
  )
}
