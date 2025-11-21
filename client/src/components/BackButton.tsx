import { useNavigate } from "react-router-dom";
import "./BackButton.css";

interface BackButtonProps {
  label?: string;
}

function BackButton({ label = "戻る" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button className="btn btn-secondary back-button" onClick={() => navigate(-1)}>
      ← {label}
    </button>
  );
}

export default BackButton;

