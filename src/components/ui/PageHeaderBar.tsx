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
    <PageHeader className="sticky top-14 z-20 border-border bg-background/95 backdrop-blur md:top-0">
      {children}
    </PageHeader>
  )
}
