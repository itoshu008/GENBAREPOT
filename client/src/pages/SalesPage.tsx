import { useState, useEffect, Fragment, useMemo } from "react";
import { reportsApi, ReportWithDetails } from "../services/reportsApi";
import { sheetsApi } from "../services/sheetsApi";
import { useRealtimeReport, useRealtimeRole } from "../hooks/useRealtimeReport";
import BackButton from "../components/BackButton";
import "./SalesPage.css";

const normalizeName = (name?: string | null) =>
  (name || "").replace(/[\s\u3000]/g, "").toLowerCase();
const normalizeSiteName = (name?: string | null) =>
  (name || "").replace(/[\s\u3000]/g, "").toLowerCase();
const makeAssignmentKey = (jobId?: string | null, date?: string | null, site?: string | null) => {
  if (jobId) {
    return `job:${jobId}`;
  }
  return `site:${date || ""}|${normalizeSiteName(site)}`;
};
const makeDateAssignmentKey = (date?: string | null) => `date:${date || ""}`;

function SalesPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [staffOptions, setStaffOptions] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [showStaffPicker, setShowStaffPicker] = useState<boolean>(false);
  const [staffOptionsLoading, setStaffOptionsLoading] = useState<boolean>(false);
  const [staffOptionsError, setStaffOptionsError] = useState<string | null>(null);
  const [sheetAssignments, setSheetAssignments] = useState<Record<string, string>>({});
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

  // コメント
  const [salesComment, setSalesComment] = useState<string>("");
  const [returnReason, setReturnReason] = useState<string>("");
  
  // 写真関連
  const [photos, setPhotos] = useState<Array<{ id: number; file_name: string; file_size?: number; created_at?: string }>>([]);

  const deriveStaffOptions = (data: ReportWithDetails[]) => {
    const unique = new Map<string, string>();
    data.forEach((report) => {
      report.staff_entries?.forEach((entry) => {
        if (entry.staff_name) {
          const cleaned = entry.staff_name.trim();
          const normalized = normalizeName(cleaned);
          if (normalized && !unique.has(normalized)) {
            unique.set(normalized, cleaned);
          }
        }
      });
      if (report.created_by) {
        const cleaned = report.created_by.trim();
        const normalized = normalizeName(cleaned);
        if (normalized && !unique.has(normalized)) {
          unique.set(normalized, cleaned);
        }
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "ja"));
  };

  useEffect(() => {
    loadReports();
    loadStaffOptions([]);
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
      });
      if (response.success) {
        const data = response.data;
        setReports(data);
        await loadSheetAssignments(data);
        // スタッフオプションが空の場合は、報告書から取得
        if (staffOptions.length === 0) {
          await loadStaffOptions(data);
        }
      }
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffOptions = async (reportList: ReportWithDetails[] = []) => {
    setStaffOptionsLoading(true);
    setStaffOptionsError(null);
    try {
      const response = await sheetsApi.getStaffNames();
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const unique = new Map<string, string>();
        response.data.forEach((name) => {
          if (typeof name === "string") {
            const cleaned = name.trim();
            const normalized = normalizeName(cleaned);
            if (normalized && !unique.has(normalized)) {
              unique.set(normalized, cleaned);
            }
          }
        });
        setStaffOptions(Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "ja")));
      } else {
        const fallback = deriveStaffOptions(reportList);
        if (fallback.length > 0) {
          setStaffOptions(fallback);
        }
      }
    } catch (error) {
      console.error("Error loading staff names:", error);
      setStaffOptionsError("担当者リストを取得できませんでした");
      const fallback = deriveStaffOptions(reportList);
      if (fallback.length > 0) {
        setStaffOptions(fallback);
      }
    } finally {
      setStaffOptionsLoading(false);
    }
  };

  const loadSheetAssignments = async (reportList: ReportWithDetails[]) => {
    const uniqueDates = Array.from(
      new Set(
        reportList
          .map((report) => report.report_date)
          .filter((date): date is string => typeof date === "string" && date.length > 0)
      )
    );

    const assignmentMap: Record<string, string> = {};

    for (const date of uniqueDates) {
      try {
        const response = await sheetsApi.getSheetDataByDate(date);
        if (response.success && Array.isArray(response.data)) {
          response.data.forEach((row) => {
            if (row.date && row.staff_name) {
              const siteKey = makeAssignmentKey(row.job_id, row.date, row.site_name);
              const dateKey = makeDateAssignmentKey(row.date);
              if (siteKey) {
                assignmentMap[siteKey] = row.staff_name.trim();
              }
              if (!assignmentMap[dateKey]) {
                assignmentMap[dateKey] = row.staff_name.trim();
              }
            }
          });
        }
      } catch (error) {
        console.error(`Error loading sheet assignments for ${date}:`, error);
      }
    }

    setSheetAssignments(assignmentMap);
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

  const reportHasStaff = (report: ReportWithDetails, staff: string) => {
    const target = normalizeName(staff);
    if (!target) return false;
    return (
      (report.staff_entries &&
        report.staff_entries.some((entry) => normalizeName(entry.staff_name) === target)) ||
      normalizeName(report.created_by) === target ||
      normalizeName(
        sheetAssignments[makeAssignmentKey(report.job_id, report.report_date, report.site_name)]
      ) === target ||
      normalizeName(sheetAssignments[makeDateAssignmentKey(report.report_date)]) === target
    );
  };

  const filteredReports = useMemo(() => {
    if (!selectedStaff) return [];
    return reports.filter((report) => reportHasStaff(report, selectedStaff));
  }, [reports, selectedStaff, sheetAssignments]);

  useEffect(() => {
    if (selectedReport && selectedStaff && !reportHasStaff(selectedReport, selectedStaff)) {
      setSelectedReport(null);
    }
  }, [selectedStaff, selectedReport, sheetAssignments]);

  useEffect(() => {
    if (selectedStaff && staffOptions.length > 0 && !staffOptions.includes(selectedStaff)) {
      setSelectedStaff("");
    }
  }, [staffOptions, selectedStaff]);

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
        <BackButton />
        <h1>現場報告書 - 営業チェック</h1>

        <div className="staff-selector">
          <div className="staff-selector-header">
            <p>営業担当を選択してください</p>
            <button
              className="btn btn-secondary"
              onClick={() => setShowStaffPicker((prev) => !prev)}
              disabled={staffOptionsLoading || staffOptions.length === 0}
            >
              {staffOptionsLoading
                ? "読み込み中..."
                : `担当者リストを${showStaffPicker ? "閉じる" : "表示"}`}
            </button>
          </div>
          {selectedStaff && (
            <div className="selected-staff">
              選択中: <strong>{selectedStaff}</strong>
            </div>
          )}
          {staffOptionsError && <p className="error-text">{staffOptionsError}</p>}
          {showStaffPicker && (
            <>
              {staffOptionsLoading ? (
                <p>担当者情報を読み込み中...</p>
              ) : staffOptions.length === 0 ? (
                <p>担当者情報がありません</p>
              ) : (
                <div className="staff-chip-list">
                  {staffOptions.map((staff) => (
                    <button
                      key={staff}
                      className={`staff-chip ${selectedStaff === staff ? "active" : ""}`}
                      onClick={() => setSelectedStaff((prev) => (prev === staff ? "" : staff))}
                    >
                      {staff}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="reports-grid">
          <div className="reports-list">
            {selectedStaff ? (
              <>
                <h2>
                  {selectedStaff} の報告書 ({filteredReports.length}件)
                </h2>
                {loading ? (
                  <p>読み込み中...</p>
                ) : filteredReports.length === 0 ? (
                  <p>対象の報告書がありません</p>
                ) : (
                  <ul>
                    {filteredReports.map((report) => (
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
              </>
            ) : (
              <p>担当者を選択すると報告書が表示されます。</p>
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

