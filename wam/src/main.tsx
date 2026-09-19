import ReactDOM from 'react-dom/client'
import { WamProvider } from '@channel.io/app-sdk-wam'

import App from './App.tsx'
import { installDevPreview } from './devPreview'
import '@channel.io/bezier-react/styles.css'
import './index.css'

if (import.meta.env.DEV) {
  installDevPreview()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WamProvider>
    <App />
  </WamProvider>
)
