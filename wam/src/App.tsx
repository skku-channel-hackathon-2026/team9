import {
  HeightSynchronizer,
  WamHeader,
  WamThemeProvider,
} from '@channel.io/app-sdk-wam-ui'
import { useTypedWamData, useWamClose } from '@channel.io/app-sdk-wam'

import { isMobile } from './utils/userAgent'
import Checklist from './pages/Checklist'

function App() {
  const { close } = useWamClose()
  // The header renders before the panel resolves a profile, so it reads the
  // one value it needs directly.
  const isInternational = useTypedWamData('isInternational')
  const title =
    isInternational === false ? '신입생 체크리스트' : 'Freshman Checklist'

  return (
    <WamThemeProvider>
      <HeightSynchronizer maxHeight={640}>
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
