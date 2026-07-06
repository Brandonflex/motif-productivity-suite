import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/**
 * TanStack Start entry — the framework imports this `createRouter` factory.
 * `routeTree.gen.ts` is generated automatically by the TanStack Start Vite
 * plugin from the files under `src/routes/` (do not edit it by hand).
 */
export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

// TanStack Start's hydration entry imports `getRouter` from this module
// (production `vite build` fails with "getRouter is not exported" without it).
export const getRouter = createRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
