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

  return (
    <WamThemeProvider>
      <HeightSynchronizer maxHeight={600}>
        {/* The title is typed `string`, so the mark cannot sit to the left of
            it here. The panel renders that line itself; this keeps only the
            close button. */}
        <WamHeader
          title=""
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
