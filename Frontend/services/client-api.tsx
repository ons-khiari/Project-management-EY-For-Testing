import Cookies from "js-cookie";
import { Client } from "@/app/types/client";
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

    // Check if the response status is 204 (No Content)
    if (response.status === 204) {
      return { success: true }; // Return success with no data (since it's a delete)
    }

    // Parse the response body if it's not empty
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

// Get all clients
export const getClients = async () => {
  try {
    return request<Client[]>("/Client", "GET");
  } catch (error) {
    console.error("Error fetching clients:", error);
    return { success: false, message: "Failed to fetch clients" };
  }
};

// Get single client by ID
export const getClientById = async (id: string) => {
  try {
    return request<Client>(`/Client/${id}`, "GET");
  } catch (error) {
    console.error("Error fetching client:", error);
    return { success: false, message: "Failed to fetch client" };
  }
};

// Create a client
export const createClient = async (
  client: Omit<Client, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const response = await request<Client>("/Client/create", "POST", client);
    return response;
  } catch (error) {
    console.error("Error creating client:", error);
    return { success: false, message: "Failed to create client" };
  }
};

// Update a client
export const updateClient = async (
  id: string,
  updatedClient: Partial<Client>
) => {
  try {
    const response = await request<Client>(
      `/Client/update/${id}`,
      "PUT",
      updatedClient
    );
    return response;
  } catch (error) {
    console.error("Error updating client:", error);
    return { success: false, message: "Failed to update client" };
  }
};

// Delete a client
export const deleteClient = async (id: string) => {
  try {
    return request(`/Client/delete/${id}`, "DELETE");
  } catch (error) {
    console.error("Error deleting client:", error);
    return { success: false, message: "Failed to delete client" };
  }
};

// Export everything as an object (optional)
export const clientApi = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
