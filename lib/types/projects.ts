import type { Organization } from './crm';

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  dueDate?: string;
  completedDate?: string;
  order: number;
}

export interface Project {
  id: string;
  clientId?: string;
  organizationId: string;
  organization?: Organization;
  proposalId?: string;
  name: string;
  status: ProjectStatus;
  startDate: string;
  targetDate?: string;
  completedDate?: string;
  budget: number;
  milestones: Milestone[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
