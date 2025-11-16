import { useState, useEffect } from "react";
import { reportsApi, ReportWithDetails } from "../services/reportsApi";
import "./AccountingPage.css";

function AccountingPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // フィルタ
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");

  // コメント
  const [accountingComment, setAccountingComment] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      setAccountingComment(selectedReport.accounting_comment || "");
      setReturnReason("");
    }
  }, [selectedReport]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getReports({
        role: "accounting",
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        site_name: siteName || undefined,
        status: "submitted_to_accounting",
      });
      if (response.success) {
        setReports(response.data);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSelect = async (reportId: number) => {
    try {
      const response = await reportsApi.getReport(reportId);
      if (response.success) {
        setSelectedReport(response.data);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    }
  };

  const handleComplete = async () => {
    if (!selectedReport?.id) return;

    setLoading(true);
    setMessage(null);

    try {
      // コメントを更新
      await reportsApi.updateReport(selectedReport.id, {
        accounting_comment: accountingComment,
        updated_by: "accounting",
      });

      // ステータス更新
      await reportsApi.updateStatus(
        selectedReport.id,
        "completed",
        undefined,
        "accounting"
      );

      setMessage({ type: "success", text: "完了しました" });
      loadReports();
      setSelectedReport(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "完了処理に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedReport?.id || !returnReason) {
      setMessage({ type: "error", text: "差戻し理由を入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 差戻し
      await reportsApi.updateStatus(
        selectedReport.id,
        "returned_by_accounting",
        returnReason,
        "accounting"
      );

      setMessage({ type: "success", text: "営業へ差戻ししました" });
      loadReports();
      setSelectedReport(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "差戻しに失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accounting-page">
      <div className="container">
        <h1>現場報告書 - 経理チェック</h1>

        <div className="filter-section">
          <div className="form-group">
            <label>日付（開始）</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>日付（終了）</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>現場名</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="検索"
            />
          </div>
          <button onClick={loadReports} className="btn btn-primary">
            検索
          </button>
        </div>

        <div className="reports-grid">
          <div className="reports-list">
            <h2>報告書一覧 ({reports.length}件)</h2>
            {loading ? (
              <p>読み込み中...</p>
            ) : reports.length === 0 ? (
              <p>報告書がありません</p>
            ) : (
              <ul>
                {reports.map((report) => (
                  <li
                    key={report.id}
                    onClick={() => handleReportSelect(report.id!)}
                    className={selectedReport?.id === report.id ? "active" : ""}
                  >
                    <div className="report-header">
                      <strong>{report.site_name}</strong>
                    </div>
                    <div className="meta">
                      {report.report_date} - {report.location || "場所未設定"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedReport && (
            <div className="report-detail">
              <h2>報告書詳細</h2>

              <div className="report-info">
                <div className="info-row">
                  <label>日付:</label>
                  <span>{selectedReport.report_date}</span>
                </div>
                <div className="info-row">
                  <label>現場名:</label>
                  <span>{selectedReport.site_name} ({selectedReport.site_code})</span>
                </div>
                <div className="info-row">
                  <label>場所:</label>
                  <span>{selectedReport.location || "-"}</span>
                </div>
                <div className="info-row">
                  <label>チーフ:</label>
                  <span>{selectedReport.chief_name || "-"}</span>
                </div>
              </div>

              {selectedReport.times && (
                <div className="times-info">
                  <h3>時間記録</h3>
                  <div className="time-grid">
                    <div>集合: {selectedReport.times.meeting_time || "-"}</div>
                    <div>到着: {selectedReport.times.arrival_time || "-"}</div>
                    <div>終了: {selectedReport.times.finish_time || "-"}</div>
                    <div>出発: {selectedReport.times.departure_time || "-"}</div>
                  </div>
                </div>
              )}

              {selectedReport.staff_entries && selectedReport.staff_entries.length > 0 && (
                <div className="staff-entries">
                  <h3>スタッフ報告</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>スタッフ名</th>
                        <th>報告内容</th>
                        <th>倉庫</th>
                        <th>選択</th>
                        <th>運転</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.staff_entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.staff_name}</td>
                          <td>{entry.report_content || "-"}</td>
                          <td>{entry.is_warehouse ? "✓" : "-"}</td>
                          <td>{entry.is_selection ? "✓" : "-"}</td>
                          <td>{entry.is_driving ? "✓" : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport.chief_report_content && (
                <div className="chief-report">
                  <h3>チーフ報告</h3>
                  <p>{selectedReport.chief_report_content}</p>
                </div>
              )}

              {selectedReport.sales_comment && (
                <div className="sales-comment">
                  <h3>営業コメント</h3>
                  <p>{selectedReport.sales_comment}</p>
                </div>
              )}

              <div className="form-group">
                <label>経理コメント</label>
                <textarea
                  value={accountingComment}
                  onChange={(e) => setAccountingComment(e.target.value)}
                  rows={4}
                  placeholder="経理としてのコメントを記入してください"
                />
              </div>

              <div className="form-group">
                <label>差戻し理由（営業へ差戻しする場合）</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  placeholder="営業へ差戻しする場合は理由を記入してください"
                />
              </div>

              <div className="button-group">
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn btn-success"
                >
                  完了
                </button>
                <button
                  onClick={handleReturn}
                  disabled={loading || !returnReason}
                  className="btn btn-warning"
                >
                  営業へ差戻し
                </button>
              </div>

              {message && (
                <div className={`message message-${message.type}`}>
                  {message.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountingPage;

