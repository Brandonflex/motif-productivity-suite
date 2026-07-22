import { useState } from 'react';
import { X, FolderKanban, MoreVertical } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Paused' | 'Completed';
  progress: number;
}

const initialProjects: Project[] = [
  { id: 'p1', name: 'Brand Refresh 2026', description: 'Overhaul of visual identity and marketing assets.', status: 'Active', progress: 65 },
  { id: 'p2', name: 'API v2 Migration', description: 'Upgrading backend services to the new GraphQL schema.', status: 'Planning', progress: 10 },
  { id: 'p3', name: 'User Onboarding Flow', description: 'Redesign the first-time user experience and tooltips.', status: 'Active', progress: 40 },
  { id: 'p4', name: 'Q3 Financial Audit', description: 'Internal review of Q3 expenditures and budget allocation.', status: 'Paused', progress: 80 },
];

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'Planning' as const
  });

  const handleUpdateProgress = (id: string, newProgress: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress: newProgress } : p));
  };

  const handleUpdateStatus = (id: string, newStatus: Project['status']) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    const projectEntry: Project = {
      id: Math.random().toString(36).substring(7),
      name: newProject.name,
      description: newProject.description || 'No description provided.',
      status: newProject.status,
      progress: 0, // Brand new projects start at 0%
    };

    setProjects([projectEntry, ...projects]);
    setIsModalOpen(false);
    setNewProject({ name: '', description: '', status: 'Planning' });
  };

  return (
    <div className="p-8 max-w-6xl space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your active initiatives and track their progress.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          + New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                </div>
              </div>
              <select
                value={project.status}
                onChange={(e) => handleUpdateStatus(project.id, e.target.value as Project['status'])}
                className={`text-xs font-medium px-2 py-1 rounded-md border-0 bg-gray-50 hover:bg-gray-100 cursor-pointer focus:ring-0 ${
                  project.status === 'Active' ? 'text-green-600' :
                  project.status === 'Planning' ? 'text-blue-600' :
                  project.status === 'Completed' ? 'text-gray-500' : 'text-amber-600'
                }`}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10">
              {project.description}
            </p>

            {/* Interactive Progress Bar */}
            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                    project.progress === 100 ? 'bg-green-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              {/* Invisible range slider layered over the progress bar for interactivity */}
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={project.progress}
                onChange={(e) => handleUpdateProgress(project.id, parseInt(e.target.value))}
                className="w-full h-2 absolute bottom-5 opacity-0 cursor-ew-resize"
                title="Drag to update progress"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── New Project Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Marketing Campaign"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Briefly describe the goals of this project..."
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Initial Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({...newProject, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                </select>
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}