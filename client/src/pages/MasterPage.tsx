import { useState, useEffect } from "react";
import { masterApi, SiteMaster } from "../services/api";
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
  }, [year, month]);

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
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.site_code}</td>
                    <td>{site.site_name}</td>
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

