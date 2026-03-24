// Type definitions for the Pipeline / Workflow Engine.
// A Pipeline has ordered Stages; Items move between stages via drag-and-drop.
// Stage history is recorded on every move for timestamp tracking.

import type { Contact, Organization } from './crm';
import type { Client } from './clients';

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  stages?: PipelineStage[];
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineItem {
  id: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value?: number;
  contactId?: string;
  clientId?: string;
  notes?: string;
  enteredStageAt: string;
  closedAt?: string;
  contact?: Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email'>;
  client?: Pick<Client, 'id' | 'name'>;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageHistory {
  id: string;
  itemId: string;
  fromStageId?: string;
  toStageId: string;
  movedAt: string;
}
