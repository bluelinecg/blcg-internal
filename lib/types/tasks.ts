export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
