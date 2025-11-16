import { useState, useEffect } from "react";
import { sheetsApi, Sheet } from "../services/sheetsApi";
import { mastersApi } from "../services/mastersApi";
import { getSocket } from "../services/socket";
import "./MasterPage.css";

interface SheetFormData {
  url: string;
  target_year: number;
  target_month: number;
  date_column: string;
  site_name_column: string;
  location_column: string;
  staff_column: string;
  start_row: number;
}

function MasterPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  
  // 新規シート登録フォーム（複数追加可能）
  const [newSheetForms, setNewSheetForms] = useState<SheetFormData[]>([
    {
      url: "",
      target_year: new Date().getFullYear(),
      target_month: new Date().getMonth() + 1,
      date_column: "A",
      site_name_column: "B",
      location_column: "C",
      staff_column: "D",
      start_row: 2,
    },
  ]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("sheet:synced", () => {
      loadSheets();
      loadSites();
    });

    return () => {
      socket.off("sheet:synced");
    };
  }, []);

  useEffect(() => {
    loadSheets();
    loadSites();
  }, [year, month]);

  const loadSheets = async () => {
    try {
      const response = await sheetsApi.getSheets({
        target_year: year,
        target_month: month,
      });
      if (response.success) {
        setSheets(response.data);
      }
    } catch (error) {
      console.error("Error loading sheets:", error);
    }
  };

  const loadSites = async () => {
    try {
      const response = await mastersApi.getSites({ year, month });
      if (response.success) {
        setSites(response.data);
      }
    } catch (error) {
      console.error("Error loading sites:", error);
    }
  };

  const handleAddSheetForm = () => {
    setNewSheetForms([
      ...newSheetForms,
      {
        url: "",
        target_year: new Date().getFullYear(),
        target_month: new Date().getMonth() + 1,
        date_column: "A",
        site_name_column: "B",
        location_column: "C",
        staff_column: "D",
        start_row: 2,
      },
    ]);
  };

  const handleRemoveSheetForm = (index: number) => {
    if (newSheetForms.length > 1) {
      setNewSheetForms(newSheetForms.filter((_, i) => i !== index));
    }
  };

  const handleUpdateSheetForm = (index: number, field: keyof SheetFormData, value: any) => {
    const updated = [...newSheetForms];
    updated[index] = { ...updated[index], [field]: value };
    setNewSheetForms(updated);
  };

  const handleRegisterSheet = async (formData: SheetFormData, index: number) => {
    if (!formData.url) {
      setMessage({ type: "error", text: "URLを入力してください" });
      return;
    }

    if (!formData.date_column || !formData.site_name_column || !formData.staff_column) {
      setMessage({ type: "error", text: "日付、現場名、担当者の列を指定してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await sheetsApi.createSheet({
        url: formData.url,
        type: "sites",
        target_year: formData.target_year,
        target_month: formData.target_month,
        is_active: true,
        date_column: formData.date_column.toUpperCase(),
        site_name_column: formData.site_name_column.toUpperCase(),
        location_column: formData.location_column ? formData.location_column.toUpperCase() : null,
        staff_column: formData.staff_column.toUpperCase(),
        start_row: formData.start_row,
      });
      
      setMessage({ type: "success", text: "URLを登録しました" });
      
      // 登録したフォームをクリア
      const updated = [...newSheetForms];
      updated[index] = {
        url: "",
        target_year: new Date().getFullYear(),
        target_month: new Date().getMonth() + 1,
        date_column: "A",
        site_name_column: "B",
        location_column: "C",
        staff_column: "D",
        start_row: 2,
      };
      setNewSheetForms(updated);
      
      loadSheets();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "登録に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSheet = async (sheetId: number) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await sheetsApi.syncSheet(sheetId);
      setMessage({
        type: "success",
        text: `${response.data.count}件のデータを同期しました`,
      });
      loadSheets();
      loadSites();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "同期に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSheet = async (sheetId: number) => {
    if (!confirm("このスプレッドシートを削除しますか？")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await sheetsApi.deleteSheet(sheetId);
      setMessage({ type: "success", text: "削除しました" });
      loadSheets();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "削除に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="master-page">
      <div className="container">
        <h1>現場報告アプリ - マスター管理</h1>

        <div className="form-section">
          <h2>年月選択</h2>
          <div className="form-row">
            <div className="form-group">
              <label>年</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={loading}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>月</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={loading}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="sheets-section">
          <div className="section-header">
            <h2>スプレッドシート登録 ({year}年{month}月)</h2>
            <button
              onClick={handleAddSheetForm}
              className="btn btn-primary btn-add"
              disabled={loading}
            >
              ＋ 追加
            </button>
          </div>

          {newSheetForms.map((form, index) => (
            <div key={index} className="sheet-form-card">
              <div className="form-header">
                <h3>スプレッドシート {index + 1}</h3>
                {newSheetForms.length > 1 && (
                  <button
                    onClick={() => handleRemoveSheetForm(index)}
                    className="btn btn-small btn-danger"
                    disabled={loading}
                  >
                    削除
                  </button>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>スプレッドシートURL *</label>
                  <input
                    type="text"
                    value={form.url}
                    onChange={(e) => handleUpdateSheetForm(index, "url", e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>対象年 *</label>
                  <input
                    type="number"
                    value={form.target_year}
                    onChange={(e) => handleUpdateSheetForm(index, "target_year", Number(e.target.value))}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>対象月 *</label>
                  <input
                    type="number"
                    value={form.target_month}
                    onChange={(e) => handleUpdateSheetForm(index, "target_month", Number(e.target.value))}
                    min="1"
                    max="12"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>日付の列 *</label>
                  <input
                    type="text"
                    value={form.date_column}
                    onChange={(e) => handleUpdateSheetForm(index, "date_column", e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>現場名の列 *</label>
                  <input
                    type="text"
                    value={form.site_name_column}
                    onChange={(e) => handleUpdateSheetForm(index, "site_name_column", e.target.value.toUpperCase())}
                    placeholder="B"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>場所の列</label>
                  <input
                    type="text"
                    value={form.location_column}
                    onChange={(e) => handleUpdateSheetForm(index, "location_column", e.target.value.toUpperCase())}
                    placeholder="C"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>担当者の列 *</label>
                  <input
                    type="text"
                    value={form.staff_column}
                    onChange={(e) => handleUpdateSheetForm(index, "staff_column", e.target.value.toUpperCase())}
                    placeholder="D"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>開始行 *</label>
                  <input
                    type="number"
                    value={form.start_row}
                    onChange={(e) => handleUpdateSheetForm(index, "start_row", Number(e.target.value))}
                    min="1"
                    disabled={loading}
                  />
                </div>

                <div className="form-group full-width">
                  <button
                    onClick={() => handleRegisterSheet(form, index)}
                    disabled={loading || !form.url}
                    className="btn btn-primary"
                  >
                    登録
                  </button>
                </div>
              </div>
            </div>
          ))}

          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="sheets-list-section">
          <h2>登録済みスプレッドシート一覧 ({year}年{month}月)</h2>
          {sheets.length === 0 ? (
            <p className="empty-message">登録されていません</p>
          ) : (
            <table className="sheets-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>座標設定</th>
                  <th>最終同期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={sheet.id}>
                    <td className="url-cell">{sheet.url}</td>
                    <td>
                      {sheet.date_column && sheet.site_name_column && sheet.staff_column ? (
                        <div className="coordinates-info">
                          <span>日付: {sheet.date_column}</span>
                          <span>現場名: {sheet.site_name_column}</span>
                          {sheet.location_column && <span>場所: {sheet.location_column}</span>}
                          <span>担当者: {sheet.staff_column}</span>
                          <span>開始行: {sheet.start_row || 2}</span>
                        </div>
                      ) : (
                        <span className="text-muted">座標未設定</span>
                      )}
                    </td>
                    <td>
                      {sheet.last_synced_at
                        ? new Date(sheet.last_synced_at).toLocaleString("ja-JP")
                        : "未同期"}
                    </td>
                    <td>
                      <div className="button-group-inline">
                        <button
                          onClick={() => handleSyncSheet(sheet.id!)}
                          disabled={loading}
                          className="btn btn-small btn-secondary"
                        >
                          同期
                        </button>
                        <button
                          onClick={() => handleDeleteSheet(sheet.id!)}
                          disabled={loading}
                          className="btn btn-small btn-danger"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="sites-section">
          <h2>サイトマスタ一覧 ({year}年{month}月)</h2>
          {sites.length === 0 ? (
            <p className="empty-message">データがありません</p>
          ) : (
            <table className="sites-table">
              <thead>
                <tr>
                  <th>サイトコード</th>
                  <th>サイト名</th>
                  <th>場所</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.site_code}</td>
                    <td>{site.site_name}</td>
                    <td>{site.location || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default MasterPage;
