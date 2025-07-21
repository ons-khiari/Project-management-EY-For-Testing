import Cookies from "js-cookie";

const BASE_URL = "http://localhost:5185/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
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

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

// TASK API METHODS

// Update the status of a task and trigger the recalculation of the deliverable status
export const updateTaskStatus = async (taskId: string, newStatus: string) => {
  try {
    const response = await request(`/Task/${taskId}/status`, "PUT", newStatus); // Sending just the string
    if (response.success) {
    } else {
      console.error("Failed to update task status:", response.message);
    }
    return response;
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, message: "Failed to update task status" };
  }
};

export const getTasks = async () => {
  try {
    const response = await request("/Task", "GET");
    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks",
      };
    }
    return response;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { success: false, message: "Failed to fetch tasks" };
  }
};

export const getTaskById = async (id: string) => {
  try {
    const response = await request(`/Task/${id}`, "GET");
    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch task",
      };
    }
    return response;
  } catch (error) {
    console.error("Error fetching task:", error);
    return { success: false, message: "Failed to fetch task" };
  }
};

export const createTask = async (taskData: any) => {
  try {
    const response = await request("/Task", "POST", taskData);
    return response;
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, message: "Failed to create task" };
  }
};

export const updateTask = async (id: string, taskData: any) => {
  try {
    const response = await request(`/Task/${id}`, "PUT", taskData);
    return response;
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, message: "Failed to update task" };
  }
};

export const deleteTask = async (id: string) => {
  try {
    const response = await request(`/Task/${id}`, "DELETE");

    if (!response || response.success) {
      return { success: true, message: "Task deleted successfully" };
    }

    return { success: false, message: response?.message || "Unknown error" };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
};

// Get task summary for a specific team member
export const getTaskSummaryForTeamMember = async (teamMemberId: string) => {
  try {
    const response = await request(
      `/Task/team-member/${teamMemberId}/summary`,
      "GET"
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch task summary",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching task summary:", error);
    return { success: false, message: "Failed to fetch task summary" };
  }
};

// Get tasks grouped by priority (High, Medium, Low) for a specific team member
export const getTasksByPriorityForTeamMember = async (teamMemberId: string) => {
  try {
    const response = await request(
      `/Task/team-member/${teamMemberId}/priority`,
      "GET"
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks by priority",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching tasks by priority:", error);
    return { success: false, message: "Failed to fetch tasks by priority" };
  }
};

export const getTasksByPriority = async () => {
  try {
    const response = await request("/Task/priority", "GET");

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks by priority",
      };
    }
    //response should give { High: Task[], Medium: Task[], Low: Task[] }
    return response;
  } catch (error) {
    console.error("Error fetching tasks by priority:", error);
    return { success: false, message: "Failed to fetch tasks by priority" };
  }
};

export const getTasksByProjectManagerGroupedByPriority = async (
  userId: string
) => {
  try {
    const response = await request(
      `/Task/project-manager/${userId}/tasks-by-priority`,
      "GET"
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks by priority",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching tasks by priority:", error);
    return { success: false, message: "Failed to fetch tasks by priority" };
  }
};

export const getTasksByAssignee = async (userId: string) => {
  try {
    const response = await request(`/Task/assignee/${userId}`, "GET");

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks by assignee",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching tasks by assignee:", error);
    return { success: false, message: "Failed to fetch tasks by assignee" };
  }
};

export const getTasksByProjectManager = async (userId: string) => {
  try {
    const response = await request(
      `/Task/project-manager/${userId}/all`,
      "GET"
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch tasks by project manager",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching tasks by project manager:", error);
    return {
      success: false,
      message: "Failed to fetch tasks by project manager",
    };
  }
};

export const taskApi = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTaskSummaryForTeamMember,
  getTasksByPriorityForTeamMember,
  getTasksByPriority,
  getTasksByProjectManagerGroupedByPriority,
  getTasksByAssignee,
  getTasksByProjectManager,
};
