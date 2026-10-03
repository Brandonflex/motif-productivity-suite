import { type ReactNode } from 'react'
import { PageHeader } from '@blinkdotnew/ui'

/**
 * Page header that stays put while the view scrolls.
 *
 * Every route renders its title through this component so the chrome behaves
 * identically everywhere: pinned to the top of the scroll container on desktop
 * (`md:top-0`) and below the 56px mobile header (`top-14`) on small screens.
 * The translucent background keeps content legible as it slides underneath.
 */
export function PageHeaderBar({ children }: { children: ReactNode }) {
  return (
    <PageHeader
      /*
       * `flex-wrap` earns its place on a phone: a long title and two or three
       * actions cannot share 360px, and a squeezed title is worse than a
       * second row. Gutters track the viewport for the same reason.
       */
      className="sticky top-14 z-20 flex-wrap gap-x-4 gap-y-2 border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4 md:top-0"
    >
      {children}
    </PageHeader>
  )
}
