import Cookies from "js-cookie";

const BASE_URL = "http://localhost:5185/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Reusable request function
async function request<T>(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  try {
    const token = Cookies.get("token");

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Check if the response has a body
    const data = response.status !== 204 ? await response.json() : {}; // Avoid JSON parsing on empty responses

    if (!response.ok) {
      return { success: false, message: data.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

// Deliverable-related API functions

export const updateDeliverableStatus = async (
  id: string,
  newStatus: string
) => {
  try {
    return await request(`/Deliverable/${id}/status`, "PUT", newStatus);
  } catch (error) {
    console.error("Error updating deliverable status:", error);
    return { success: false, message: "Failed to update deliverable status" };
  }
};

export const getDeliverables = async () => {
  try {
    return await request("/Deliverable", "GET");
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return { success: false, message: "Failed to fetch deliverables" };
  }
};

export const getDeliverableById = async (id: string) => {
  try {
    return await request(`/Deliverable/${id}`, "GET");
  } catch (error) {
    console.error("Error fetching deliverable:", error);
    return { success: false, message: "Failed to fetch deliverable" };
  }
};

export const createDeliverable = async (deliverableData: any) => {
  try {
    return await request("/Deliverable", "POST", deliverableData);
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return { success: false, message: "Failed to create deliverable" };
  }
};

export const updateDeliverable = async (id: string, deliverableData: any) => {
  try {
    return await request(`/Deliverable/${id}`, "PUT", deliverableData);
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return { success: false, message: "Failed to update deliverable" };
  }
};

export const deleteDeliverable = async (id: string) => {
  try {
    return await request(`/Deliverable/${id}`, "DELETE");
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return { success: false, message: "Failed to delete deliverable" };
  }
};

export const getDeliverablesByUserId = async (userId: string) => {
  try {
    return await request(`/Deliverable/by-user/${userId}`, "GET");
  } catch (error) {
    console.error("Error fetching deliverables by user ID:", error);
    return {
      success: false,
      message: "Failed to fetch deliverables for the user",
    };
  }
};

export const getDeliverablesManagedBy = async (userId: string) => {
  try {
    return await request(`/Deliverable/managed-by/${userId}`, "GET");
  } catch (error) {
    console.error("Error fetching deliverables managed by user:", error);
    return { success: false, message: "Failed to fetch managed deliverables" };
  }
};

export const getDeliverableTaskSummary = async (id: string) => {
  try {
    return await request(`/Deliverable/${id}/task-summary`, "GET");
  } catch (error) {
    console.error("Error fetching deliverable task summary:", error);
    return { success: false, message: "Failed to fetch task summary" };
  }
};

export const getTaskSummariesForDeliverables = async (
  deliverableIds: string[]
) => {
  try {
    return await request<
      Record<string, { DoneTasks: number; AllTasks: number }>
    >("/Deliverable/task-summaries", "POST", deliverableIds);
  } catch (error) {
    console.error("Error fetching task summaries:", error);
    return { success: false, message: "Failed to fetch task summaries" };
  }
};

export const deliverableApi = {
  getDeliverables,
  getDeliverableById,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  updateDeliverableStatus,
  getDeliverablesByUserId,
  getDeliverablesManagedBy,
  getDeliverableTaskSummary,
  getTaskSummariesForDeliverables,
};
