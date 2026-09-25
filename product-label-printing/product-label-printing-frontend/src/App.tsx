import { RouterProvider } from 'react-router/dom'
import { App as AntApp, ConfigProvider } from 'antd'
import enGB from 'antd/locale/en_GB'
import 'dayjs/locale/en-gb'
import { antdThemeConfig } from './theme'
import { router } from './router'

function App() {
  return (
    <ConfigProvider theme={antdThemeConfig} locale={enGB}>
      <AntApp message={{ maxCount: 1, top: 72 }}>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
