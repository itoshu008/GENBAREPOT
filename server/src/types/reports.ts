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
  report_date: string; // YYYY-MM-DD
  site_id: number;
  site_code: string;
  site_name: string;
  location?: string;
  chief_name?: string;
  status: ReportStatus;
  staff_name?: string;
  staff_roles?: string;
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
  meeting_time?: string; // HH:MM:SS
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

export interface ReportComment {
  id?: number;
  report_id: number;
  comment_type: "comment" | "return_reason" | "status_change";
  comment_text: string;
  created_by: string;
  created_at?: string;
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
}

