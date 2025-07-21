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

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return { success: false, message: data?.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

// DeliverablePhase-related API functions

export const getDeliverablePhases = async () => {
  try {
    return await request("/DeliverablePhase", "GET");
  } catch (error) {
    console.error("Error fetching deliverable phases:", error);
    return { success: false, message: "Failed to fetch deliverable phases" };
  }
};

export const getDeliverablePhaseById = async (id: string) => {
  try {
    return await request(`/DeliverablePhase/${id}`, "GET");
  } catch (error) {
    console.error("Error fetching deliverable phase:", error);
    return { success: false, message: "Failed to fetch deliverable phase" };
  }
};

export const createDeliverablePhase = async (phaseData: any) => {
  try {
    return await request("/DeliverablePhase", "POST", phaseData);
  } catch (error) {
    console.error("Error creating deliverable phase:", error);
    return { success: false, message: "Failed to create deliverable phase" };
  }
};

export const updateDeliverablePhase = async (id: string, phaseData: any) => {
  try {
    return await request(`/DeliverablePhase/${id}`, "PUT", phaseData);
  } catch (error) {
    console.error("Error updating deliverable phase:", error);
    return { success: false, message: "Failed to update deliverable phase" };
  }
};

export const deleteDeliverablePhase = async (id: string) => {
  try {
    return await request(`/DeliverablePhase/${id}`, "DELETE");
  } catch (error) {
    console.error("Error deleting deliverable phase:", error);
    return { success: false, message: "Failed to delete deliverable phase" };
  }
};

export const getDeliverablePhaseStatsByProjectId = async (
  projectId: string
) => {
  try {
    return await request(`/DeliverablePhase/Stats/${projectId}`, "GET");
  } catch (error) {
    console.error("Error fetching deliverable phase stats:", error);
    return {
      success: false,
      message: "Failed to fetch deliverable phase stats",
    };
  }
};

export const getDeliverablePhasesByProjectId = async (projectId: string) => {
  try {
    return await request(`/DeliverablePhase/ByProject/${projectId}`, "GET");
  } catch (error) {
    console.error("Error fetching project deliverable phases:", error);
    return {
      success: false,
      message: "Failed to fetch deliverable phases",
    };
  }
};

export const deliverablePhaseApi = {
  getDeliverablePhases,
  getDeliverablePhaseById,
  createDeliverablePhase,
  updateDeliverablePhase,
  deleteDeliverablePhase,
  getDeliverablePhaseStatsByProjectId,
  getDeliverablePhasesByProjectId,
};
