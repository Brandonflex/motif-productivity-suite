interface Project {
    id: string;
    name: string;
    description: string;
    progress: number;
    members: number;
    tag: string;
    updated: string;
  }
  
  const projectsList: Project[] = [
    { id: '1', name: 'Motif Productivity Suite', description: 'Core application dashboard, workspace integrations, and local productivity modules.', progress: 75, members: 4, tag: 'Engineering', updated: '2h ago' },
    { id: '2', name: 'Design System & Tokens', description: 'Centralized UI token definitions, color palettes, and accessible primitive components.', progress: 90, members: 2, tag: 'Design', updated: 'Yesterday' },
    { id: '3', name: 'API Gateway Refactor', description: 'Migrating legacy backend REST endpoints to unified type-safe RPC services.', progress: 35, members: 3, tag: 'Backend', updated: '3 days ago' },
    { id: '4', name: 'Automated E2E Testing', description: 'Setting up Playwright integration test runners across all major core workflows.', progress: 50, members: 1, tag: 'QA', updated: '1 week ago' },
  ];
  
  export function ProjectsPage() {
    return (
      <div className="p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">Overview of active projects and workspace milestones.</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
            + New Project
          </button>
        </div>
  
        {/* Grid of Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectsList.map(project => (
            <div key={project.id} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                    {project.tag}
                  </span>
                  <span className="text-xs text-gray-400">Updated {project.updated}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mt-3">{project.name}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
              </div>
  
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }