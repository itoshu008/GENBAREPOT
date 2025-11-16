// スプレッドシート管理関連の型定義

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

