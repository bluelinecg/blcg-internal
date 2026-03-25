export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface ChecklistItem {
  id:        string;
  text:      string;
  completed: boolean;
}

export interface Task {
  id:          string;
  title:       string;
  description?: string;
  status:      TaskStatus;
  priority:    TaskPriority;
  sortOrder:   number;
  projectId?:  string;
  assignee?:   string;
  dueDate?:    string;
  recurrence:  TaskRecurrence;
  checklist:   ChecklistItem[];
  /** IDs of tasks that must be done before this task. Warning only — no hard block. */
  blockedBy:   string[];
  createdAt:   string;
  updatedAt:   string;
}
