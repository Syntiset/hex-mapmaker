import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import App from './App.tsx'
import { initTheme } from './store/themeStore.ts'
import { mantineTheme, mantineCssResolver } from './ui/mantineTheme.ts'

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssResolver} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="top-right" />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
)
