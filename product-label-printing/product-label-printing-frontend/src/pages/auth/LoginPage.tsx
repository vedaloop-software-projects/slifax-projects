import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, Button, Checkbox, Form, Input, Tag } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { auth } from '../../api'
import { AuthShell } from './AuthShell'

const DEMO = [
  { role: 'OWNER', email: 'owner@vijayadurga.in', password: 'owner@123', color: 'gold' },
  { role: 'ADMIN', email: 'admin@vijayadurga.in', password: 'admin@123', color: 'green' },
  { role: 'STAFF', email: 'ravi@vijayadurga.in', password: 'staff@123', color: 'cyan' },
  { role: 'VIEWER', email: 'audit@vijayadurga.in', password: 'viewer@123', color: 'default' },
]

interface Values {
  email: string
  password: string
  remember: boolean
}

export function LoginPage() {
  const [form] = Form.useForm<Values>()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const resetDone = (location.state as { reset?: boolean } | null)?.reset

  const submit = async (v: Values) => {
    setError(null)
    setLoading(true)
    try {
      await auth.login(v.email, v.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 mb-7 text-muted">Sign in to manage products, labels and printers.</p>

      {resetDone && !error && <Alert type="success" showIcon className="mb-5" title="Password updated. Sign in with your new password." />}
      {error && <Alert type="error" showIcon className="mb-5" title={error} />}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ remember: true }} size="large">
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Enter a valid email' }]}>
          <Input prefix={<MailOutlined className="text-muted" />} placeholder="you@company.com" autoComplete="email" autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label={
            <div className="flex w-full items-center justify-between">
              <span>Password</span>
            </div>
          }
          rules={[{ required: true, message: 'Enter your password' }]}
          className="mb-3"
        >
          <Input.Password prefix={<LockOutlined className="text-muted" />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>
        <div className="mb-6 flex items-center justify-between">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Keep me signed in</Checkbox>
          </Form.Item>
          <Link to="/forgot-password" className="text-[14px] font-medium">
            Forgot password?
          </Link>
        </div>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Sign in
        </Button>
      </Form>

      <div className="mt-9 rounded-xl border border-dashed border-line bg-canvas/60 p-4">
        <div className="mb-2.5 text-[12px] font-semibold tracking-wide text-muted uppercase">Demo accounts · click to fill</div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={() => {
                form.setFieldsValue({ email: d.email, password: d.password })
                setError(null)
              }}
              className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-left transition-all duration-200 hover:-translate-y-px hover:border-brand/40 hover:shadow-sm"
            >
              <Tag color={d.color} variant="filled" className="m-0! text-[10px]!">{d.role}</Tag>
              <div className="mt-1 truncate text-[12px] text-muted">{d.email}</div>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
