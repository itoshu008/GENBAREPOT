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

function WatchmanPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [sheetDataByDate, setSheetDataByDate] = useState<Record<string, SheetRowData[]>>({});
  const [salesAssignments, setSalesAssignments] = useState<Record<string, string>>({});
  const [loadingSalesAssignments, setLoadingSalesAssignments] = useState<Set<string>>(new Set());

  const WATCHMAN_SITE_NAME = "留守番スタッフ";

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
                
                // 同じ日付の報告内容を集約
                const allReportContents: string[] = [];
                const allStaffEntries: Array<{ name: string; content?: string }> = [];
                const allChiefNames = new Set<string>();
                
                dateReports.forEach((report) => {
                  if (report.chief_report_content) {
                    allReportContents.push(report.chief_report_content);
                  }
                  if (report.chief_name) {
                    allChiefNames.add(report.chief_name);
                  }
                  if (report.staff_entries && report.staff_entries.length > 0) {
                    report.staff_entries.forEach((entry) => {
                      allStaffEntries.push({
                        name: entry.staff_name,
                        content: entry.report_content || undefined,
                      });
                    });
                  }
                });

                return (
                  <div key={date} className="date-group">
                    <div className="date-header">
                      <h3>{formatDate(date)}</h3>
                      <div className="sales-assignment">
                        <span className="label">営業担当：</span>
                        <span className="value">{salesAssignment}</span>
                      </div>
                    </div>
                    
                    <div className="report-item">
                      {allChiefNames.size > 0 && (
                        <div className="chief-name">
                          チーフ・リーダー: {Array.from(allChiefNames).join(", ")}
                        </div>
                      )}
                      
                      {allStaffEntries.length > 0 && (
                        <div className="staff-entries">
                          <strong>スタッフ報告:</strong>
                          <ul>
                            {allStaffEntries.map((entry, index) => (
                              <li key={index}>
                                {entry.name}
                                {entry.content && ` - ${entry.content}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {allReportContents.length > 0 && (
                        <div className="chief-report">
                          <strong>報告内容:</strong>
                          {allReportContents.map((content, index) => (
                            <div key={index} className="report-content-text">
                              {content}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="report-status">
                        ステータス: {dateReports[0]?.status === "staff_submitted" ? "チーフ確認待ち" : 
                                     dateReports[0]?.status === "chief_submitted_to_sales" ? "営業確認待ち" :
                                     dateReports[0]?.status === "submitted_to_accounting" ? "経理確認待ち" :
                                     dateReports[0]?.status === "completed" ? "完了" :
                                     dateReports[0]?.status === "returned_by_sales" ? "営業差し戻し" :
                                     dateReports[0]?.status === "returned_by_accounting" ? "経理差し戻し" :
                                     dateReports[0]?.status || "未確定"}
                      </div>
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

