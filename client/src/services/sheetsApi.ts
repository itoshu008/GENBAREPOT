import api from "./api";

export type SheetType = "sites" | "staffs" | "other";

export interface Sheet {
  id?: number;
  url: string;
  type: SheetType;
  target_year: number;
  target_month: number;
  is_active: boolean;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const sheetsApi = {
  // スプレッドシートURL一覧取得
  getSheets: async (params?: {
    type?: SheetType;
    year?: number;
    month?: number;
    target_year?: number;
    target_month?: number;
    is_active?: boolean;
  }) => {
    const response = await api.get("/api/sheets", { params });
    return response.data;
  },

  // スプレッドシートURL登録
  createSheet: async (data: Partial<Sheet>) => {
    const response = await api.post("/api/sheets", data);
    return response.data;
  },

  // スプレッドシートURL更新
  updateSheet: async (id: number, data: Partial<Sheet>) => {
    const response = await api.put(`/api/sheets/${id}`, data);
    return response.data;
  },

  // スプレッドシートURL削除
  deleteSheet: async (id: number) => {
    const response = await api.delete(`/api/sheets/${id}`);
    return response.data;
  },

  // CSV同期実行
  syncSheet: async (id: number) => {
    const response = await api.post(`/api/sheets/${id}/sync`);
    return response.data;
  },
};

