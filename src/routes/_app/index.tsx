import { formatTaskDueDate, useWorkspace } from '@/context/WorkspaceContext';
import { FolderKanban, CheckSquare, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { tasks, projects } = useWorkspace();

  // Calculate live stats based on global context data
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Get the most recent tasks for the preview list
  const recentTasks = tasks.slice(0, 4);

  return (
    <div className="p-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Here is what is happening in your workspace today.</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FolderKanban /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900">{activeProjects} <span className="text-sm font-normal text-gray-400">/ {projects.length}</span></p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckSquare /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tasks Completed</p>
            <p className="text-2xl font-bold text-gray-900">{completedTasks} <span className="text-sm font-normal text-gray-400">/ {totalTasks}</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Activity /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{taskCompletionRate}%</p>
          </div>
        </div>
      </div>

      {/* Recent Tasks Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" /> Recent Tasks
          </h2>
          <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
            View all &rarr;
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentTasks.map(task => (
            <div key={task.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
              <div>
                <p className={`font-medium text-sm ${task.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">{task.project} • {formatTaskDueDate(task.dueDate)}</p>
              </div>
              <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                task.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {task.status}
              </span>
            </div>
          ))}
          {recentTasks.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No tasks found. Create one to get started!</div>
          )}
        </div>
      </div>
    </div>
  );
}