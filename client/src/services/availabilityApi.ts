import api from "./api";

export interface StaffAvailability {
  id: number;
  available_date: string;
  staff_name: string;
  role?: string | null;
  message?: string | null;
  created_at?: string;
}

export const availabilityApi = {
  submitAvailability: async (payload: {
    dates: string[];
    staff_name: string;
    role?: string;
    message?: string;
  }) => {
    const response = await api.post("/api/availability", payload);
    return response.data;
  },
  getAvailability: async (params?: { from?: string; to?: string }) => {
    const response = await api.get("/api/availability", { params });
    return response.data as { success: boolean; data: StaffAvailability[] };
  },
};


