import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi, Report, ReportWithDetails } from "../services/reportsApi";
import { mastersApi, Site } from "../services/mastersApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import { useRealtimeReport } from "../hooks/useRealtimeReport";
import "./StaffPage.css";

function StaffPage() {
  const navigate = useNavigate();
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [location, setLocation] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [staffRoles, setStaffRoles] = useState<{
    ad: boolean;
    pa: boolean;
    staff: boolean;
    actor: boolean;
    attend: boolean;
    other: boolean;
  }>({
    ad: false,
    pa: false,
    staff: false,
    actor: false,
    attend: false,
    other: false,
  });
  const [staffRoleOtherText, setStaffRoleOtherText] = useState<string>("");
  const [staffRoleStaffText, setStaffRoleStaffText] = useState<string>("");
  const [staffRoleActorText, setStaffRoleActorText] = useState<string>("");
  const [staffRoleAttendText, setStaffRoleAttendText] = useState<string>("");
  const [reportContent, setReportContent] = useState<string>("");
  const [allowances, setAllowances] = useState<{
    driving: boolean;
    laundry: boolean;
    partition: boolean;
    warehouse: boolean;
    accommodation: boolean;
  }>({
    driving: false,
    laundry: false,
    partition: false,
    warehouse: false,
    accommodation: false,
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesWithReports, setSitesWithReports] = useState<number[]>([]);
  const [sheetData, setSheetData] = useState<SheetRowData[]>([]);
  const [sheetDataLoading, setSheetDataLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null
  );
  const [currentReport, setCurrentReport] = useState<ReportWithDetails | null>(null);

  // 選択された日付から年と月を取得
  const getYearMonthFromDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  };

  useEffect(() => {
    loadSheetData();
    loadSites();
    // 日付が変更されたら場所の選択をリセット
    setSelectedLocation("");
  }, [reportDate]);

  // スプレッドシートから日付でデータを取得
  const loadSheetData = async () => {
    setSheetDataLoading(true);
    try {
      const response = await sheetsApi.getSheetDataByDate(reportDate);
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

  // 利用可能な場所のリストを取得（スプレッドシートから取得したデータを優先、なければsitesから）
  const sheetLocations = Array.from(
    new Set(
      sheetData
        .map((row) => row.location)
        .filter((l): l is string => !!l)
    )
  );
  
  const sitesLocations = Array.from(
    new Set(
      sites
        .map((s) => s.location)
        .filter((l): l is string => !!l)
    )
  );
  
  // スプレッドシートのデータが取得済みで、データがある場合はそれを使用
  // スプレッドシートのデータがまだ取得中、またはデータがない場合はsitesから取得
  const availableLocations = (!sheetDataLoading && sheetLocations.length > 0 
    ? sheetLocations 
    : sitesLocations)
    .sort((a, b) => a.localeCompare(b, "ja"));

  // 選択された場所でフィルタリングされた現場リスト（スプレッドシートのデータが取得済みでデータがある場合はそれを使用、なければsitesから）
  const filteredSites = (!sheetDataLoading && sheetData.length > 0)
    ? (selectedLocation
        ? sheetData
            .filter((row) => row.location === selectedLocation)
            .map((row) => ({
              id: undefined,
              year: new Date(reportDate).getFullYear(),
              month: new Date(reportDate).getMonth() + 1,
              site_code: "",
              site_name: row.site_name,
              location: row.location,
            }))
        : sheetData.map((row) => ({
            id: undefined,
            year: new Date(reportDate).getFullYear(),
            month: new Date(reportDate).getMonth() + 1,
            site_code: "",
            site_name: row.site_name,
            location: row.location,
          })))
    : (selectedLocation
        ? sites.filter((s) => s.location === selectedLocation)
        : sites);

  useEffect(() => {
    if (selectedSiteName) {
      const site = filteredSites.find((s) => s.site_name === selectedSiteName);
      setSelectedSite(site || null);
      // 現場が選択されたら場所を自動入力
      if (site?.location) {
        setLocation(site.location);
      }
    } else {
      setSelectedSite(null);
    }
  }, [selectedSiteName, filteredSites]);

  // 場所が変更されたら現場選択をリセット、または自動選択
  useEffect(() => {
    if (selectedLocation) {
      const filtered = filteredSites.filter((s) => s.location === selectedLocation);
      // 該当する現場が1つだけなら自動選択
      if (filtered.length === 1) {
        const site = filtered[0];
        setSelectedSiteName(site.site_name);
        setSelectedSite(site);
      } else {
        // 複数または0件の場合はリセット
        setSelectedSiteName("");
        setSelectedSite(null);
      }
    } else {
      // 場所が未選択の場合はリセット
      setSelectedSiteName("");
      setSelectedSite(null);
    }
  }, [selectedLocation, filteredSites]);

  const loadSites = async () => {
    try {
      const { year, month } = getYearMonthFromDate(reportDate);
      const response = await mastersApi.getSites({
        year: year,
        month: month,
      });
      if (response.success) {
        // 選択された日付に関連する報告書がある現場を取得
        let reportsSites: number[] = [];
        try {
          const reportsResponse = await reportsApi.getReports({
            role: "staff",
            date_from: reportDate,
            date_to: reportDate,
          });
          if (reportsResponse.success) {
            reportsSites = reportsResponse.data
              .map((r) => r.site_id)
              .filter((id): id is number => id !== undefined);
          }
        } catch (error) {
          // 報告書の取得に失敗しても続行
          console.warn("Error loading reports for sorting:", error);
        }

        // その日付に報告書がある現場のIDを保存
        setSitesWithReports(reportsSites);

        // ソート: 日付（報告書がある現場を優先） → 場所 → 現場名の順
        const sortedSites = [...response.data].sort((a, b) => {
          // 1. 日付でソート: 選択された日付に報告書がある現場を優先
          const aHasReport = a.id && reportsSites.includes(a.id);
          const bHasReport = b.id && reportsSites.includes(b.id);
          if (aHasReport !== bHasReport) {
            return aHasReport ? -1 : 1;
          }
          // 2. 場所でソート
          const locationA = a.location || "";
          const locationB = b.location || "";
          if (locationA !== locationB) {
            return locationA.localeCompare(locationB, "ja");
          }
          // 3. 現場名でソート
          return a.site_name.localeCompare(b.site_name, "ja");
        });
        setSites(sortedSites);
      }
    } catch (error) {
      console.error("Error loading sites:", error);
    }
  };

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const siteName = e.target.value;
    setSelectedSiteName(siteName);
    const site = filteredSites.find((s) => s.site_name === siteName);
    setSelectedSite(site || null);
  };

  const handleSave = async () => {
    if (!selectedSiteName || !selectedSite || !staffName) {
      setMessage({
        type: "error",
        text: "日付、現場、スタッフ名を入力してください",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    // 役割を文字列に変換（カンマ区切り）
    const rolesArray: string[] = [];
    if (staffRoles.ad) rolesArray.push("AD");
    if (staffRoles.pa) rolesArray.push("PA");
    if (staffRoles.staff) {
      if (staffRoleStaffText.trim()) {
        rolesArray.push(`スタッフ:${staffRoleStaffText.trim()}`);
      } else {
        rolesArray.push("スタッフ");
      }
    }
    if (staffRoles.actor) {
      if (staffRoleActorText.trim()) {
        rolesArray.push(`アクター:${staffRoleActorText.trim()}`);
      } else {
        rolesArray.push("アクター");
      }
    }
    if (staffRoles.attend) {
      if (staffRoleAttendText.trim()) {
        rolesArray.push(`アテンド:${staffRoleAttendText.trim()}`);
      } else {
        rolesArray.push("アテンド");
      }
    }
    if (staffRoles.other && staffRoleOtherText.trim()) {
      rolesArray.push(`その他:${staffRoleOtherText.trim()}`);
    }
    const staffRoleString = rolesArray.join(",");

    try {
      if (currentReport?.id) {
        // 更新
        await reportsApi.updateReport(currentReport.id, {
          location: selectedSite?.location || null,
          staff_report_content: reportContent,
          staff_roles: staffRoleString,
          updated_by: staffName,
        });
        // スタッフエントリの手当情報を更新
        if (currentReport.staff_entries && currentReport.staff_entries.length > 0) {
          const entry = currentReport.staff_entries.find(
            (e) => e.staff_name === staffName
          );
          if (entry) {
            await reportsApi.updateStaffEntry(currentReport.id, {
              staff_name: staffName,
              report_content: reportContent,
              is_driving: allowances.driving,
              is_laundry: allowances.laundry,
              is_partition: allowances.partition,
              is_warehouse: allowances.warehouse,
              is_accommodation: allowances.accommodation,
            });
          }
        }
        setMessage({ type: "success", text: "保存しました" });
      } else {
        // 新規作成
        // スプレッドシートから取得したデータの場合、site_idはnull（現場名で識別）
        const response = await reportsApi.createReport({
          report_date: reportDate,
          site_id: selectedSite?.id || null,
          site_code: selectedSite?.site_code || "",
          site_name: selectedSite?.site_name || "",
          location: selectedSite?.location || null,
          staff_name: staffName,
          staff_roles: staffRoleString,
          report_content: reportContent,
          created_by: staffName,
          status: "staff_draft",
          is_driving: allowances.driving,
          is_laundry: allowances.laundry,
          is_partition: allowances.partition,
          is_warehouse: allowances.warehouse,
          is_accommodation: allowances.accommodation,
        });
        if (response.success) {
          setMessage({ type: "success", text: "保存しました" });
          // 作成した報告書を取得
          const reportResponse = await reportsApi.getReport(response.data.id);
          if (reportResponse.success) {
            setCurrentReport(reportResponse.data);
            // 報告書の場所を反映
            if (reportResponse.data.location) {
              setLocation(reportResponse.data.location);
            }
          }
        }
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "保存に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentReport?.id) {
      setMessage({ type: "error", text: "まず保存してください" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await reportsApi.updateStatus(
        currentReport.id,
        "staff_submitted",
        undefined,
        staffName
      );
      setMessage({ type: "success", text: "チーフへ提出しました" });
      // 報告書を再取得
      const response = await reportsApi.getReport(currentReport.id);
      if (response.success) {
        setCurrentReport(response.data);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "提出に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  // 既存の報告書を読み込む
  useEffect(() => {
    const loadExistingReport = async () => {
      if (!reportDate || !selectedSiteName || !staffName) return;
      
      try {
        const response = await reportsApi.getReports({
          role: "staff",
          date_from: reportDate,
          date_to: reportDate,
          staff_name: staffName,
        });
        if (response.success && response.data.length > 0) {
          const report = response.data.find(
            (r) => r.site_name === selectedSiteName
          );
          if (report && report.id) {
            // 詳細を取得（staff_entries含む）
            const detailResponse = await reportsApi.getReport(report.id);
            if (detailResponse.success) {
              const detailedReport = detailResponse.data;
              setCurrentReport(detailedReport);
              if (detailedReport.staff_report_content) {
                setReportContent(detailedReport.staff_report_content);
              }
            // 役割を反映
            if (detailedReport.staff_roles) {
              const roles = detailedReport.staff_roles.split(",");
              const staffRole = roles.find((r) => r.startsWith("スタッフ:"));
              const actorRole = roles.find((r) => r.startsWith("アクター:"));
              const attendRole = roles.find((r) => r.startsWith("アテンド:"));
              const otherRole = roles.find((r) => r.startsWith("その他:"));
              setStaffRoles({
                ad: roles.includes("AD"),
                pa: roles.includes("PA"),
                staff: roles.some((r) => r.startsWith("スタッフ")),
                actor: roles.some((r) => r.startsWith("アクター")),
                attend: roles.some((r) => r.startsWith("アテンド")),
                other: !!otherRole,
              });
              if (staffRole) {
                setStaffRoleStaffText(staffRole.replace("スタッフ:", ""));
              } else {
                setStaffRoleStaffText("");
              }
              if (actorRole) {
                setStaffRoleActorText(actorRole.replace("アクター:", ""));
              } else {
                setStaffRoleActorText("");
              }
              if (attendRole) {
                setStaffRoleAttendText(attendRole.replace("アテンド:", ""));
              } else {
                setStaffRoleAttendText("");
              }
              if (otherRole) {
                setStaffRoleOtherText(otherRole.replace("その他:", ""));
              } else {
                setStaffRoleOtherText("");
              }
            }
              // 手当を反映
              if (detailedReport.staff_entries && detailedReport.staff_entries.length > 0) {
                const entry = detailedReport.staff_entries.find(
                  (e) => e.staff_name === staffName
                );
                if (entry) {
                  setAllowances({
                    driving: entry.is_driving || false,
                    laundry: entry.is_laundry || false,
                    partition: entry.is_partition || false,
                    warehouse: entry.is_warehouse || false,
                    accommodation: entry.is_accommodation || false,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        // エラーは無視
      }
    };
    loadExistingReport();
  }, [reportDate, selectedSiteName, staffName]);

  const canEdit = currentReport
    ? currentReport.status === "staff_draft" ||
      currentReport.status === "returned_by_sales"
    : true;

  // リアルタイム更新: 現在の報告書が更新されたら再取得
  useRealtimeReport(
    currentReport?.id,
    async () => {
      if (currentReport?.id) {
        const response = await reportsApi.getReport(currentReport.id);
        if (response.success) {
          setCurrentReport(response.data);
        }
      }
    },
    async (status) => {
      // ステータス変更時も再取得
      if (currentReport?.id) {
        const response = await reportsApi.getReport(currentReport.id);
        if (response.success) {
          setCurrentReport(response.data);
        }
      }
    }
  );

  return (
    <div className="staff-page">
      <div className="container">
        <div className="page-header">
          <h1>現場報告書 - スタッフ</h1>
          <button
            onClick={() => navigate("/chief")}
            className="btn btn-header"
          >
            チーフページへ
          </button>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>日付</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={loading || !canEdit}
            />
          </div>

          <div className="form-group">
            <label>場所</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={loading || !canEdit}
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
              value={selectedSiteName || ""}
              onChange={handleSiteChange}
              disabled={loading || !canEdit || !selectedLocation}
            >
              <option value="">
                {selectedLocation ? "現場を選択してください" : "まず場所を選択してください"}
              </option>
              {filteredSites.map((site, index) => (
                <option key={index} value={site.site_name}>
                  {site.site_name} {site.site_code ? `(${site.site_code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>スタッフ名</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              disabled={loading || !canEdit}
              placeholder="あなたの名前を入力"
            />
          </div>

          <div className="form-group">
            <label>役割</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.ad}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, ad: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                AD
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.pa}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, pa: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                PA
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.staff}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, staff: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                スタッフ
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.actor}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, actor: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                アクター
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.attend}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, attend: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                アテンド
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={staffRoles.other}
                  onChange={(e) =>
                    setStaffRoles({ ...staffRoles, other: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                その他
              </label>
            </div>
            {staffRoles.staff && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  value={staffRoleStaffText}
                  onChange={(e) => setStaffRoleStaffText(e.target.value)}
                  disabled={loading || !canEdit}
                  placeholder="何のポジション？"
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
            )}
            {staffRoles.actor && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  value={staffRoleActorText}
                  onChange={(e) => setStaffRoleActorText(e.target.value)}
                  disabled={loading || !canEdit}
                  placeholder="キャラクター名"
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
            )}
            {staffRoles.attend && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  value={staffRoleAttendText}
                  onChange={(e) => setStaffRoleAttendText(e.target.value)}
                  disabled={loading || !canEdit}
                  placeholder="なんのキャラクターのアテンド"
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
            )}
            {staffRoles.other && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  value={staffRoleOtherText}
                  onChange={(e) => setStaffRoleOtherText(e.target.value)}
                  disabled={loading || !canEdit}
                  placeholder="その他の役割を入力してください"
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>手当</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowances.driving}
                  onChange={(e) =>
                    setAllowances({ ...allowances, driving: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                運転
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowances.laundry}
                  onChange={(e) =>
                    setAllowances({ ...allowances, laundry: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                洗濯
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowances.partition}
                  onChange={(e) =>
                    setAllowances({ ...allowances, partition: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                仕切
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowances.warehouse}
                  onChange={(e) =>
                    setAllowances({ ...allowances, warehouse: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                倉庫
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowances.accommodation}
                  onChange={(e) =>
                    setAllowances({ ...allowances, accommodation: e.target.checked })
                  }
                  disabled={loading || !canEdit}
                />
                宿泊
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>報告内容</label>
            <textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              disabled={loading || !canEdit}
              rows={6}
              placeholder="現場での作業内容、気づいたことなどを記入してください"
            />
          </div>

          {currentReport && (
            <div className="status-info">
              <p>
                ステータス: <strong>{currentReport.status}</strong>
              </p>
              {currentReport.status === "staff_submitted" && (
                <p className="info">チーフへ提出済みです。編集はできません。</p>
              )}
              {currentReport.status === "returned_by_sales" && (
                <div className="return-reason">
                  <p className="warning">差戻し理由:</p>
                  <p>{currentReport.return_reason}</p>
                </div>
              )}
            </div>
          )}

          <div className="button-group">
            <button
              onClick={handleSave}
              disabled={loading || !canEdit}
              className="btn btn-primary"
            >
              保存
            </button>
            {canEdit && (
              <button
                onClick={handleSubmit}
                disabled={loading || !currentReport?.id}
                className="btn btn-secondary"
              >
                チーフへ提出
              </button>
            )}
          </div>

          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffPage;

