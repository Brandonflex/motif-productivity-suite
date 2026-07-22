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
  toggleTaskStatus: (id: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'progress'>) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  updateProjectStatus: (id: string, status: Project['status']) => void;
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

  const updateProjectProgress = (id: string, progress: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
  };

  const updateProjectStatus = (id: string, status: Project['status']) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  return (
    <WorkspaceContext.Provider value={{
      tasks,
      addTask,
      toggleTaskStatus,
      projects,
      addProject,
      updateProjectProgress,
      updateProjectStatus
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