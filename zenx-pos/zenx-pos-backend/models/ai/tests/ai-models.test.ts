import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { daysOfCover, demandReason, fitDemand, forecastDays } from '../forecast.ts'
import { boughtTogether, scoreCustomers, slowHours, suggestPrice, unusualActivity, type HourCell } from '../insights.ts'
import { draftProduct, parsePack } from '../product-model.ts'

describe('ZenxPOS AI demand forecast', () => {
  it('learns weekday peaks and forecasts them', () => {
    // 8 weeks starting on a Monday: 10 a day, 30 on Saturdays.
    const series = Array.from({ length: 56 }, (_, index) => ((1 + index) % 7 === 6 ? 30 : 10))
    const model = fitDemand(series, 1)
    const week = forecastDays(model, 1, 7)
    assert.ok(week[5] > week[0] * 2, 'Saturday forecast is well above Monday')
    assert.match(demandReason(model), /Saturdays sell/)
  })

  it('counts days of cover and reports stock-outs', () => {
    const model = fitDemand(new Array(56).fill(5), 0)
    assert.equal(daysOfCover(model, 12, 0), 3)
    assert.equal(daysOfCover(model, 0, 0), 0)
    assert.equal(daysOfCover(fitDemand(new Array(56).fill(0), 0), 10, 0), null)
  })

  it('notices a rising trend', () => {
    const series = [...new Array(42).fill(10), ...new Array(14).fill(16)]
    assert.match(demandReason(fitDemand(series, 0)), /Sales up/)
  })
})

describe('ZenxPOS AI store insights', () => {
  it('sorts customers into loyal, at risk, lost and new', () => {
    const visits = [
      ...[1, 4, 7, 10, 13].map(daysAgo => ({ customerId: 'loyal', daysAgo, amount: 100 })),
      ...[40, 45, 50, 55].map(daysAgo => ({ customerId: 'risk', daysAgo, amount: 50 })),
      { customerId: 'lost', daysAgo: 120, amount: 30 },
      { customerId: 'new', daysAgo: 5, amount: 20 },
    ]
    const groups = Object.fromEntries(scoreCustomers(visits).map(score => [score.customerId, score.group]))
    assert.deepEqual(groups, { loyal: 'loyal', risk: 'at_risk', lost: 'lost', new: 'new' })
  })

  it('flags only values far above the usual day', () => {
    const history = new Array(20).fill(1)
    assert.equal(unusualActivity([{ key: 'cancelled', label: 'Bills cancelled', today: 6, history, minimum: 3 }]).length, 1)
    assert.equal(unusualActivity([{ key: 'cancelled', label: 'Bills cancelled', today: 2, history, minimum: 3 }]).length, 0)
    assert.equal(unusualActivity([{ key: 'cancelled', label: 'Bills cancelled', today: 4, history: [3, 5, 4, 6], minimum: 3 }]).length, 0)
  })

  it('finds items bought together more than chance', () => {
    const bills = [...new Array(40).fill(['bread', 'butter']), ...new Array(60).fill(['milk']), ...new Array(20).fill(['bread'])]
    const [pair] = boughtTogether(bills, { minTogether: 5 })
    assert.equal(`${pair.a}+${pair.b}`, 'butter+bread')
    assert.equal(pair.confidence, 1)
  })

  it('finds slow hours inside opening hours', () => {
    const cells: HourCell[] = []
    for (const weekday of [1, 2, 3, 4, 5]) for (let hour = 9; hour <= 20; hour++) cells.push({ weekday, hour, days: hour === 15 ? 1 : 8, total: hour === 15 ? 50 : 1000 })
    assert.deepEqual(slowHours(cells, 8).map(slot => [slot.weekdays.length, slot.fromHour, slot.toHour]), [[5, 15, 16]])
  })

  it('suggests a price that restores the margin under MRP', () => {
    assert.deepEqual(suggestPrice({ previousCost: 80, latestCost: 90, salePrice: 100, mrp: 120 }), { marginWas: 20, marginNow: 10, suggestedPrice: 113 })
    assert.equal(suggestPrice({ previousCost: 80, latestCost: 90, salePrice: 100, mrp: 100 }), null)
    assert.equal(suggestPrice({ previousCost: 90, latestCost: 80, salePrice: 100, mrp: 120 }), null)
  })
})

describe('ZenxPOS AI product creation', () => {
  const masters = {
    categories: [{ id: 1, name: 'Ice creams' }, { id: 2, name: 'Personal care' }], subCategories: [{ id: 5, name: 'Hair care', categoryId: 2 }],
    brands: [{ id: 9, name: 'Amul' }], units: [{ id: 3, name: 'NOS' }, { id: 4, name: 'KG' }], taxes: [{ id: 7, name: 'Tax5%', percent: 5 }, { id: 8, name: 'Tax18%', percent: 18 }],
  }
  const store = [{ name: 'Vanilla Ice Cream', category: 'Ice creams', subCategory: null, hsn: '2105', taxPercent: 5 }]

  it('reads pack sizes', () => {
    assert.equal(parsePack('Dove Shampoo 340ml')?.packSize, '340 ml')
    assert.equal(parsePack('Fortune Oil 1 Ltr')?.packSize, '1 L')
    assert.equal(parsePack('Tomato'), null)
  })

  it('creates a draft matched to the store masters', () => {
    const draft = draftProduct('Dove Intense Repair Shampoo 340ml', masters, store)
    assert.deepEqual([draft.brand?.name, draft.category, draft.subCategory, draft.unit, draft.hsn, draft.tax?.id], ['Dove', { id: 2, name: 'Personal care' }, { id: 5, name: 'Hair care' }, { id: 3, name: 'NOS' }, '3305', 7])
    assert.equal(draft.packSize, '340 ml')
  })

  it('uses brand hints and the store own categories', () => {
    assert.equal(draftProduct('Surf Excel Easy Wash 1kg', masters, store).subCategory?.name, 'Laundry')
    assert.equal(draftProduct('Butterscotch Ice Cream 1L', masters, store).category?.id, 1)
    assert.equal(draftProduct('Tomato', masters, store).unit.id, 4)
  })

  it('says so when it cannot tell', () => {
    const draft = draftProduct('Xyzzy Widget', masters, store)
    assert.equal(draft.confidence, 'low')
    assert.equal(draft.category, null)
  })
})
