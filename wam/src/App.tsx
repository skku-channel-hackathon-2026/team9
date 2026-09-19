import {
  HeightSynchronizer,
  WamHeader,
  WamThemeProvider,
} from '@channel.io/app-sdk-wam-ui'
import { useWamClose } from '@channel.io/app-sdk-wam'

import { isMobile } from './utils/userAgent'
import Checklist from './pages/Checklist'

function App() {
  const { close } = useWamClose()
  // The product has a name now, and it is the same name in both languages.
  const title = 'UniCue'

  return (
    <WamThemeProvider>
      <HeightSynchronizer maxHeight={600}>
        <WamHeader
          title={title}
          onClose={close}
        />
        <div style={{ padding: isMobile() ? '0 16px 16px' : '0 24px 24px' }}>
          <Checklist />
        </div>
      </HeightSynchronizer>
    </WamThemeProvider>
  )
}

export default App
