import axios from "axios";

// 本番環境では相対パスを使用（HTTPS対応）
// 開発環境では環境変数またはデフォルトのlocalhostを使用
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 本番環境判定: HTTPSまたはlocalhost以外のホスト名
  const isProduction = window.location.protocol === 'https:' || 
                       (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  
  if (isProduction) {
    // 本番環境では/genbareport経由でアクセス（HTTPS対応）
    return '/genbareport'; // /genbareport/api/... として呼び出される
  }
  // 開発環境ではlocalhost
  return "http://localhost:4100";
};

// デバッグ用（本番環境では削除可能）
if (import.meta.env.DEV) {
  console.log('API Base URL:', getApiUrl());
}

const api = axios.create({
  baseURL: getApiUrl(),
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

