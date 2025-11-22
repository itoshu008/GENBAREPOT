import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi, ReportWithDetails } from "../services/reportsApi";
import { sheetsApi, SheetRowData } from "../services/sheetsApi";
import "./WatchmanPage.css";

const normalizeSiteName = (name?: string | null) => {
  return (name || "").replace(/[\s\u3000]/g, "").toLowerCase();
};

interface DateGroupedReport {
  date: string;
  reports: ReportWithDetails[];
  salesAssignment: string;
}

interface ParsedReportContent {
  name: string;
  meetingPlace: string;
  meetingTime: string;
  finishTime: string;
  movement?: string;
}

function WatchmanPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [sheetDataByDate, setSheetDataByDate] = useState<Record<string, SheetRowData[]>>({});
  const [salesAssignments, setSalesAssignments] = useState<Record<string, string>>({});
  const [loadingSalesAssignments, setLoadingSalesAssignments] = useState<Set<string>>(new Set());
  const [submittingDates, setSubmittingDates] = useState<Set<string>>(new Set());

  const WATCHMAN_SITE_NAME = "留守番スタッフ";

  const normalizeDate = (dateString: string): string => {
    if (dateString.includes('T') || dateString.includes('Z')) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (dateString.includes(' ')) {
      return dateString.split(' ')[0];
    }
    return dateString;
  };

  useEffect(() => {
    loadReports();
  }, []);

  // 報告書を日付ごとにグループ化
  const groupedReports = useMemo(() => {
    const groups: Record<string, ReportWithDetails[]> = {};
    
    reports.forEach((report) => {
      const dateStr = normalizeDate(report.report_date);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(report);
    });

    return groups;
  }, [reports]);

  // 日付ごとの営業担当を読み込む
  useEffect(() => {
    const dates = Object.keys(groupedReports);
    dates.forEach((date) => {
      if (!salesAssignments[date] && !loadingSalesAssignments.has(date)) {
        loadSalesAssignmentForDate(date);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedReports]);

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

  const loadSalesAssignmentForDate = async (date: string) => {
    if (loadingSalesAssignments.has(date)) return;

    setLoadingSalesAssignments((prev) => new Set(prev).add(date));

    try {
      // スプレッドシートからデータを取得
      const response = await sheetsApi.getSheetDataByDate(date);
      if (response.success && Array.isArray(response.data)) {
        setSheetDataByDate((prev) => ({ ...prev, [date]: response.data }));
        
        // 「留守番スタッフ」の現場名でマッチ
        const normalizedTarget = normalizeSiteName(WATCHMAN_SITE_NAME);
        const match = response.data.find(
          (row: SheetRowData) => normalizeSiteName(row.site_name) === normalizedTarget
        );

        if (match && match.staff_name) {
          setSalesAssignments((prev) => ({ ...prev, [date]: match.staff_name.trim() }));
        } else {
          setSalesAssignments((prev) => ({ ...prev, [date]: "未登録" }));
        }
      } else {
        setSalesAssignments((prev) => ({ ...prev, [date]: "未登録" }));
      }
    } catch (error) {
      console.error("Error loading sales assignment:", error);
      setSalesAssignments((prev) => ({ ...prev, [date]: "未登録" }));
    } finally {
      setLoadingSalesAssignments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  };

  // 報告内容を解析
  const parseReportContent = (report: ReportWithDetails): ParsedReportContent | null => {
    if (!report.chief_report_content) return null;

    const content = report.chief_report_content;
    const parsed: ParsedReportContent = {
      name: report.chief_name || "未入力",
      meetingPlace: "",
      meetingTime: "",
      finishTime: "",
    };

    // 集合場所: の行を探す
    const meetingPlaceMatch = content.match(/集合場所:\s*(.+)/);
    if (meetingPlaceMatch) {
      parsed.meetingPlace = meetingPlaceMatch[1].trim();
    }

    // 集合時間: の行を探す
    const meetingTimeMatch = content.match(/集合時間:\s*(.+)/);
    if (meetingTimeMatch) {
      parsed.meetingTime = meetingTimeMatch[1].trim();
    }

    // 解散時間: の行を探す
    const finishTimeMatch = content.match(/解散時間:\s*(.+)/);
    if (finishTimeMatch) {
      parsed.finishTime = finishTimeMatch[1].trim();
    }

    // 移動: の行を探す
    const movementMatch = content.match(/移動:\s*(.+)/);
    if (movementMatch) {
      parsed.movement = movementMatch[1].trim();
    }

    return parsed;
  };

  // 経理に提出
  const handleSubmitToAccounting = async (date: string, dateReports: ReportWithDetails[]) => {
    if (submittingDates.has(date)) return;

    setSubmittingDates((prev) => new Set(prev).add(date));
    setMessage(null);

    try {
      // その日のすべての報告書を経理に提出
      const updatePromises = dateReports.map(async (report) => {
        if (report.id) {
          await reportsApi.updateStatus(
            report.id,
            "submitted_to_accounting",
            undefined,
            "sales"
          );
        }
      });

      await Promise.all(updatePromises);

      setMessage({ type: "success", text: "経理へ提出しました" });
      await loadReports();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "提出に失敗しました",
      });
    } finally {
      setSubmittingDates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
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
          </div>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <p>読み込み中...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p className="empty-message">報告書がありません</p>
        ) : (
          <div className="reports-list">
            <h2>報告書一覧 ({Object.keys(groupedReports).length}日分)</h2>
            {Object.keys(groupedReports)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((date) => {
                const dateReports = groupedReports[date];
                const salesAssignment = salesAssignments[date] || (loadingSalesAssignments.has(date) ? "読み込み中..." : "未登録");
                const isSubmitting = submittingDates.has(date);
                const canSubmitToAccounting = dateReports.some(
                  (r) => r.status === "chief_submitted_to_sales" || r.status === "staff_submitted"
                );

                return (
                  <div key={date} className="date-group">
                    <div className="date-header">
                      <h3>{formatDate(date)}</h3>
                      <div className="header-actions">
                        <div className="sales-assignment">
                          <span className="label">営業担当：</span>
                          <span className="value">{salesAssignment}</span>
                        </div>
                        {canSubmitToAccounting && (
                          <button
                            onClick={() => handleSubmitToAccounting(date, dateReports)}
                            disabled={isSubmitting}
                            className="btn-submit-accounting"
                          >
                            {isSubmitting ? "提出中..." : "経理に提出"}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="reports-container">
                      {dateReports.map((report, reportIndex) => {
                        const parsed = parseReportContent(report);
                        return (
                          <div key={report.id || reportIndex} className="watchman-report-card">
                            <div className="report-card-header">
                              <h4>{parsed?.name || report.chief_name || "未入力"}</h4>
                            </div>
                            
                            <div className="report-card-content">
                              <div className="info-row">
                                <span className="info-label">集合場所：</span>
                                <span className="info-value">{parsed?.meetingPlace || "-"}</span>
                              </div>
                              
                              <div className="info-row">
                                <span className="info-label">集合時間：</span>
                                <span className="info-value">{parsed?.meetingTime || report.times?.meeting_time?.substring(0, 5) || "-"}</span>
                              </div>
                              
                              <div className="info-row">
                                <span className="info-label">解散時間：</span>
                                <span className="info-value">{parsed?.finishTime || report.times?.finish_time?.substring(0, 5) || "-"}</span>
                              </div>
                              
                              {parsed?.movement && (
                                <div className="info-row">
                                  <span className="info-label">移動場所：</span>
                                  <span className="info-value">{parsed.movement}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchmanPage;

