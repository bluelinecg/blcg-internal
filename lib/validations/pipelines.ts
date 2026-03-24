import { z } from 'zod';

export const PipelineSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive:    z.boolean().default(true),
});

export const UpdatePipelineSchema = PipelineSchema.partial();

export const PipelineStageSchema = z.object({
  pipelineId: z.string().uuid(),
  name:       z.string().min(1, 'Stage name is required'),
  color:      z.string().default('#6B7280'),
  sortOrder:  z.number().int().default(0),
  isWon:      z.boolean().default(false),
  isLost:     z.boolean().default(false),
});

export const UpdatePipelineStageSchema = PipelineStageSchema.omit({ pipelineId: true }).partial();

export const PipelineItemSchema = z.object({
  pipelineId: z.string().uuid(),
  stageId:    z.string().uuid(),
  title:      z.string().min(1, 'Title is required'),
  value:      z.number().nonnegative().optional(),
  contactId:  z.string().uuid().optional(),
  clientId:   z.string().uuid().optional(),
  notes:      z.string().optional(),
});

export const UpdatePipelineItemSchema = PipelineItemSchema.omit({ pipelineId: true }).partial();

export type PipelineInput       = z.infer<typeof PipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>;

export type PipelineStageInput       = z.infer<typeof PipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof UpdatePipelineStageSchema>;

export type PipelineItemInput       = z.infer<typeof PipelineItemSchema>;
export type UpdatePipelineItemInput = z.infer<typeof UpdatePipelineItemSchema>;
