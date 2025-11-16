import { useState, useEffect } from "react";
import { masterApi, SiteMaster } from "../services/api";
import { sheetsApi, Sheet, SheetType } from "../services/sheetsApi";
import { getSocket } from "../services/socket";
import "./MasterPage.css";

function MasterPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [rangeA1, setRangeA1] = useState<string>("A2:G500");
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  
  // 新しいスプレッドシート管理用の状態
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [newSheetUrl, setNewSheetUrl] = useState<string>("");
  const [newSheetType, setNewSheetType] = useState<SheetType>("sites");
  const [newSheetYear, setNewSheetYear] = useState<number>(new Date().getFullYear());
  const [newSheetMonth, setNewSheetMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    // Socket.IOでリアルタイム更新を受信
    const socket = getSocket();

    socket.on("master:siteImported", (data: { year: number; month: number }) => {
      if (data.year === year && data.month === month) {
        loadSites();
        setMessage({ type: "success", text: "サイトマスタが更新されました" });
      }
    });

    return () => {
      socket.off("master:siteImported");
    };
  }, [year, month]);

  useEffect(() => {
    loadSites();
    loadSheets();
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

  const handleRegisterSheet = async () => {
    if (!newSheetUrl) {
      setMessage({ type: "error", text: "URLを入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await sheetsApi.createSheet({
        url: newSheetUrl,
        type: newSheetType,
        target_year: newSheetYear,
        target_month: newSheetMonth,
        is_active: true,
      });
      setMessage({ type: "success", text: "URLを登録しました" });
      setNewSheetUrl("");
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

  const loadSites = async () => {
    try {
      const response = await masterApi.getSites(year, month);
      if (response.success) {
        setSites(response.data);
      }
    } catch (error) {
      console.error("Error loading sites:", error);
    }
  };

  const handleSaveUrl = async () => {
    if (!sheetUrl) {
      setMessage({ type: "error", text: "GoogleスプレッドシートURLを入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await masterApi.saveSheetSettings({
        year,
        month,
        sheet_url: sheetUrl,
        sheet_name: sheetName || undefined,
        range_a1: rangeA1 || undefined,
      });
      setMessage({ type: "success", text: "URLを保存しました" });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "保存に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await masterApi.importSites(year, month);
      setMessage({
        type: "success",
        text: `${response.count}件のサイトをインポートしました`,
      });
      await loadSites();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "インポートに失敗しました",
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
        <h1>現場報告アプリ - 管理画面</h1>

        <div className="form-section">
          <h2>シート設定</h2>

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

          <div className="form-group">
            <label>GoogleスプレッドシートURL</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>シート名（任意）</label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="指定なしなら最初のシートを使用"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>範囲（任意）</label>
            <input
              type="text"
              value={rangeA1}
              onChange={(e) => setRangeA1(e.target.value)}
              placeholder="A2:G500"
              disabled={loading}
            />
          </div>

          <div className="button-group">
            <button
              onClick={handleSaveUrl}
              disabled={loading}
              className="btn btn-primary"
            >
              URLを保存
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn btn-secondary"
            >
              取り込む
            </button>
          </div>

          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="sheets-section">
          <h2>スプレッドシートURL管理 ({year}年{month}月)</h2>
          
          <div className="form-section">
            <h3>新規URL登録</h3>
            <div className="form-row">
              <div className="form-group">
                <label>URL</label>
                <input
                  type="text"
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>種別</label>
                <select
                  value={newSheetType}
                  onChange={(e) => setNewSheetType(e.target.value as SheetType)}
                  disabled={loading}
                >
                  <option value="sites">現場マスタ</option>
                  <option value="staffs">スタッフマスタ</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="form-group">
                <label>対象年</label>
                <input
                  type="number"
                  value={newSheetYear}
                  onChange={(e) => setNewSheetYear(Number(e.target.value))}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>対象月</label>
                <input
                  type="number"
                  value={newSheetMonth}
                  onChange={(e) => setNewSheetMonth(Number(e.target.value))}
                  min="1"
                  max="12"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleRegisterSheet}
                disabled={loading}
                className="btn btn-primary"
              >
                登録
              </button>
            </div>
          </div>

          <div className="sheets-list">
            <h3>登録済みURL一覧</h3>
            {sheets.length === 0 ? (
              <p className="empty-message">登録されていません</p>
            ) : (
              <table className="sheets-table">
                <thead>
                  <tr>
                    <th>種別</th>
                    <th>URL</th>
                    <th>最終同期</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((sheet) => (
                    <tr key={sheet.id}>
                      <td>{sheet.type}</td>
                      <td className="url-cell">{sheet.url}</td>
                      <td>
                        {sheet.last_synced_at
                          ? new Date(sheet.last_synced_at).toLocaleString("ja-JP")
                          : "未同期"}
                      </td>
                      <td>{sheet.is_active ? "有効" : "無効"}</td>
                      <td>
                        <button
                          onClick={() => handleSyncSheet(sheet.id!)}
                          disabled={loading}
                          className="btn btn-small btn-secondary"
                        >
                          今すぐ同期
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
                    <td>{(site as any).location || "-"}</td>
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

