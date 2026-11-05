import assert from 'node:assert/strict'
import test from 'node:test'
import type { SendMailOptions } from 'nodemailer'
import { SmtpWebsiteEnquiryEmailDelivery, type WebsiteEnquiryMailTransport, type WebsiteEnquiryTransportFactory } from '../email.ts'
import type { WebsiteEnquiry } from '../contracts.ts'

const environment: NodeJS.ProcessEnv = {
  SUPPORT_SMTP_HOST: 'smtp.example.com', SUPPORT_SMTP_USER: 'support@example.com', SUPPORT_SMTP_APP_PASSWORD: 'abcd efgh ijkl mnop',
  SUPPORT_EMAIL_FROM: 'ZenxPOS support <support@example.com>', SUPPORT_EMAIL_TO: 'support-inbox@example.com',
}
const enquiry: WebsiteEnquiry = {
  id: 9007199254740993n, submissionId: 'fa31b9e1-1544-45a0-b845-bf96f75122c8', type: 'quote', selectedPlan: 'Premium',
  businessName: 'North Street Store', contactPersonName: 'Sam Owner', mobile: '+91 98765 43210', email: 'sam@example.net',
  businessTypeId: 5n, businessTypeName: 'Retail', city: 'Chennai', subject: 'Two-counter setup', message: 'Please include a scanner.\nWe have two tills.',
  status: 'new', readAt: null, createdAt: new Date('2026-11-05T12:00:00.000Z'), updatedAt: new Date('2026-11-05T12:00:00.000Z'),
}

function fixture(env = environment, send?: WebsiteEnquiryMailTransport['sendMail']) {
  const messages: SendMailOptions[] = []
  const options: Parameters<WebsiteEnquiryTransportFactory>[0][] = []
  let closes = 0
  const factory: WebsiteEnquiryTransportFactory = config => {
    options.push(config)
    return {
      async sendMail(mail) {
        messages.push(mail)
        return send ? send(mail) : { accepted: (mail.to as Array<{ address: string }>).map(value => value.address), rejected: [] }
      },
      close() { closes += 1 },
    }
  }
  const delivery = new SmtpWebsiteEnquiryEmailDelivery(env, factory)
  return { delivery, messages, options, get closes() { return closes } }
}

test('uses support SMTP and mailbox fallback without making a connection during construction', async () => {
  const subject = fixture()
  assert.equal(subject.delivery.configured, true)
  assert.equal(subject.options.length, 0)
  await subject.delivery.send(enquiry)
  assert.deepEqual(subject.options[0], {
    host: 'smtp.example.com', port: 465, secure: true, requireTLS: false,
    auth: { user: 'support@example.com', pass: 'abcdefghijklmnop' },
    connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 20_000, dnsTimeout: 10_000, logger: false, debug: false,
  })
  assert.deepEqual(subject.messages[0]!.from, { name: 'ZenxPOS support', address: 'support@example.com' })
  assert.deepEqual(subject.messages[0]!.to, [{ name: '', address: 'support-inbox@example.com' }])
  assert.equal(subject.closes, 1)
  const userFallback = fixture({ ...environment, SUPPORT_EMAIL_FROM: ' ' })
  await userFallback.delivery.send(enquiry)
  assert.deepEqual(userFallback.messages[0]!.from, { name: '', address: 'support@example.com' })
})

test('enquiry overrides select recipients and sender while STARTTLS is mandatory on a non-implicit TLS connection', async () => {
  const subject = fixture({
    ...environment, SUPPORT_SMTP_PORT: '587', SUPPORT_SMTP_SECURE: 'false',
    ENQUIRY_EMAIL_FROM: 'ZenxPOS enquiries <alerts@mail.example.com>',
    ENQUIRY_EMAIL_TO: 'sales@example.com, Operations <ops@example.com>, SALES@example.com',
  })
  await subject.delivery.send(enquiry)
  assert.equal(subject.options[0]!.port, 587)
  assert.equal(subject.options[0]!.secure, false)
  assert.equal(subject.options[0]!.requireTLS, true)
  assert.deepEqual(subject.messages[0]!.from, { name: 'ZenxPOS enquiries', address: 'alerts@mail.example.com' })
  assert.deepEqual((subject.messages[0]!.to as Array<{ address: string }>).map(value => value.address.toLowerCase()), ['sales@example.com', 'ops@example.com'])
  assert.equal(subject.messages[0]!.messageId, `<website-enquiry.${enquiry.submissionId}@mail.example.com>`)
})

test('renders every enquiry detail in text and escaped HTML, with visitor Reply-To and fixed safe headers', async () => {
  const hostile = {
    ...enquiry, businessName: '<img src=x onerror="alert(1)"> & Shop', contactPersonName: "Sam's <Team>",
    city: 'City & District', businessTypeName: '<Retail>', subject: 'Trial\r\nBcc: attacker@example.com',
    message: '<script>alert("hello")</script>\nPlease send prices & options.',
  }
  const subject = fixture()
  await subject.delivery.send(hostile)
  const mail = subject.messages[0]!
  const text = String(mail.text), html = String(mail.html)
  for (const detail of [enquiry.id.toString(), enquiry.submissionId, 'Quote request', enquiry.selectedPlan!, hostile.businessName, hostile.contactPersonName, enquiry.mobile, enquiry.email, hostile.city, hostile.businessTypeName, enquiry.businessTypeId!.toString(), enquiry.createdAt.toISOString(), hostile.subject, hostile.message]) assert.ok(text.includes(detail), `Missing text detail: ${detail}`)
  for (const detail of ['ZENX-9007199254740993', enquiry.submissionId, 'Quote request', 'Premium', '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; Shop', 'Sam&#39;s &lt;Team&gt;', 'City &amp; District', '&lt;Retail&gt;', '&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;', enquiry.mobile, enquiry.email, enquiry.createdAt.toISOString(), 'Bcc: attacker@example.com']) assert.ok(html.includes(detail), `Missing HTML detail: ${detail}`)
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('<img'), false)
  assert.equal(mail.subject, '[ZenxPOS] Quote request #9007199254740993')
  assert.deepEqual(mail.replyTo, { name: '', address: 'sam@example.net' })
  assert.equal(mail.disableFileAccess, true)
  assert.equal(mail.disableUrlAccess, true)
  assert.equal(html.includes('Open enquiry inbox'), false)
})

test('contact enquiries preserve null optional details without inventing a selected plan', async () => {
  const subject = fixture()
  await subject.delivery.send({ ...enquiry, type: 'contact', selectedPlan: null, city: null, businessTypeId: null, businessTypeName: null })
  const mail = subject.messages[0]!
  assert.equal(mail.subject, '[ZenxPOS] Contact enquiry #9007199254740993')
  assert.match(String(mail.text), /Selected plan: Not specified/)
  assert.match(String(mail.text), /City: Not specified/)
  assert.match(String(mail.text), /Business type: Not specified/)
  assert.match(String(mail.text), /Business type ID: Not specified/)
})

test('retries keep a stable Message-ID while separate enquiries have separate identities', async () => {
  const subject = fixture()
  await subject.delivery.send(enquiry)
  await subject.delivery.send({ ...enquiry, subject: 'Edited internal text' })
  await subject.delivery.send({ ...enquiry, submissionId: 'a1e3f72f-6f45-41f2-b122-688e9ff72a01' })
  assert.equal(subject.messages[0]!.messageId, subject.messages[1]!.messageId)
  assert.notEqual(subject.messages[0]!.messageId, subject.messages[2]!.messageId)
  assert.equal(subject.options.length, 3)
  assert.equal(subject.closes, 3)
})

test('admin links use the configured app base and replace every existing fragment with the enquiry inbox', async () => {
  for (const base of ['https://admin.example.com/', 'https://admin.example.com/app/#/dashboard', 'http://localhost:5173/', 'http://127.0.0.1:5173/', 'http://[::1]:5173/']) {
    const subject = fixture({ ...environment, ENQUIRY_ADMIN_URL: base })
    assert.equal(subject.delivery.configured, true)
    await subject.delivery.send(enquiry)
    const expected = new URL(base)
    expected.hash = '/website-enquiries'
    assert.ok(String(subject.messages[0]!.text).includes(expected.toString()))
    assert.ok(String(subject.messages[0]!.html).includes(`href="${expected.toString()}"`))
  }
})

test('missing or invalid configuration disables delivery without creating a transport or crashing construction', async () => {
  const invalid: NodeJS.ProcessEnv[] = [
    {}, ...['', 'smtp://example.com', 'smtp..example.com', 'smtp.-example.com'].map(host => ({ ...environment, SUPPORT_SMTP_HOST: host })),
    { ...environment, SUPPORT_SMTP_USER: '' }, { ...environment, SUPPORT_SMTP_APP_PASSWORD: ' ' },
    { ...environment, SUPPORT_EMAIL_TO: '' }, { ...environment, ENQUIRY_EMAIL_TO: 'valid@example.com, invalid' },
    { ...environment, ENQUIRY_EMAIL_FROM: 'first@example.com, second@example.com' },
    { ...environment, ENQUIRY_EMAIL_FROM: 'sender@example.com\r\nBcc: other@example.com' },
    ...['0', '65536', '3.5', 'invalid'].map(port => ({ ...environment, SUPPORT_SMTP_PORT: port })),
    { ...environment, SUPPORT_SMTP_SECURE: 'sometimes' },
    ...['http://admin.example.com/', 'javascript:alert(1)', 'https://user:password@admin.example.com/', 'https://admin.example.com/?token=secret', 'not a URL'].map(url => ({ ...environment, ENQUIRY_ADMIN_URL: url })),
  ]
  for (const env of invalid) {
    const subject = fixture(env)
    assert.equal(subject.delivery.configured, false)
    await assert.rejects(subject.delivery.send(enquiry), /not configured/)
    assert.equal(subject.options.length, 0)
  }
})

test('rejects invalid visitor addresses and unsafe message identities before creating a transport', async () => {
  for (const invalid of [{ ...enquiry, email: 'visitor@example.com\r\nBcc: another@example.com' }, { ...enquiry, submissionId: 'fake\r\nX-Header: value' }]) {
    const subject = fixture()
    await assert.rejects(subject.delivery.send(invalid), /Invalid website enquiry email data/)
    assert.equal(subject.options.length, 0)
  }
})

test('partial acceptance, pending recipients, and empty acceptance throw so the durable worker retries', async () => {
  for (const result of [
    { accepted: ['first@example.com'], rejected: ['second@example.com'] },
    { accepted: ['first@example.com'], rejected: [] },
    { accepted: [], rejected: [] },
    { accepted: ['first@example.com', 'second@example.com'], rejected: [], pending: ['second@example.com'] },
  ]) {
    const subject = fixture({ ...environment, ENQUIRY_EMAIL_TO: 'first@example.com, second@example.com' }, async () => result)
    await assert.rejects(subject.delivery.send(enquiry), /not accepted by every recipient/)
    assert.equal(subject.closes, 1)
  }
  const subject = fixture(environment, async () => ({ accepted: [{ address: 'SUPPORT-INBOX@example.com' }], rejected: [] }))
  await subject.delivery.send(enquiry)
})

test('SMTP failures propagate to the worker and always clean up their transport', async () => {
  const failure = new Error('Simulated SMTP authentication failure')
  const subject = fixture(environment, async () => { throw failure })
  await assert.rejects(subject.delivery.send(enquiry), error => error === failure)
  assert.equal(subject.closes, 1)
})

test('a hung send closes at the 45-second deadline and rejects even if the transport never settles', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const subject = fixture(environment, () => new Promise(() => {}))
  const sending = subject.delivery.send(enquiry)
  const rejection = assert.rejects(sending, /delivery timed out/)
  context.mock.timers.tick(44_999)
  assert.equal(subject.closes, 0)
  context.mock.timers.tick(1)
  await rejection
  assert.equal(subject.closes, 1)
})

test('completed sends cancel their deadline and transport close errors do not hide a successful acceptance', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const subject = fixture()
  await subject.delivery.send(enquiry)
  context.mock.timers.tick(45_000)
  assert.equal(subject.closes, 1)
  const closeFailure = new SmtpWebsiteEnquiryEmailDelivery(environment, () => ({
    async sendMail() { return { accepted: ['support-inbox@example.com'], rejected: [] } },
    close() { throw new Error('Simulated close failure') },
  }))
  await closeFailure.send(enquiry)
})
