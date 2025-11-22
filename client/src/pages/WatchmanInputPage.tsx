import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi } from "../services/reportsApi";
import { sheetsApi } from "../services/sheetsApi";
import SubmissionComplete from "../components/SubmissionComplete";
import AvailabilityPrompt from "../components/AvailabilityPrompt";
import "./WatchmanInputPage.css";

const WATCHMAN_SITE_NAME = "留守番スタッフ";

function WatchmanInputPage() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [meetingPlace, setMeetingPlace] = useState<string>("");
  const [meetingPlaceOther, setMeetingPlaceOther] = useState<string>("");
  const [movementNote, setMovementNote] = useState<string>("");
  const [meetingTime, setMeetingTime] = useState<string>("");
  const [finishTime, setFinishTime] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showCompletion, setShowCompletion] = useState<boolean>(false);
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async () => {
    const finalMeetingPlace = meetingPlace === "その他" ? meetingPlaceOther : meetingPlace;
    if (!name || !meetingPlace || !meetingTime || !finishTime) {
      setMessage({
        type: "error",
        text: "すべての項目を入力してください",
      });
      return;
    }
    if (meetingPlace === "その他" && !meetingPlaceOther.trim()) {
      setMessage({
        type: "error",
        text: "その他の集合場所を入力してください",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // スプレッドシートから場所を取得（留守番スタッフの場所）
      let location = "";
      try {
        const sheetResponse = await sheetsApi.getSheetDataByDate(reportDate);
        if (sheetResponse.success && Array.isArray(sheetResponse.data)) {
          const watchmanData = sheetResponse.data.find(
            (row) => row.site_name === WATCHMAN_SITE_NAME
          );
          if (watchmanData && watchmanData.location) {
            location = watchmanData.location;
          }
        }
      } catch (error) {
        console.warn("Error loading location from sheet:", error);
      }

      // 報告書を作成
      const reportData = {
        report_date: reportDate,
        site_name: WATCHMAN_SITE_NAME,
        location: location || "未設定",
        chief_name: name,
        status: "staff_submitted" as const,
        created_by: name,
      };

      const createResponse = await reportsApi.createReport(reportData);
      
      if (createResponse.success && createResponse.data?.id) {
        const reportId = createResponse.data.id;

        // 時間記録を追加
        await reportsApi.updateTimes(reportId, {
          meeting_time: meetingTime,
          finish_time: finishTime,
        });

        // チーフ報告内容に集合場所と時間を記載
        const finalMeetingPlace = meetingPlace === "その他" ? meetingPlaceOther : meetingPlace;
        let chiefReportContent = `集合場所: ${finalMeetingPlace}\n集合時間: ${meetingTime}\n解散時間: ${finishTime}`;
        if (movementNote.trim()) {
          chiefReportContent += `\n移動: ${movementNote.trim()}`;
        }
        await reportsApi.updateReport(reportId, {
          chief_report_content: chiefReportContent,
        });

        setShowCompletion(true);
      } else {
        throw new Error("報告書の作成に失敗しました");
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "報告書の提出に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showCompletion) {
    return (
      <div className="watchman-input-page">
        <div className="container">
          <SubmissionComplete
            roleLabel="留守番スタッフ報告書"
            message="内容はチーフ・リーダーへ共有されました。"
          />
          <AvailabilityPrompt staffName={name} role="staff" />
        </div>
      </div>
    );
  }

  return (
    <div className="watchman-input-page">
      <div className="container">
        <div className="page-header">
          <button
            onClick={() => navigate("/select")}
            className="btn-back-small"
            type="button"
          >
            ← 戻る
          </button>
          <h1>留守番スタッフ報告書</h1>
        </div>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-section">
          <div className="form-group">
            <label>日付</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>名前 <span className="required">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前を入力"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>集合場所 <span className="required">*</span></label>
            <select
              value={meetingPlace}
              onChange={(e) => setMeetingPlace(e.target.value)}
              disabled={loading}
            >
              <option value="">選択してください</option>
              <option value="EAST">EAST</option>
              <option value="千種駅">千種駅</option>
              <option value="その他">その他</option>
            </select>
            {meetingPlace === "その他" && (
              <input
                type="text"
                value={meetingPlaceOther}
                onChange={(e) => setMeetingPlaceOther(e.target.value)}
                placeholder="集合場所を入力"
                disabled={loading}
                style={{ marginTop: "10px" }}
              />
            )}
          </div>

          <div className="form-group">
            <label>移動した場合記入してください</label>
            <input
              type="text"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              placeholder="移動した場合は記入してください（任意）"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>集合時間 <span className="required">*</span></label>
            <input
              type="time"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>解散時間 <span className="required">*</span></label>
            <input
              type="time"
              value={finishTime}
              onChange={(e) => setFinishTime(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="button-group">
            <button
              onClick={handleSubmit}
              disabled={loading || !name || !meetingPlace || !meetingTime || !finishTime || (meetingPlace === "その他" && !meetingPlaceOther.trim())}
              className="btn btn-primary"
            >
              {loading ? "提出中..." : "提出"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WatchmanInputPage;

