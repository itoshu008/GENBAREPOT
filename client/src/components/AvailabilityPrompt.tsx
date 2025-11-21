import { useMemo, useState } from "react";
import { availabilityApi } from "../services/availabilityApi";
import "./AvailabilityPrompt.css";

interface AvailabilityPromptProps {
  staffName: string;
  role: "staff" | "chief";
}

interface UpcomingDate {
  value: string;
  display: string;
  weekday: string;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const generateUpcomingDates = (days: number): UpcomingDate[] => {
  const result: UpcomingDate[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // 翌日から

  for (let i = 0; i < days; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const value = date.toISOString().split("T")[0];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];
    result.push({
      value,
      display: `${month}/${day}`,
      weekday: `(${weekday})`,
    });
  }
  return result;
};

function AvailabilityPrompt({ staffName, role }: AvailabilityPromptProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcomingDates = useMemo(() => generateUpcomingDates(14), []);

  if (!staffName || isHidden) {
    return null;
  }

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handleSubmit = async () => {
    if (selectedDates.length === 0) {
      setError("まず空いている日を1日以上選択してください");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await availabilityApi.submitAvailability({
        dates: selectedDates,
        staff_name: staffName,
        role,
      });
      setIsCompleted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="availability-prompt completion-card">
        <p className="completion-text">
          ページが飛んで現場のお願いをさせて頂く場合がございます。改めてご相談させて頂きます。本日は本当にお疲れ様でした。
        </p>
        <button className="btn btn-secondary" onClick={() => setIsHidden(true)}>
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="availability-prompt">
      <h3>空いている日があれば教えてください</h3>
      <p className="availability-description">
        明日から2週間分の日付です。空いている日をタップして「空いている日をお知らせ」を押してください。
      </p>
      <div className="date-button-grid">
        {upcomingDates.map((date) => {
          const isSelected = selectedDates.includes(date.value);
          return (
            <button
              type="button"
              key={date.value}
              className={`date-button ${isSelected ? "selected" : ""}`}
              onClick={() => toggleDate(date.value)}
            >
              <span className="weekday">{date.weekday}</span>
              <span className="day">{date.display}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="availability-error">{error}</p>}
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedDates.length === 0}
      >
        空いている日をお知らせ
      </button>
    </div>
  );
}

export default AvailabilityPrompt;


