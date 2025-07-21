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

    let data: any = null;

    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      return { success: false, message: data?.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

export const askChatbot = async (message: string) => {
  try {
    const response = await request<{ response: string }>("/Chat/ask", "POST", {
      message,
    });

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to get chatbot response",
      };
    }

    return response;
  } catch (error) {
    console.error("Error calling chatbot:", error);
    return { success: false, message: "Network error" };
  }
};

export const chatApi = {
  askChatbot,
};
  