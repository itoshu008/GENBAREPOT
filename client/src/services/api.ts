import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4100";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface SheetSettings {
  id?: number;
  year: number;
  month: number;
  sheet_url: string;
  sheet_name?: string;
  range_a1?: string;
}

export interface SiteMaster {
  id: number;
  year: number;
  month: number;
  site_code: string;
  site_name: string;
}

export const masterApi = {
  // シート設定を保存
  saveSheetSettings: async (data: SheetSettings) => {
    const response = await api.post("/api/master/sheet-settings/save", data);
    return response.data;
  },

  // サイトマスタをインポート
  importSites: async (year: number, month: number) => {
    const response = await api.post("/api/master/sites/import", { year, month });
    return response.data;
  },

  // シート設定を取得
  getSheetSettings: async (year?: number, month?: number) => {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await api.get("/api/master/sheet-settings", { params });
    return response.data;
  },

  // サイトマスタ一覧を取得
  getSites: async (year: number, month: number) => {
    const response = await api.get("/api/master/sites", {
      params: { year, month },
    });
    return response.data;
  },
};

export default api;

