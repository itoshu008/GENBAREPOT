import { useState, useEffect, Fragment } from "react";
import { reportsApi, ReportWithDetails } from "../services/reportsApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import { useRealtimeReport } from "../hooks/useRealtimeReport";
import "./ReportManagementPage.css";

function ReportManagementPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
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
  const [chiefName, setChiefName] = useState<string>("");

  // 編集用の状態
  const [editData, setEditData] = useState<Partial<ReportWithDetails>>({});

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
    if (selectedReport && !isEditing) {
      setEditData({
        site_name: selectedReport.site_name,
        location: selectedReport.location,
        chief_name: selectedReport.chief_name,
        staff_report_content: selectedReport.staff_report_content,
        chief_report_content: selectedReport.chief_report_content,
        sales_comment: selectedReport.sales_comment,
        accounting_comment: selectedReport.accounting_comment,
      });
    }
  }, [selectedReport, isEditing]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getReports({
        status: "completed",
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        site_name: siteName || undefined,
        location: location || undefined,
        chief_name: chiefName || undefined,
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
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    }
  };

  // リアルタイム更新: 選択中の報告書が更新されたら再取得（編集中でない場合のみ）
  useRealtimeReport(
    selectedReport?.id && !isEditing ? selectedReport.id : null,
    async () => {
      if (selectedReport?.id && !isEditing) {
        const response = await reportsApi.getReport(selectedReport.id);
        if (response.success) {
          setSelectedReport(response.data);
        }
      }
    }
  );

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (selectedReport) {
      setEditData({
        site_name: selectedReport.site_name,
        location: selectedReport.location,
        chief_name: selectedReport.chief_name,
        staff_report_content: selectedReport.staff_report_content,
        chief_report_content: selectedReport.chief_report_content,
        sales_comment: selectedReport.sales_comment,
        accounting_comment: selectedReport.accounting_comment,
      });
    }
  };

  const handleSave = async () => {
    if (!selectedReport?.id) return;

    setLoading(true);
    setMessage(null);

    try {
      await reportsApi.updateReport(selectedReport.id, {
        ...editData,
        updated_by: "admin",
      });

      setMessage({ type: "success", text: "更新しました" });
      setIsEditing(false);
      // 報告書を再取得
      const response = await reportsApi.getReport(selectedReport.id);
      if (response.success) {
        setSelectedReport(response.data);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "更新に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-management-page">
      <div className="container">
        <h1>報告書管理</h1>

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
            <label>チーフ名</label>
            <input
              type="text"
              value={chiefName}
              onChange={(e) => setChiefName(e.target.value)}
              placeholder="検索"
            />
          </div>
          <button onClick={loadReports} className="btn btn-primary">
            検索
          </button>
        </div>

        <div className="reports-grid">
          <div className="reports-list">
            <h2>完了済み報告書 ({reports.length}件)</h2>
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
              <div className="detail-header">
                <h2>報告書詳細</h2>
                {!isEditing ? (
                  <button onClick={handleEdit} className="btn btn-secondary">
                    修正
                  </button>
                ) : (
                  <div className="button-group">
                    <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
                      保存
                    </button>
                    <button onClick={handleCancel} className="btn btn-secondary">
                      キャンセル
                    </button>
                  </div>
                )}
              </div>

              <div className="report-info">
                <div className="info-row">
                  <label>日付:</label>
                  <span>{selectedReport.report_date}</span>
                </div>
                <div className="info-row">
                  <label>現場名:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.site_name || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, site_name: e.target.value })
                      }
                    />
                  ) : (
                    <span>{selectedReport.site_name} ({selectedReport.site_code})</span>
                  )}
                </div>
                <div className="info-row">
                  <label>場所:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.location || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, location: e.target.value })
                      }
                    />
                  ) : (
                    <span>{selectedReport.location || "-"}</span>
                  )}
                </div>
                <div className="info-row">
                  <label>チーフ:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.chief_name || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, chief_name: e.target.value })
                      }
                    />
                  ) : (
                    <span>{selectedReport.chief_name || "-"}</span>
                  )}
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

              <div className="form-group">
                <label>スタッフ報告内容</label>
                {isEditing ? (
                  <textarea
                    value={editData.staff_report_content || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, staff_report_content: e.target.value })
                    }
                    rows={4}
                  />
                ) : (
                  <p className="readonly-text">
                    {selectedReport.staff_report_content || "-"}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>チーフ報告内容</label>
                {isEditing ? (
                  <textarea
                    value={editData.chief_report_content || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, chief_report_content: e.target.value })
                    }
                    rows={4}
                  />
                ) : (
                  <p className="readonly-text">
                    {selectedReport.chief_report_content || "-"}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>営業コメント</label>
                {isEditing ? (
                  <textarea
                    value={editData.sales_comment || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, sales_comment: e.target.value })
                    }
                    rows={3}
                  />
                ) : (
                  <p className="readonly-text">{selectedReport.sales_comment || "-"}</p>
                )}
              </div>

              <div className="form-group">
                <label>経理コメント</label>
                {isEditing ? (
                  <textarea
                    value={editData.accounting_comment || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, accounting_comment: e.target.value })
                    }
                    rows={3}
                  />
                ) : (
                  <p className="readonly-text">
                    {selectedReport.accounting_comment || "-"}
                  </p>
                )}
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

export default ReportManagementPage;

