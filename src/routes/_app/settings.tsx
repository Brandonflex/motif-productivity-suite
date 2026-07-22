import { useState } from 'react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'General' | 'Profile' | 'Workspace'>('General');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and workspace preferences.</p>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        {(['General', 'Profile', 'Workspace'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Settings Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        {activeTab === 'General' && (
          <div className="space-y-6 divide-y divide-gray-100">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Desktop Notifications</h3>
                <p className="text-xs text-gray-500">Receive instant alerts for task updates and project changes.</p>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Dark Interface Mode</h3>
                <p className="text-xs text-gray-500">Enable high-contrast dark theme for low-light environments.</p>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'Profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Display Name</label>
              <input
                type="text"
                defaultValue="Brandon"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'Workspace' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Workspace Name</label>
              <input
                type="text"
                defaultValue="Motif Productivity Suite"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}