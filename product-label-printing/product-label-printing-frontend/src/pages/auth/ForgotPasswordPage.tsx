import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Form, Input, Steps } from 'antd'
import { ArrowLeftOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { auth } from '../../api'
import { AuthShell } from './AuthShell'

type Step = 0 | 1 | 2

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    setLoading(true)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted! hover:text-brand!">
        <ArrowLeftOutlined /> Back to sign in
      </Link>
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 mb-6 text-muted">
        {step === 0 && 'Enter your account email and we’ll send you a 6-digit code.'}
        {step === 1 && (
          <>
            We sent a code to <b className="text-ink">{email}</b>. It expires in 10 minutes.
          </>
        )}
        {step === 2 && 'Choose a new password for your account.'}
      </p>

      <Steps size="small" current={step} className="mb-7" items={[{ title: 'Email' }, { title: 'Verify' }, { title: 'New password' }]} />

      {error && <Alert type="error" showIcon className="mb-5" title={error} />}

      {step === 0 && (
        <Form
          layout="vertical"
          requiredMark={false}
          size="large"
          initialValues={{ email }}
          onFinish={(v: { email: string }) =>
            run(async () => {
              const c = await auth.requestPasswordReset(v.email)
              setEmail(v.email.trim().toLowerCase())
              setDemoCode(c)
              setStep(1)
            })
          }
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<MailOutlined className="text-muted" />} placeholder="you@company.com" autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Send reset code
          </Button>
        </Form>
      )}

      {step === 1 && (
        <Form
          layout="vertical"
          requiredMark={false}
          size="large"
          onFinish={(v: { code: string }) =>
            run(async () => {
              await auth.verifyResetCode(email, v.code)
              setCode(v.code)
              setStep(2)
            })
          }
        >
          {demoCode && (
            <Alert
              type="info"
              showIcon
              className="mb-5"
              title="Demo mode — no email service is connected"
              description={
                <>
                  If <b>{email}</b> has an account, its code is <b className="font-mono tracking-widest">{demoCode}</b>.
                </>
              }
            />
          )}
          <Form.Item name="code" label="Verification code" rules={[{ required: true, len: 6, message: 'Enter the 6-digit code' }]}>
            <Input.OTP length={6} autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Verify code
          </Button>
          <div className="mt-4 text-center text-[14px] text-muted">
            Didn’t get it?{' '}
            <Button
              type="link"
              className="p-0!"
              onClick={() =>
                run(async () => {
                  setDemoCode(await auth.requestPasswordReset(email))
                })
              }
            >
              Resend code
            </Button>
          </div>
        </Form>
      )}

      {step === 2 && (
        <Form
          layout="vertical"
          requiredMark={false}
          size="large"
          onFinish={(v: { password: string }) =>
            run(async () => {
              await auth.resetPassword(email, code, v.password)
              navigate('/login', { replace: true, state: { reset: true } })
            })
          }
        >
          <Form.Item
            name="password"
            label="New password"
            hasFeedback
            rules={[
              { required: true, message: 'Enter a new password' },
              { min: 8, message: 'At least 8 characters' },
              { pattern: /(?=.*\d)(?=.*[A-Za-z])/, message: 'Use letters and numbers' },
            ]}
          >
            <Input.Password prefix={<LockOutlined className="text-muted" />} autoFocus autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Confirm your password' },
              ({ getFieldValue }) => ({
                validator: (_, value) => (!value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))),
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined className="text-muted" />} autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Update password
          </Button>
        </Form>
      )}
    </AuthShell>
  )
}
