import api from "./api";

export interface Site {
  id?: number;
  year: number;
  month: number;
  site_code: string;
  site_name: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Staff {
  id?: number;
  year: number;
  month: number;
  staff_code?: string;
  staff_name: string;
  role?: "staff" | "chief" | "sales" | "accounting";
  created_at?: string;
  updated_at?: string;
}

export const mastersApi = {
  // 現場マスタ一覧取得
  getSites: async (params?: {
    year?: number;
    month?: number;
    site_code?: string;
    site_name?: string;
    location?: string;
  }) => {
    const response = await api.get("/api/masters/sites", { params });
    return response.data;
  },

  // スタッフマスタ一覧取得
  getStaffs: async (params?: {
    year?: number;
    month?: number;
    staff_name?: string;
    role?: string;
  }) => {
    const response = await api.get("/api/masters/staffs", { params });
    return response.data;
  },
};

