import {
  HeightSynchronizer,
  WamHeader,
  WamThemeProvider,
} from '@channel.io/app-sdk-wam-ui'
import { useEffect } from 'react'
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

  // The panel is pinned to the light theme rather than following Desk. It is
  // read as a document — dates, documents to bring, an office to go to — and a
  // light surface suits that inside a window that is otherwise conversation.
  // index.html sets the page background from the host before React runs, so it
  // has to be corrected here, or a dark Desk leaves light text on a dark page.
  useEffect(() => {
    document.body.style.backgroundColor = '#FFFFFF'
  }, [])

  return (
    <WamThemeProvider theme="light">
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
