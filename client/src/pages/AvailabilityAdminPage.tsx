import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/BackButton";
import { availabilityApi, StaffAvailability } from "../services/availabilityApi";
import "./AvailabilityAdminPage.css";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const formatDate = (date: Date) => date.toISOString().split("T")[0];

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const buildCalendarDays = (anchor: Date) => {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);

  const days: Array<{ date: Date; value: string; currentMonth: boolean }> = [];

  const startDay = start.getDay();
  for (let i = 0; i < startDay; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() - (startDay - i));
    days.push({ date, value: formatDate(date), currentMonth: false });
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth(), day);
    days.push({ date, value: formatDate(date), currentMonth: true });
  }

  const endDay = end.getDay();
  for (let i = 1; i < 7 - endDay; i += 1) {
    const date = new Date(end);
    date.setDate(end.getDate() + i);
    days.push({ date, value: formatDate(date), currentMonth: false });
  }

  return days;
};

const normalizeDateKey = (input: string) => input?.split("T")[0] || "";

function AvailabilityAdminPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const groupedAvailability = useMemo(() => {
    return availability.reduce<Record<string, StaffAvailability[]>>((acc, item) => {
      const key = normalizeDateKey(item.available_date);
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = [];
      }

      const duplicates = acc[key];
      const alreadyExists = duplicates.some(
        (entry) => entry.staff_name?.trim() === item.staff_name?.trim()
      );
      if (!alreadyExists) {
        acc[key].push(item);
      }
      return acc;
    }, {});
  }, [availability]);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = formatDate(startOfMonth(currentMonth));
        const end = endOfMonth(currentMonth);
        const to = formatDate(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 7));
        const response = await availabilityApi.getAvailability({ from, to });
        if (response.success) {
          setAvailability(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [currentMonth]);

  const handleMonthChange = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + offset);
    setCurrentMonth(startOfMonth(next));
  };

  const selectedList = groupedAvailability[selectedDate] || [];
  const selectedDateLabel = (() => {
    const date = new Date(selectedDate);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${WEEKDAYS[date.getDay()]})`;
  })();

  return (
    <div className="availability-admin-page">
      <div className="container">
        <BackButton />
        <div className="page-header">
          <h1>空き日リクエスト管理</h1>
        </div>

        <div className="availability-layout">
          <div className="calendar-card compact">
            <div className="calendar-header">
              <button className="nav-btn" onClick={() => handleMonthChange(-1)}>
                ←
              </button>
              <div className="current-month">
                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </div>
              <button className="nav-btn" onClick={() => handleMonthChange(1)}>
                →
              </button>
            </div>
            <div className="calendar-grid">
              {WEEKDAYS.map((label) => (
                <div key={label} className="calendar-weekday">
                  {label}
                </div>
              ))}
              {calendarDays.map(({ date, value, currentMonth: isCurrent }) => {
                const hasEntries = groupedAvailability[value]?.length;
                const isSelected = selectedDate === value;
                return (
                  <button
                    type="button"
                    key={value}
                    className={`calendar-cell ${isCurrent ? "" : "muted"} ${isSelected ? "selected" : ""} ${
                      hasEntries ? "has-entries" : ""
                    }`}
                    onClick={() => setSelectedDate(value)}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    {hasEntries ? <span className="entry-count">{hasEntries}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="availability-list-card prominent">
            <h3>{selectedDateLabel || "日付を選択してください"}</h3>
            {loading && <p>読み込み中...</p>}
            {error && <p className="error-text">{error}</p>}
            {!loading && !error && selectedList.length === 0 && <p>まだ登録がありません。</p>}
            {!loading && !error && selectedList.length > 0 && (
              <ul>
                {selectedList.map((entry) => (
                  <li key={`${entry.available_date}-${entry.staff_name}`}>
                    <div>
                      <span className="name">{entry.staff_name}</span>
                      {entry.role && <span className="role-tag">{entry.role}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityAdminPage;


