import assert from 'node:assert/strict'
import { test } from 'node:test'
import { businessCalendarDay, businessClock, businessDateText, businessDayRange, businessZone, validTimeZone, withBusinessZone, zonedTime, zoneOffsetText } from '../business-time.ts'

test('business days default to India and follow the zone set for the request', async () => {
  const now = new Date('2026-10-28T20:00:00Z')
  assert.equal(businessDateText(now), '29-10-2026')
  assert.deepEqual(businessDayRange(now), { gte: new Date('2026-10-28T18:30:00Z'), lt: new Date('2026-10-29T18:30:00Z') })
  await withBusinessZone('America/New_York', async () => {
    await Promise.resolve()
    assert.equal(businessZone(), 'America/New_York')
    assert.equal(businessDateText(now), '28-10-2026')
    assert.deepEqual(businessCalendarDay(now), new Date('2026-10-28T00:00:00Z'))
    assert.deepEqual(businessClock(now), new Date('1970-01-01T16:00:00Z'))
    assert.equal(zoneOffsetText(now), '-04:00')
  })
  assert.equal(businessZone(), 'Asia/Kolkata')
  assert.equal(withBusinessZone('not/a-zone', businessZone), 'Asia/Kolkata')
})

test('zoned midnights stay correct across daylight saving changes', () => {
  // New York leaves daylight saving on 1 Nov 2026: that day has 25 hours.
  assert.deepEqual(businessDayRange(new Date('2026-11-01T12:00:00Z'), 'America/New_York'), { gte: new Date('2026-11-01T04:00:00Z'), lt: new Date('2026-11-02T05:00:00Z') })
  assert.deepEqual(zonedTime(2026, 3, 8, '00:00:00.000', 'America/New_York'), new Date('2026-03-08T05:00:00Z'))
  assert.deepEqual(zonedTime(2026, 1, 1, '00:00:00.000', 'Asia/Kolkata'), new Date('2025-12-31T18:30:00Z'))
  assert.equal(validTimeZone('Asia/Calcutta') !== null, true)
  assert.equal(validTimeZone(''), null)
})
