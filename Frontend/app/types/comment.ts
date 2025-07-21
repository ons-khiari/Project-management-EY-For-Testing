export interface Comment {
  id: string;
  assignee: string;
  createdAt: string;
  updatedAt?: string;
  description: string;
  taskId: string;
}
