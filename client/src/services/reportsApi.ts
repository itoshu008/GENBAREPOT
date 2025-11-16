import api from "./api";

// 報告書関連の型定義
export type ReportStatus =
  | "staff_draft"
  | "staff_submitted"
  | "chief_submitted_to_sales"
  | "returned_by_sales"
  | "submitted_to_accounting"
  | "returned_by_accounting"
  | "completed";

export interface Report {
  id?: number;
  report_date: string;
  site_id: number;
  site_code: string;
  site_name: string;
  location?: string;
  chief_name?: string;
  status: ReportStatus;
  staff_name?: string;
  report_content?: string;
  staff_report_content?: string;
  chief_report_content?: string;
  sales_comment?: string;
  accounting_comment?: string;
  return_reason?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportTime {
  id?: number;
  report_id: number;
  meeting_time?: string;
  arrival_time?: string;
  finish_time?: string;
  departure_time?: string;
}

export interface ReportStaffEntry {
  id?: number;
  report_id: number;
  staff_name: string;
  report_content?: string;
  is_warehouse?: boolean;
  is_selection?: boolean;
  is_driving?: boolean;
}

export interface ReportWithDetails extends Report {
  times?: ReportTime;
  staff_entries?: ReportStaffEntry[];
}

export interface ReportFilter {
  role?: string;
  date_from?: string;
  date_to?: string;
  site_code?: string;
  site_name?: string;
  location?: string;
  chief_name?: string;
  status?: ReportStatus;
  staff_name?: string;
}

export const reportsApi = {
  // 報告書一覧取得
  getReports: async (filter: ReportFilter = {}) => {
    const response = await api.get("/api/reports", { params: filter });
    return response.data;
  },

  // 報告書詳細取得
  getReport: async (id: number) => {
    const response = await api.get(`/api/reports/${id}`);
    return response.data;
  },

  // 報告書作成
  createReport: async (data: Partial<Report>) => {
    const response = await api.post("/api/reports", data);
    return response.data;
  },

  // 報告書更新
  updateReport: async (id: number, data: Partial<Report>) => {
    const response = await api.put(`/api/reports/${id}`, data);
    return response.data;
  },

  // ステータス更新
  updateStatus: async (
    id: number,
    status: ReportStatus,
    return_reason?: string,
    updated_by?: string
  ) => {
    const response = await api.post(`/api/reports/${id}/status`, {
      status,
      return_reason,
      updated_by,
    });
    return response.data;
  },

  // 時間記録更新
  updateTimes: async (id: number, times: Partial<ReportTime>) => {
    const response = await api.put(`/api/reports/${id}/times`, times);
    return response.data;
  },

  // スタッフエントリ追加・更新
  updateStaffEntry: async (
    id: number,
    entry: Partial<ReportStaffEntry>
  ) => {
    const response = await api.post(`/api/reports/${id}/staff-entries`, entry);
    return response.data;
  },

  // スタッフエントリ削除
  deleteStaffEntry: async (id: number, entryId: number) => {
    const response = await api.delete(
      `/api/reports/${id}/staff-entries/${entryId}`
    );
    return response.data;
  },
};

