import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi, Report } from "../services/reportsApi";
import { mastersApi, Site } from "../services/mastersApi";
import { useRealtimeReport } from "../hooks/useRealtimeReport";
import "./StaffPage.css";

function StaffPage() {
  const navigate = useNavigate();
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [reportContent, setReportContent] = useState<string>("");
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null
  );
  const [currentReport, setCurrentReport] = useState<Report | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    loadSites();
  }, [reportDate]);

  useEffect(() => {
    if (selectedSiteId) {
      const site = sites.find((s) => s.id === selectedSiteId);
      setSelectedSite(site || null);
    }
  }, [selectedSiteId, sites]);

  const loadSites = async () => {
    try {
      const response = await mastersApi.getSites({
        year: currentYear,
        month: currentMonth,
      });
      if (response.success) {
        // 選択された日付に関連する報告書がある現場を取得
        let sitesWithReports: number[] = [];
        try {
          const reportsResponse = await reportsApi.getReports({
            role: "staff",
            date_from: reportDate,
            date_to: reportDate,
          });
          if (reportsResponse.success) {
            sitesWithReports = reportsResponse.data
              .map((r) => r.site_id)
              .filter((id): id is number => id !== undefined);
          }
        } catch (error) {
          // 報告書の取得に失敗しても続行
          console.warn("Error loading reports for sorting:", error);
        }

        // ソート: 日付（報告書がある現場を優先） → 場所 → 現場名の順
        const sortedSites = [...response.data].sort((a, b) => {
          // 1. 日付でソート: 選択された日付に報告書がある現場を優先
          const aHasReport = a.id && sitesWithReports.includes(a.id);
          const bHasReport = b.id && sitesWithReports.includes(b.id);
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
    const siteId = parseInt(e.target.value);
    setSelectedSiteId(siteId);
    setSelectedSite(sites.find((s) => s.id === siteId) || null);
  };

  const handleSave = async () => {
    if (!selectedSiteId || !selectedSite || !staffName) {
      setMessage({
        type: "error",
        text: "日付、現場、スタッフ名を入力してください",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (currentReport?.id) {
        // 更新
        await reportsApi.updateReport(currentReport.id, {
          staff_report_content: reportContent,
          updated_by: staffName,
        });
        setMessage({ type: "success", text: "保存しました" });
      } else {
        // 新規作成
        const response = await reportsApi.createReport({
          report_date: reportDate,
          site_id: selectedSiteId,
          site_code: selectedSite.site_code,
          site_name: selectedSite.site_name,
          location: selectedSite.location,
          staff_name: staffName,
          report_content: reportContent,
          created_by: staffName,
          status: "staff_draft",
        });
        if (response.success) {
          setMessage({ type: "success", text: "保存しました" });
          // 作成した報告書を取得
          const reportResponse = await reportsApi.getReport(response.data.id);
          if (reportResponse.success) {
            setCurrentReport(reportResponse.data);
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
            <label>現場名</label>
            <select
              value={selectedSiteId || ""}
              onChange={handleSiteChange}
              disabled={loading || !canEdit}
            >
              <option value="">選択してください</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_name} ({site.site_code})
                  {site.location ? ` - ${site.location}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedSite && (
            <div className="form-group">
              <label>場所</label>
              <input
                type="text"
                value={selectedSite.location || ""}
                disabled
                className="readonly"
              />
            </div>
          )}

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

