export type ClientType = "Individual" | "Company" | "Government" | "NonProfit";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  industry?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
