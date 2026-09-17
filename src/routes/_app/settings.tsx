import { useWorkspace } from '@/context/WorkspaceContext';
import { Download, RotateCcw, Database, ShieldCheck } from 'lucide-react';

export function SettingsPage() {
  const { tasks, projects, exportData, resetWorkspace } = useWorkspace();

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your workspace preferences, data backups, and local storage.</p>
      </div>

      {/* Storage & Backup Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Data Management</h2>
        </div>
        
        <div className="p-6 space-y-6 divide-y divide-gray-100">
          {/* Export Data */}
          <div className="flex items-center justify-between pt-1 first:pt-0">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Export Workspace Backup</h3>
              <p className="text-xs text-gray-500 mt-0.5">Download a JSON file containing all your current tasks and projects.</p>
            </div>
            <button
              onClick={exportData}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"
            >
              <Download className="h-4 w-4 text-gray-500" /> Export JSON
            </button>
          </div>

          {/* Reset Workspace */}
          <div className="flex items-center justify-between pt-6">
            <div>
              <h3 className="text-sm font-semibold text-red-600">Reset Workspace Data</h3>
              <p className="text-xs text-gray-500 mt-0.5">Clear your saved changes and restore the default sample workspace content.</p>
            </div>
            <button
              onClick={resetWorkspace}
              className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4 text-red-500" /> Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Status Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold text-gray-900">Workspace Statistics</h2>
        </div>
        
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-500">Stored Tasks</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{tasks.length}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-500">Stored Projects</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{projects.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}