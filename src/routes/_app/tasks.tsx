import { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { formatTaskDueDate, useWorkspace, Task } from '@/context/WorkspaceContext';

export function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskStatus } = useWorkspace();
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Pending' | 'Completed'>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    project: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    dueDate: ''
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormData({ title: '', project: '', priority: 'Medium', dueDate: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      project: task.project,
      priority: task.priority,
      dueDate: task.dueDate
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, {
        title: formData.title,
        project: formData.project || 'General',
        priority: formData.priority,
        dueDate: formData.dueDate
      });
    } else {
      // Create new task
      addTask({
        title: formData.title,
        project: formData.project || 'General',
        priority: formData.priority,
        status: 'Pending',
        dueDate: formData.dueDate
      });
    }

    setIsModalOpen(false);
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="p-8 max-w-6xl space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage action items across your workspace.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          + New Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(['All', 'In Progress', 'Pending', 'Completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              filter === tab ? 'bg-gray-200 font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task List Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Due Date</th>
              <th className="py-3 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50/50 transition group">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    onChange={() => toggleTaskStatus(task.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className={`py-3 px-4 font-medium ${task.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </td>
                <td className="py-3 px-4 text-gray-500">{task.project}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-200' :
                    task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                    'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {task.priority}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium text-gray-600">{task.status}</span>
                </td>
                <td className="py-3 px-4 text-right text-gray-500 font-mono text-xs">{formatTaskDueDate(task.dueDate)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Edit Task"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                  No tasks found in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Task Modal (Create / Edit) ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Task Title</label>
                <input
                  id="task-title"
                  type="text"
                  required
                  placeholder="e.g. Write documentation..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="task-project" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Link</label>
                <input
                  id="task-project"
                  type="text"
                  placeholder="e.g. Engineering"
                  value={formData.project}
                  onChange={(e) => setFormData({...formData, project: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-priority" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                  <select
                    id="task-priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="task-due-date" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Due Date</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}