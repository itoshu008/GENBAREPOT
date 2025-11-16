export interface SheetSettings {
  id?: number;
  year: number;
  month: number;
  sheet_url: string;
  sheet_id?: string | null;
  sheet_name?: string | null;
  range_a1?: string | null;
  last_imported_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface SiteMaster {
  id?: number;
  year: number;
  month: number;
  site_code: string;
  site_name: string;
  created_at?: Date;
  updated_at?: Date;
}

