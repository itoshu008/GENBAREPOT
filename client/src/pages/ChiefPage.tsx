import { useState, useEffect, Fragment } from "react";
import {
  reportsApi,
  ReportWithDetails,
  ReportStaffEntry,
} from "../services/reportsApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import { useRealtimeReport } from "../hooks/useRealtimeReport";
import "./ChiefPage.css";

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

function ChiefPage() {
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [availableReports, setAvailableReports] = useState<ReportWithDetails[]>([]);
  const [reportsForLocation, setReportsForLocation] = useState<ReportWithDetails[]>([]);
  const [chiefName, setChiefName] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [sheetData, setSheetData] = useState<SheetRowData[]>([]);
  const [sheetDataLoading, setSheetDataLoading] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");

  // 時間記録の状態
  const [meetingTime, setMeetingTime] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [finishTime, setFinishTime] = useState<string>("");
  const [departureTime, setDepartureTime] = useState<string>("");
  const [chiefReportContent, setChiefReportContent] = useState<string>("");
  
  // 写真関連の状態
  const [photos, setPhotos] = useState<Array<{ id: number; file_name: string; file_size?: number; created_at?: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    loadSheetData();
    setSelectedLocation("");
    setSelectedSiteName("");
    setSelectedReport(null);
    setAvailableReports([]);
  }, [dateFilter]);

  useEffect(() => {
    // 場所が変更されたら現場名をリセット
    setSelectedSiteName("");
    setSelectedReport(null);
    setAvailableReports([]);
  }, [selectedLocation]);

  // 場所が選択され、フィルタリングされた現場が1つしかない場合は自動選択
  useEffect(() => {
    if (selectedLocation && !sheetDataLoading) {
      const filtered = (!sheetDataLoading && sheetData.length > 0)
        ? Array.from(
            new Map(
              sheetData
                .filter((row) => row.location === selectedLocation)
                .map((row) => [row.site_name, { site_name: row.site_name, location: row.location }])
            ).values()
          )
        : Array.from(
            new Map(
              reportsForLocation
                .filter((r) => r.location === selectedLocation)
                .map((r) => [r.site_name, { site_name: r.site_name, location: r.location || "" }])
            ).values()
          );
      
      // 現場名が1つしかない場合は自動選択
      if (filtered.length === 1 && !selectedSiteName) {
        setSelectedSiteName(filtered[0].site_name);
      }
    }
  }, [selectedLocation, sheetData, sheetDataLoading, reportsForLocation]);

  useEffect(() => {
    if (selectedSiteName && dateFilter) {
      loadReportBySite();
    } else {
      setSelectedReport(null);
      setAvailableReports([]);
    }
  }, [selectedSiteName, dateFilter]);

  // スプレッドシートから日付でデータを取得
  const loadSheetData = async () => {
    setSheetDataLoading(true);
    try {
      const response = await sheetsApi.getSheetDataByDate(dateFilter);
      if (response.success) {
        setSheetData(response.data);
      } else {
        setSheetData([]);
      }
    } catch (error) {
      console.warn("Error loading sheet data:", error);
      setSheetData([]);
    } finally {
      setSheetDataLoading(false);
    }
  };

  // 報告書から場所を取得（フォールバック用）
  useEffect(() => {
    const loadReportsForLocation = async () => {
      if (!dateFilter) return;
      try {
        const response = await reportsApi.getReports({
          role: "chief",
          date_from: dateFilter,
          date_to: dateFilter,
          status: "staff_submitted",
        });
        if (response.success) {
          setReportsForLocation(response.data);
        }
      } catch (error) {
        console.warn("Error loading reports for location:", error);
        setReportsForLocation([]);
      }
    };
    loadReportsForLocation();
  }, [dateFilter]);

  // 利用可能な場所のリストを取得（スプレッドシートから取得したデータを優先、なければ報告書から）
  const sheetLocations = Array.from(
    new Set(
      sheetData
        .map((row) => row.location)
        .filter((l): l is string => !!l)
    )
  );

  const reportsLocations = Array.from(
    new Set(
      reportsForLocation
        .map((r) => r.location)
        .filter((l): l is string => !!l)
    )
  );

  // スプレッドシートのデータが取得済みで、データがある場合はそれを使用
  // スプレッドシートのデータがまだ取得中、またはデータがない場合は報告書から取得
  const availableLocations = (!sheetDataLoading && sheetLocations.length > 0
    ? sheetLocations
    : reportsLocations)
    .sort((a, b) => a.localeCompare(b, "ja"));

  // 選択された場所でフィルタリングされた現場リスト（スプレッドシートから取得したデータを優先、なければ報告書から、重複を除去）
  const filteredSites = (!sheetDataLoading && sheetData.length > 0)
    ? Array.from(
        new Map(
          (selectedLocation
            ? sheetData.filter((row) => row.location === selectedLocation)
            : sheetData
          ).map((row) => [row.site_name, { site_name: row.site_name, location: row.location }])
        ).values()
      )
    : Array.from(
        new Map(
          (selectedLocation
            ? reportsForLocation.filter((r) => r.location === selectedLocation)
            : reportsForLocation
          ).map((r) => [r.site_name, { site_name: r.site_name, location: r.location || "" }])
        ).values()
      );

  useEffect(() => {
    if (selectedReport) {
      setMeetingTime(selectedReport.times?.meeting_time?.substring(0, 5) || "");
      setArrivalTime(selectedReport.times?.arrival_time?.substring(0, 5) || "");
      setFinishTime(selectedReport.times?.finish_time?.substring(0, 5) || "");
      setDepartureTime(selectedReport.times?.departure_time?.substring(0, 5) || "");
      setChiefReportContent(selectedReport.chief_report_content || "");
      loadPhotos();
    }
  }, [selectedReport]);

  useEffect(() => {
    setIsMenuOpen(false);
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

  const handleReportFetchError = async (error: any, reportId?: number) => {
    if (error?.response?.status === 404) {
      setMessage({
        type: "info",
        text: "この報告書は削除されました",
      });
      setSelectedReport(null);
      setPhotos([]);
      setIsMenuOpen(false);
      setAvailableReports((prev) =>
        prev.filter((report) => report.id !== reportId)
      );
    } else {
      console.error("Error loading report:", error);
    }
  };

  const fetchReportDetail = async (
    reportId: number
  ): Promise<ReportWithDetails | null> => {
    try {
      const response = await reportsApi.getReport(reportId);
      if (response.success) {
        setSelectedReport(response.data);
        return response.data;
      }
    } catch (error: any) {
      await handleReportFetchError(error, reportId);
    }
    return null;
  };

  // 現場名で報告書を取得
  const loadReportBySite = async () => {
    if (!selectedSiteName || !dateFilter) return;

    setLoading(true);
    try {
      const response = await reportsApi.getReports({
        role: "chief",
        date_from: dateFilter,
        date_to: dateFilter,
        site_name: selectedSiteName,
        status: "staff_submitted",
      });
        if (response.success && response.data.length > 0) {
          setAvailableReports(response.data);
          if (response.data.length === 1) {
            await fetchReportDetail(response.data[0].id!);
          } else {
            setSelectedReport(null);
          }
        } else {
        setAvailableReports([]);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error("Error loading report:", error);
      setAvailableReports([]);
      setSelectedReport(null);
    } finally {
      setLoading(false);
    }
  };

  // 報告書を選択
  const handleReportSelect = async (reportId: number) => {
    await fetchReportDetail(reportId);
  };

  // リアルタイム更新: 選択中の報告書が更新されたら再取得
  useRealtimeReport(
    selectedReport?.id,
    async () => {
      const reportId = selectedReport?.id;
      if (reportId) {
        const data = await fetchReportDetail(reportId);
        if (!data) {
          await loadReportBySite();
        }
      }
    },
    async (status) => {
      // ステータス変更時も再取得
      const reportId = selectedReport?.id;
      if (reportId) {
        const data = await fetchReportDetail(reportId);
        if (!data && selectedSiteName && dateFilter) {
          await loadReportBySite();
        }
        if (data && selectedSiteName && dateFilter) {
          await loadReportBySite();
        }
      }
    }
  );

  const handleUpdateTimes = async () => {
    if (!selectedReport?.id) return;

    setLoading(true);
    setMessage(null);

    try {
      await reportsApi.updateTimes(selectedReport.id, {
        meeting_time: meetingTime ? `${meetingTime}:00` : undefined,
        arrival_time: arrivalTime ? `${arrivalTime}:00` : undefined,
        finish_time: finishTime ? `${finishTime}:00` : undefined,
        departure_time: departureTime ? `${departureTime}:00` : undefined,
      });
      setMessage({ type: "success", text: "時間記録を更新しました" });
      // 報告書を再取得
      await fetchReportDetail(selectedReport.id);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "更新に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaffEntry = async (
    staffName: string,
    payload: {
      isWarehouse: boolean;
      isSelection: boolean;
      isDriving: boolean;
      isLaundry: boolean;
      isPartition: boolean;
      isAccommodation: boolean;
    }
  ) => {
    if (!selectedReport?.id) return;

    try {
      await reportsApi.updateStaffEntry(selectedReport.id, {
        staff_name: staffName,
        is_warehouse: payload.isWarehouse,
        is_selection: payload.isSelection,
        is_driving: payload.isDriving,
        is_laundry: payload.isLaundry,
        is_partition: payload.isPartition,
        is_accommodation: payload.isAccommodation,
      });
      // 報告書を再取得
      await fetchReportDetail(selectedReport.id);
    } catch (error: any) {
      await handleReportFetchError(error, selectedReport.id);
    }
  };

  const handleAllowanceToggle = (
    entry: ReportStaffEntry,
    field:
      | "is_driving"
      | "is_laundry"
      | "is_partition"
      | "is_warehouse"
      | "is_accommodation",
    value: boolean
  ) => {
    handleUpdateStaffEntry(entry.staff_name, {
      isWarehouse: field === "is_warehouse" ? value : !!entry.is_warehouse,
      isSelection: entry.is_selection || false,
      isDriving: field === "is_driving" ? value : !!entry.is_driving,
      isLaundry: field === "is_laundry" ? value : !!entry.is_laundry,
      isPartition: field === "is_partition" ? value : !!entry.is_partition,
      isAccommodation:
        field === "is_accommodation" ? value : !!entry.is_accommodation,
    });
  };

  const handleDeleteStaffEntry = async (entry: ReportStaffEntry) => {
    if (!selectedReport?.id || !entry.id) return;
    if (
      !window.confirm(
        `${entry.staff_name} さんの報告を削除しますか？`
      )
    )
      return;

    try {
      await reportsApi.deleteStaffEntry(selectedReport.id, entry.id);
      await fetchReportDetail(selectedReport.id);
      setMessage({ type: "success", text: "スタッフ報告を削除しました" });
    } catch (error: any) {
      await handleReportFetchError(error, selectedReport.id);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport?.id) return;
    if (
      !window.confirm(
        "この報告書を削除しますか？（スタッフ報告や写真もすべて削除されます）"
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await reportsApi.deleteReport(selectedReport.id);
      setMessage({ type: "success", text: "報告書を削除しました" });
      setSelectedReport(null);
      setAvailableReports((prev) =>
        prev.filter((report) => report.id !== selectedReport.id)
      );
      setIsMenuOpen(false);
      await loadReportBySite();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "削除に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  // 写真アップロード
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedReport?.id || !e.target.files) return;

    const files = Array.from(e.target.files);
    const remainingSlots = 10 - photos.length;
    
    if (files.length > remainingSlots) {
      setMessage({
        type: "error",
        text: `写真は最大10枚までです。残り${remainingSlots}枚までアップロード可能です。`,
      });
      return;
    }

    setUploadingPhotos(true);
    setMessage(null);

    try {
      const response = await reportsApi.uploadPhotos(
        selectedReport.id,
        files,
        chiefName || "chief"
      );
      if (response.success) {
        setMessage({ type: "success", text: response.message || "写真をアップロードしました" });
        await loadPhotos();
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "アップロードに失敗しました",
      });
    } finally {
      setUploadingPhotos(false);
      e.target.value = ""; // リセット
    }
  };

  // 写真削除
  const handlePhotoDelete = async (photoId: number) => {
    if (!selectedReport?.id) return;
    if (!window.confirm("この写真を削除しますか？")) return;

    try {
      const response = await reportsApi.deletePhoto(selectedReport.id, photoId);
      if (response.success) {
        setMessage({ type: "success", text: "写真を削除しました" });
        await loadPhotos();
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "削除に失敗しました",
      });
    }
  };

  const handleSubmitToSales = async () => {
    if (!selectedReport?.id || !chiefName) {
      setMessage({ type: "error", text: "チーフ名を入力してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // チーフ報告内容を更新
      await reportsApi.updateReport(selectedReport.id, {
        chief_name: chiefName,
        chief_report_content: chiefReportContent,
        updated_by: chiefName,
      });

      // ステータス更新
      await reportsApi.updateStatus(
        selectedReport.id,
        "chief_submitted_to_sales",
        undefined,
        chiefName
      );

      setMessage({ type: "success", text: "営業へ提出しました" });
      // 報告書を再取得
      await loadReportBySite();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "提出に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chief-page">
      <div className="container">
        <div className="page-header">
          <h1>現場報告書 - チーフ・リーダー</h1>
          <div className="header-menu">
            <button
              className="btn btn-secondary"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              メニュー
            </button>
            {isMenuOpen && (
              <div className="menu-dropdown">
                <button
                  className="menu-item danger"
                  onClick={handleDeleteReport}
                  disabled={!selectedReport?.id || loading}
                >
                  報告書を削除
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="filter-section">
          <div className="form-group">
            <label>日付</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>場所</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setSelectedSiteName("");
              }}
            >
              <option value="">すべての場所</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>現場名</label>
            <select
              value={selectedSiteName}
              onChange={(e) => setSelectedSiteName(e.target.value)}
              disabled={!selectedLocation}
            >
              <option value="">
                {selectedLocation ? "現場を選択してください" : "まず場所を選択してください"}
              </option>
              {filteredSites.map((site, index) => (
                <option key={index} value={site.site_name}>
                  {site.site_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>読み込み中...</p>
        ) : !selectedSiteName ? (
          <p>日付、場所、現場名を選択してください</p>
        ) : availableReports.length === 0 ? (
          <p>この日付・現場の報告書が見つかりませんでした</p>
        ) : availableReports.length > 1 && !selectedReport ? (
          <div className="reports-list">
            <h2>報告書を選択してください ({availableReports.length}件)</h2>
            <ul>
              {availableReports.map((report) => (
                <li
                  key={report.id}
                  onClick={() => handleReportSelect(report.id!)}
                  className="clickable"
                >
                  <div>
                    <strong>{report.site_name}</strong> {report.site_code ? `(${report.site_code})` : ""}
                  </div>
                  <div className="meta">
                    {report.report_date} - {report.location || "場所未設定"}
                  </div>
                  {report.staff_entries && report.staff_entries.length > 0 && (
                    <div className="meta">
                      スタッフ: {report.staff_entries.map((e) => e.staff_name).join(", ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : selectedReport ? (
          <div className="report-detail">
            <h2>報告書詳細</h2>

            <div className="form-group">
              <label>チーフ氏名</label>
              <input
                type="text"
                value={chiefName}
                onChange={(e) => setChiefName(e.target.value)}
                placeholder="あなたの名前を入力"
              />
            </div>

            <div className="times-section">
              <h3>時間記録</h3>
              <div className="time-inputs">
                <div className="form-group">
                  <label>集合時間</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>現場到着</label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>現場終了</label>
                  <input
                    type="time"
                    value={finishTime}
                    onChange={(e) => setFinishTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>現場出発</label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
              </div>
              <button onClick={handleUpdateTimes} className="btn btn-secondary">
                時間を保存
              </button>
            </div>

            <div className="form-group">
              <label>チーフ報告欄</label>
              <textarea
                value={chiefReportContent}
                onChange={(e) => setChiefReportContent(e.target.value)}
                rows={4}
                placeholder="チーフとしての報告内容を記入してください"
              />
            </div>

            <div className="form-group">
              <label>写真添付（最大10枚）</label>
              <div style={{ marginBottom: "10px" }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhotos || photos.length >= 10}
                  style={{ marginBottom: "10px" }}
                />
                {photos.length >= 10 && (
                  <p style={{ color: "#dc3545", fontSize: "14px" }}>
                    写真は最大10枚までです
                  </p>
                )}
                {photos.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      アップロード済み写真 ({photos.length}/10):
                    </p>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {photos.map((photo) => (
                        <li
                          key={photo.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "5px 0",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          <span>{photo.file_name}</span>
                          <button
                            onClick={() => handlePhotoDelete(photo.id)}
                            className="btn btn-danger"
                            style={{ padding: "2px 8px", fontSize: "12px" }}
                          >
                            削除
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="staff-entries">
              <h3>スタッフ報告一覧</h3>
              {selectedReport.staff_entries && selectedReport.staff_entries.length > 0 ? (
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
                      <th>削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.staff_entries.map((entry) => (
                      <Fragment key={entry.id || entry.staff_name}>
                        <tr>
                          <td>{entry.staff_name}</td>
                          <td>{formatStaffRoles(selectedReport.staff_roles)}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.is_driving || false}
                              onChange={(e) =>
                                handleAllowanceToggle(
                                  entry,
                                  "is_driving",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.is_laundry || false}
                              onChange={(e) =>
                                handleAllowanceToggle(
                                  entry,
                                  "is_laundry",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.is_partition || false}
                              onChange={(e) =>
                                handleAllowanceToggle(
                                  entry,
                                  "is_partition",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.is_warehouse || false}
                              onChange={(e) =>
                                handleAllowanceToggle(
                                  entry,
                                  "is_warehouse",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={entry.is_accommodation || false}
                              onChange={(e) =>
                                handleAllowanceToggle(
                                  entry,
                                  "is_accommodation",
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleDeleteStaffEntry(entry)}
                              disabled={loading}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={8}>
                            <div className="staff-report-content">
                              {entry.report_content || "-"}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>スタッフ報告がありません</p>
              )}
            </div>

            <div className="button-group">
              <button
                onClick={handleSubmitToSales}
                disabled={loading || !chiefName}
                className="btn btn-primary"
              >
                営業へ提出
              </button>
            </div>

            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        ) : (
          <p>この日付・現場の報告書が見つかりませんでした</p>
        )}
      </div>
    </div>
  );
}

export default ChiefPage;

