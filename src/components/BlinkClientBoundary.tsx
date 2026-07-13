import { useState, useEffect, ReactNode } from 'react'

interface BoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function BlinkClientBoundary({ children, fallback = null }: BoundaryProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}