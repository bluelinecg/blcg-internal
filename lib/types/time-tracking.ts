export interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  hours: number;
  date: string;
  description: string;
  isBillable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntrySummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  byProject: Array<{ projectId: string; hours: number; billableHours: number }>;
}
