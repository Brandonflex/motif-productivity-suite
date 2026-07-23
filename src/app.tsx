import React from 'react'
import { Shell } from '@/components/Shell'
import { AppSidebarShell } from '@/components/AppSidebarShell'

export function App() {
  return (
    <Shell appName="Motif Productivity Suite" sidebar={<AppSidebarShell />}>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1917] mb-2">Dashboard</h1>
        <p className="text-sm text-[#1C1917]/60 mb-6">Here is what is happening in your workspace today.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#E5E0D8] bg-white">
            <h3 className="text-xs font-semibold text-[#1C1917]/50 uppercase tracking-wider">Active Projects</h3>
            <p className="text-2xl font-bold mt-1 text-[#1C1917]">1 / 2</p>
          </div>
          <div className="p-4 rounded-lg border border-[#E5E0D8] bg-white">
            <h3 className="text-xs font-semibold text-[#1C1917]/50 uppercase tracking-wider">Tasks Completed</h3>
            <p className="text-2xl font-bold mt-1 text-[#1C1917]">1 / 1</p>
          </div>
          <div className="p-4 rounded-lg border border-[#E5E0D8] bg-white">
            <h3 className="text-xs font-semibold text-[#1C1917]/50 uppercase tracking-wider">Completion Rate</h3>
            <p className="text-2xl font-bold mt-1 text-[#1C1917]">100%</p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export default App