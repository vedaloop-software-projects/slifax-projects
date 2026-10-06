import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { auth } from '../../api'
import { homePath } from '../../lib/permissions'
import { LoginShell } from './LoginShell'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE = /^[6-9]\d{9}$/

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
  const from = (location.state as { from?: string } | null)?.from
  const resetDone = (location.state as { reset?: boolean } | null)?.reset

  const submit = async (v: Values) => {
    setError(null)
    setLoading(true)
    try {
      const user = await auth.login(v.email, v.password)
      navigate(from && from !== '/' ? from : homePath(user.role), { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <LoginShell>
      <div className="mb-3 text-[12px] font-semibold tracking-[0.12em] text-brand uppercase">Sign in to ZenxPOS</div>
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 mb-7 text-[14px] leading-6 text-muted">Enter your account details to access your workspace.</p>

      {resetDone && !error && <Alert type="success" showIcon className="mb-5" title="Password updated. Sign in with your new password." />}
      {error && <Alert type="error" showIcon className="mb-5" title={error} />}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ remember: true }} size="large">
        <Form.Item
          name="email"
          label="Email or mobile"
          rules={[
            { required: true, message: 'Enter your email or mobile number' },
            { validator: (_, v: string) => (!v || EMAIL.test(v.trim()) || MOBILE.test(v.trim()) ? Promise.resolve() : Promise.reject(new Error('Enter a valid email or 10-digit mobile'))) },
          ]}
        >
          <Input prefix={<UserOutlined className="text-muted" />} placeholder="you@company.com or 98xxxxxxxx" autoComplete="username" autoFocus />
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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

    </LoginShell>
  )
}
