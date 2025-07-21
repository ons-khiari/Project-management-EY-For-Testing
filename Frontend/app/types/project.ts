import { DeliverablePhase } from './deliverable-phase';

export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  progressColor: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  projectManager: string;
  members: string[];
  clientId: string;

  deliverablePhases?: DeliverablePhase[];
}