import { useState } from 'react';
import { X, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { useWorkspace, Project } from '@/context/WorkspaceContext';

export function ProjectsPage() {
  const { projects, addProject, updateProject, deleteProject, updateProjectProgress, updateProjectStatus } = useWorkspace();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Planning' as Project['status']
  });

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', status: 'Planning' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProject) {
      updateProject(editingProject.id, {
        name: formData.name,
        description: formData.description || 'No description provided.',
        status: formData.status,
      });
    } else {
      addProject({
        name: formData.name,
        description: formData.description || 'No description provided.',
        status: formData.status,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-6xl space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your active initiatives and track their progress.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          + New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={project.status}
                    onChange={(e) => updateProjectStatus(project.id, e.target.value as Project['status'])}
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
              </div>
              
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10">
                {project.description}
              </p>
            </div>

            {/* Interactive Progress Bar & Footer Actions */}
            <div>
              <div className="space-y-2 mb-4">
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
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={project.progress}
                  onChange={(e) => updateProjectProgress(project.id, parseInt(e.target.value))}
                  className="w-full h-2 cursor-ew-resize opacity-0 absolute inset-x-0"
                  title="Drag to update progress"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 font-mono">ID: {project.id}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEdit(project)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                    title="Edit Project"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                    title="Delete Project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-500">
          No projects found. Create one to get started!
        </div>
      )}

      {/* ── Project Modal (Create / Edit) ───────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
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
                <label htmlFor="project-name" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  required
                  placeholder="e.g. Q4 Marketing Campaign"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  id="project-description"
                  placeholder="Briefly describe the goals of this project..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label htmlFor="project-status" className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                <select
                  id="project-status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
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
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}