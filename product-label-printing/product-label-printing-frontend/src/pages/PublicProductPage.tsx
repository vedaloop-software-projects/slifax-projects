import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Skeleton } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled } from '@ant-design/icons'
import { identity, type ResolveResult } from '../api'
import { BrandMark } from '../components/BrandMark'
import { fmtDate } from '../lib/dates'
import { money } from '../lib/format'

/** Public resolver page (§7). Reached by scanning a QR — no login, only whitelisted fields. */
export function PublicProductPage() {
  const { qrId = '' } = useParams()
  const [res, setRes] = useState<ResolveResult | null>(null)
  const resolved = useRef<string | null>(null)

  useEffect(() => {
    // StrictMode double-invokes effects in dev; record one scan per page view.
    if (resolved.current === qrId) return
    resolved.current = qrId
    void identity.resolve(qrId, navigator.userAgent).then(setRes)
  }, [qrId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-soft to-canvas px-4 py-8">
      <div className="page-enter mx-auto max-w-[420px]">
        {!res ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-black/5">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : res.status !== 'OK' ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-black/5">
            <CloseCircleFilled className="text-[44px] text-red-500" />
            <h1 className="mt-4 mb-1 text-[20px] font-bold">{res.status === 'REVOKED' ? 'This code is no longer valid' : 'Product not found'}</h1>
            <p className="m-0 text-muted">
              {res.status === 'REVOKED' ? 'The seller has withdrawn this label. Please ask at the store.' : 'We couldn’t find a product for this code. It may be damaged or not genuine.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-black/5">
            <div className="bg-[#0C1F18] px-6 pt-6 pb-5 text-white">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">{res.data.shopName}</div>
              <div className="text-[12px] text-white/50">{res.data.shopLocation}</div>
              <h1 className="mt-4 mb-0 text-[26px] leading-tight font-bold">{res.data.name}</h1>
              <div className="mt-1 text-[13px] text-white/60">
                {res.data.brand} · {res.data.category}
              </div>
            </div>

            <div className="px-6 py-5">
              {(res.data.salePrice != null || res.data.mrp != null) && (
                <div className="flex items-end gap-3">
                  {res.data.salePrice != null && <div className="text-[34px] leading-none font-extrabold text-ink">{money(res.data.salePrice)}</div>}
                  {res.data.mrp != null && (
                    <div className="pb-1 text-[14px] text-muted">
                      MRP <s>{money(res.data.mrp)}</s>
                    </div>
                  )}
                  {res.data.mrp && res.data.salePrice != null && res.data.mrp > res.data.salePrice && (
                    <span className="mb-1 ml-auto rounded-full bg-orange-100 px-2.5 py-0.5 text-[12px] font-bold text-orange-700">
                      {Math.round((1 - res.data.salePrice / res.data.mrp) * 100)}% off
                    </span>
                  )}
                </div>
              )}
              <div className="mt-2 text-[11px] text-muted">Inclusive of all taxes</div>

              <dl className="m-0 mt-5 divide-y divide-line rounded-2xl border border-line">
                {[
                  ['Packed', res.data.packedDate && fmtDate(res.data.packedDate)],
                  ['Expiry', res.data.expiryDate ? fmtDate(res.data.expiryDate) : res.data.packedDate ? 'No expiry' : null],
                  ['Product code', res.data.productCode],
                  ['Batch', res.data.batchCode],
                  ['Unit', res.data.unit],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between px-4 py-3 text-[14px]">
                      <dt className="text-muted">{k}</dt>
                      <dd className={`m-0 font-semibold tabular-nums ${k === 'Expiry' && res.data.expired ? 'text-red-600' : ''}`}>{v}</dd>
                    </div>
                  ))}
              </dl>

              {res.data.expired ? (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
                  <ExclamationCircleFilled className="text-[22px]" />
                  <div>
                    <div className="font-bold">Past expiry date</div>
                    <div className="text-[13px]">Please don’t consume. Return it to the store.</div>
                  </div>
                </div>
              ) : !res.data.active ? (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
                  <ExclamationCircleFilled className="text-[22px]" />
                  <div className="font-semibold">This product is no longer sold</div>
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-soft p-4 text-brand-dark">
                  <CheckCircleFilled className="text-[24px] text-brand" />
                  <div>
                    <div className="font-bold">Product verified</div>
                    <div className="text-[13px] opacity-80">Genuine label issued by {res.data.shopName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-muted">
          <BrandMark size={18} /> Verified by Smart Label
        </div>
      </div>
    </div>
  )
}
