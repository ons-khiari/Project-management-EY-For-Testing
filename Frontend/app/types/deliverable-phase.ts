import type { Deliverable } from "./deliverable";

export interface DeliverablePhase {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color: string;
  status?: "todo" | "in-progress" | "done";
  projectId?: string;

  deliverables?: Deliverable[];
}

// Get current date info
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth();