import api from "./api";

export type SheetType = "sites" | "staffs" | "other";

export interface Sheet {
  id?: number;
  url: string;
  type: SheetType;
  target_year: number;
  target_month: number;
  is_active: boolean;
  date_column?: string | null; // 日付の列（例: "A"）
  site_name_column?: string | null; // 現場名の列（例: "B"）
  location_column?: string | null; // 場所の列（例: "C"）
  staff_column?: string | null; // 担当者の列（例: "D"）
  start_row?: number | null; // 開始行（例: 2）
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SheetRowData {
  date: string;
  site_name: string;
  location: string | null;
  staff_name: string;
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

  // 日付でスプレッドシートからデータを取得
  getSheetDataByDate: async (date: string): Promise<{ success: boolean; data: SheetRowData[] }> => {
    const response = await api.get("/api/sheets/by-date", { params: { date } });
    return response.data;
  },
};

