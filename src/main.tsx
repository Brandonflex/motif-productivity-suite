import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { App } from './app'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { applyTheme } from '@/lib/theme'
import './index.css'

// Apply the stored colour theme before the first paint.
applyTheme()

const container = document.getElementById('root')
if (!container) {
  throw new Error('Motif could not start: #root element is missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'hsl(var(--success))', secondary: 'hsl(var(--card))' } },
          error: { iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'hsl(var(--card))' } },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
)
