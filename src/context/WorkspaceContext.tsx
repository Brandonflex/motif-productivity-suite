import { createContext, useContext, useState, useEffect, ReactNode, JSX } from 'react';

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'Completed' | 'Pending';
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Paused' | 'Completed';
  progress: number;
}

interface WorkspaceContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, task: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'progress'>) => void;
  updateProject: (id: string, project: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (id: string) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  updateProjectStatus: (id: string, status: Project['status']) => void;
  exportData: () => void;
  resetWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY_TASKS = 'motif_tasks_v1';
const STORAGE_KEY_PROJECTS = 'motif_projects_v1';

const initialTasks: Task[] = [
  { id: '1', title: 'Finalize Q3 roadmap presentation', project: 'Strategy', priority: 'High', status: 'In Progress', dueDate: 'Jul 24' },
  { id: '2', title: 'Review design system tokens', project: 'Design System', priority: 'Medium', status: 'Pending', dueDate: 'Jul 26' },
];

const initialProjects: Project[] = [
  { id: 'p1', name: 'Brand Refresh 2026', description: 'Overhaul of visual identity.', status: 'Active', progress: 65 },
  { id: 'p2', name: 'API v2 Migration', description: 'Upgrading backend services.', status: 'Planning', progress: 10 },
];

export function WorkspaceProvider({ children }: { children: ReactNode }): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TASKS);
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return saved ? JSON.parse(saved) : initialProjects;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  }, [projects]);

  const addTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substring(7),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const updateTask = (id: string, taskData: Partial<Omit<Task, 'id'>>) => {
    setTasks(prev =>
      prev.map(task => (task.id === id ? { ...task, ...taskData } : task))
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, status: task.status === 'Completed' ? 'In Progress' : 'Completed' }
          : task
      )
    );
  };

  const addProject = (projectData: Omit<Project, 'id' | 'progress'>) => {
    const newProject: Project = {
      ...projectData,
      id: Math.random().toString(36).substring(7),
      progress: 0,
    };
    setProjects(prev => [newProject, ...prev]);
  };

  const updateProject = (id: string, projectData: Partial<Omit<Project, 'id'>>) => {
    setProjects(prev =>
      prev.map(project => (project.id === id ? { ...project, ...projectData } : project))
    );
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
  };

  const updateProjectProgress = (id: string, progress: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
  };

  const updateProjectStatus = (id: string, status: Project['status']) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const exportData = () => {
    const data = { tasks, projects, version: '1.0', exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `motif-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetWorkspace = () => {
    if (window.confirm('Are you sure you want to reset your workspace? All custom tasks and projects will be replaced with default demo data.')) {
      setTasks(initialTasks);
      setProjects(initialProjects);
      localStorage.removeItem(STORAGE_KEY_TASKS);
      localStorage.removeItem(STORAGE_KEY_PROJECTS);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,
      projects,
      addProject,
      updateProject,
      deleteProject,
      updateProjectProgress,
      updateProjectStatus,
      exportData,
      resetWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
}