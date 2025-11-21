import "./SubmissionComplete.css";

interface SubmissionCompleteProps {
  roleLabel: string;
  message?: string;
}

function SubmissionComplete({ roleLabel, message }: SubmissionCompleteProps) {
  return (
    <div className="submission-complete">
      <div className="submission-card">
        <div className="submission-icon">✓</div>
        <p className="submission-role">{roleLabel}</p>
        <h2>報告書を提出しました</h2>
        {message && <p className="submission-message">{message}</p>}
        <p className="submission-thanks">本日はお疲れ様でした。</p>
      </div>
    </div>
  );
}

export default SubmissionComplete;

