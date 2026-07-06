import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'motif-productivi-app-yk9i9lx9',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_dYmf4u9fh1p18bFbVPddLJ5nZH2Gtroj',
  authRequired: false,
  auth: { mode: 'managed' },
})
