import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi, ReportWithDetails } from "../services/reportsApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import "./WatchmanPage.css";

const normalizeSiteName = (name?: string | null) => {
  return (name || "").replace(/[\s\u3000]/g, "").toLowerCase();
};

function WatchmanPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [salesAssignment, setSalesAssignment] = useState<string>("");
  const [salesAssignmentLoading, setSalesAssignmentLoading] = useState<boolean>(false);
  const [sheetData, setSheetData] = useState<SheetRowData[]>([]);

  const WATCHMAN_SITE_NAME = "留守番スタッフ";

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      loadSalesAssignment();
    }
  }, [reports]);

  const loadReports = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await reportsApi.getReports({
        role: "chief",
      });
      if (response.success) {
        // 現場名が「留守番スタッフ」の報告書のみをフィルタリング
        const watchmanReports = response.data.filter(
          (report) => normalizeSiteName(report.site_name) === normalizeSiteName(WATCHMAN_SITE_NAME)
        );
        // 日付順（新しい順）でソート
        watchmanReports.sort((a, b) => {
          const dateA = new Date(a.report_date).getTime();
          const dateB = new Date(b.report_date).getTime();
          return dateB - dateA;
        });
        setReports(watchmanReports);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "報告書の読み込みに失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSalesAssignment = async () => {
    if (reports.length === 0) {
      setSalesAssignment("");
      return;
    }

    setSalesAssignmentLoading(true);
    try {
      // 最新の報告書の日付を使用
      const latestReport = reports[0];
      if (!latestReport?.report_date) {
        setSalesAssignment("");
        return;
      }

      // 日付をYYYY-MM-DD形式に変換
      let reportDateStr = latestReport.report_date;
      if (reportDateStr.includes('T') || reportDateStr.includes('Z')) {
        const date = new Date(reportDateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        reportDateStr = `${year}-${month}-${day}`;
      } else if (reportDateStr.includes(' ')) {
        reportDateStr = reportDateStr.split(' ')[0];
      }

      // スプレッドシートからデータを取得
      const response = await sheetsApi.getSheetDataByDate(reportDateStr);
      if (response.success && Array.isArray(response.data)) {
        setSheetData(response.data);
        
        // 「留守番スタッフ」の現場名でマッチ
        const normalizedTarget = normalizeSiteName(WATCHMAN_SITE_NAME);
        const match = response.data.find(
          (row: SheetRowData) => normalizeSiteName(row.site_name) === normalizedTarget
        );

        if (match && match.staff_name) {
          setSalesAssignment(match.staff_name.trim());
        } else {
          setSalesAssignment("未登録");
        }
      } else {
        setSalesAssignment("未登録");
      }
    } catch (error) {
      console.error("Error loading sales assignment:", error);
      setSalesAssignment("未登録");
    } finally {
      setSalesAssignmentLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  };

  return (
    <div className="watchman-page">
      <div className="container">
        <div className="page-header">
          <button
            onClick={() => navigate("/select")}
            className="btn-back-small"
            type="button"
          >
            ← 戻る
          </button>
          <div className="header-content">
            <h1>留守番スタッフ</h1>
            <div className="sales-assignment">
              <span className="label">営業担当：</span>
              {salesAssignmentLoading ? (
                <span className="loading">読み込み中...</span>
              ) : (
                <span className="value">{salesAssignment || "未登録"}</span>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p>読み込み中...</p>
        ) : reports.length === 0 ? (
          <p className="empty-message">報告書がありません</p>
        ) : (
          <div className="reports-list">
            <h2>報告書一覧 ({reports.length}件)</h2>
            <ul>
              {reports.map((report) => (
                <li key={report.id} className="report-item">
                  <div className="report-header">
                    <strong>{formatDate(report.report_date)}</strong>
                    {report.location && (
                      <span className="location">場所: {report.location}</span>
                    )}
                  </div>
                  {report.chief_name && (
                    <div className="chief-name">チーフ・リーダー: {report.chief_name}</div>
                  )}
                  {report.staff_entries && report.staff_entries.length > 0 && (
                    <div className="staff-entries">
                      <strong>スタッフ報告:</strong>
                      <ul>
                        {report.staff_entries.map((entry, index) => (
                          <li key={index}>
                            {entry.staff_name} - {entry.staff_roles || "-"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.chief_report_content && (
                    <div className="chief-report">
                      <strong>チーフ報告:</strong>
                      <p>{report.chief_report_content}</p>
                    </div>
                  )}
                  <div className="report-status">
                    ステータス: {report.status === "staff_submitted" ? "チーフ確認待ち" : 
                                 report.status === "chief_submitted" ? "営業確認待ち" :
                                 report.status === "sales_confirmed" ? "営業確認済み" :
                                 report.status || "未確定"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchmanPage;

