import { useState, useEffect, Fragment } from "react";
import { reportsApi, ReportWithDetails, ReportStatus } from "../services/reportsApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import { useRealtimeReport, useRealtimeRole } from "../hooks/useRealtimeReport";
import "./SalesPage.css";

function SalesPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [sheetData, setSheetData] = useState<SheetRowData[]>([]);
  const [sheetDataLoading, setSheetDataLoading] = useState<boolean>(false);
  const formatStaffRoles = (roles?: string | null) => {
    if (!roles) return "-";
    return roles
      .split(",")
      .map((role) => {
        const [label, detail] = role.split(":");
        return detail ? `${label}:${detail}` : label;
      })
      .join(" / ");
  };

  // フィルタ
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [status, setStatus] = useState<ReportStatus | "">("");

  // コメント
  const [salesComment, setSalesComment] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");
  
  // 写真関連
  const [photos, setPhotos] = useState<Array<{ id: number; file_name: string; file_size?: number; created_at?: string }>>([]);

  useEffect(() => {
    if (dateFrom) {
      loadSheetData();
    }
  }, [dateFrom]);

  // スプレッドシートから日付でデータを取得（開始日付を基準）
  const loadSheetData = async () => {
    setSheetDataLoading(true);
    try {
      const response = await sheetsApi.getSheetDataByDate(dateFrom);
      if (response.success) {
        setSheetData(response.data);
      }
    } catch (error) {
      console.warn("Error loading sheet data:", error);
      setSheetData([]);
    } finally {
      setSheetDataLoading(false);
    }
  };

  const sheetLocations = Array.from(
    new Set(
      sheetData
        .map((row) => row.location)
        .filter((l): l is string => !!l)
    )
  );

  const reportsLocations = Array.from(
    new Set(
      reports
        .map((report) => report.location)
        .filter((l): l is string => !!l)
    )
  );

  const availableLocations = (
    sheetData.length > 0
      ? sheetLocations
      : !sheetDataLoading
      ? reportsLocations
      : []
  ).sort((a, b) => a.localeCompare(b, "ja"));

  const isLocationListLoading =
    sheetDataLoading && sheetData.length === 0;

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      setSalesComment(selectedReport.sales_comment || "");
      setReturnReason("");
      loadPhotos();
    }
  }, [selectedReport]);

  // 写真一覧を読み込む
  const loadPhotos = async () => {
    if (!selectedReport?.id) return;
    try {
      const response = await reportsApi.getPhotos(selectedReport.id);
      if (response.success) {
        setPhotos(response.data || []);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  // 写真ダウンロード
  const handlePhotoDownload = async (photoId: number, fileName: string) => {
    if (!selectedReport?.id) return;
    try {
      const blob = await reportsApi.downloadPhoto(selectedReport.id, photoId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "ダウンロードに失敗しました",
      });
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getReports({
        role: "sales",
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        site_name: siteName || undefined,
        location: location || undefined,
        status: status || undefined,
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

  // リアルタイム更新: 営業ロール向けの更新を監視
  useRealtimeRole("sales", () => {
    loadReports();
  });

  // リアルタイム更新: 選択中の報告書が更新されたら再取得
  useRealtimeReport(
    selectedReport?.id,
    async () => {
      if (selectedReport?.id) {
        const response = await reportsApi.getReport(selectedReport.id);
        if (response.success) {
          setSelectedReport(response.data);
        }
      }
    },
    async (status) => {
      // ステータス変更時も再取得
      if (selectedReport?.id) {
        const response = await reportsApi.getReport(selectedReport.id);
        if (response.success) {
          setSelectedReport(response.data);
        }
        loadReports();
      }
    }
  );

  const handleSubmitToAccounting = async () => {
    if (!selectedReport?.id) return;

    setLoading(true);
    setMessage(null);

    try {
      // コメントを更新
      await reportsApi.updateReport(selectedReport.id, {
        sales_comment: salesComment,
        updated_by: "sales",
      });

      // ステータス更新
      await reportsApi.updateStatus(
        selectedReport.id,
        "submitted_to_accounting",
        undefined,
        "sales"
      );

      setMessage({ type: "success", text: "経理へ提出しました" });
      loadReports();
      setSelectedReport(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "提出に失敗しました",
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
        "returned_by_sales",
        returnReason,
        "sales"
      );

      setMessage({ type: "success", text: "差戻ししました" });
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
    <div className="sales-page">
      <div className="container">
        <h1>現場報告書 - 営業チェック</h1>

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
          <div className="form-group">
            <label>場所</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLocationListLoading}
            >
              {isLocationListLoading ? (
                <option value="">場所を読み込み中...</option>
              ) : (
                <>
                  <option value="">すべての場所</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div className="form-group">
            <label>ステータス</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="">すべて</option>
              <option value="chief_submitted_to_sales">チーフ提出済み</option>
              <option value="returned_by_sales">差戻し済み</option>
              <option value="submitted_to_accounting">経理提出済み</option>
            </select>
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
                      <span className={`status-badge status-${report.status}`}>
                        {report.status}
                      </span>
                    </div>
                    <div className="meta">
                      {report.report_date} - {report.location || "場所未設定"}
                    </div>
                    {report.chief_name && (
                      <div className="meta">チーフ: {report.chief_name}</div>
                    )}
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
                <div className="info-row">
                  <label>ステータス:</label>
                  <span className={`status-badge status-${selectedReport.status}`}>
                    {selectedReport.status}
                  </span>
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

              {selectedReport.staff_entries &&
                selectedReport.staff_entries.length > 0 && (
                  <div className="staff-entries">
                    <h3>スタッフ報告</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>スタッフ名</th>
                          <th>役割</th>
                          <th>運転</th>
                          <th>洗濯</th>
                          <th>仕切</th>
                          <th>倉庫</th>
                          <th>宿泊</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.staff_entries.map((entry) => (
                          <Fragment key={entry.id || entry.staff_name}>
                            <tr>
                              <td>{entry.staff_name}</td>
                              <td>{formatStaffRoles(selectedReport.staff_roles)}</td>
                              <td>{entry.is_driving ? "✓" : "-"}</td>
                              <td>{entry.is_laundry ? "✓" : "-"}</td>
                              <td>{entry.is_partition ? "✓" : "-"}</td>
                              <td>{entry.is_warehouse ? "✓" : "-"}</td>
                              <td>{entry.is_accommodation ? "✓" : "-"}</td>
                            </tr>
                            <tr>
                              <td colSpan={7}>
                                <div className="staff-report-content">
                                  {entry.report_content || "-"}
                                </div>
                              </td>
                            </tr>
                          </Fragment>
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

              {photos.length > 0 && (
                <div className="form-group">
                  <label>添付写真 ({photos.length}枚)</label>
                  <div style={{ marginTop: "10px" }}>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {photos.map((photo) => (
                        <li
                          key={photo.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 0",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          <span>{photo.file_name}</span>
                          <button
                            onClick={() => handlePhotoDownload(photo.id, photo.file_name)}
                            className="btn btn-primary"
                            style={{ padding: "4px 12px", fontSize: "14px" }}
                          >
                            ダウンロード
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>営業コメント</label>
                <textarea
                  value={salesComment}
                  onChange={(e) => setSalesComment(e.target.value)}
                  rows={4}
                  placeholder="営業としてのコメントを記入してください"
                />
              </div>

              <div className="form-group">
                <label>差戻し理由（差戻しする場合）</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  placeholder="差戻しする場合は理由を記入してください"
                />
              </div>

              <div className="button-group">
                <button
                  onClick={handleSubmitToAccounting}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  経理へ提出
                </button>
                <button
                  onClick={handleReturn}
                  disabled={loading || !returnReason}
                  className="btn btn-warning"
                >
                  差戻し
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

export default SalesPage;

