import { useNavigate } from "react-router-dom";
import "./SelectPage.css";

function SelectPage() {
  const navigate = useNavigate();

  return (
    <div className="select-page">
      <div className="select-container">
        <h1>現場報告書システム</h1>
        <p className="subtitle">ページを選択してください</p>
        
        <div className="button-list">
          <button
            className="select-button chief-button"
            onClick={() => navigate("/chief")}
          >
            <div className="button-icon">👔</div>
            <div className="button-content">
              <div className="button-title">チーフ・リーダー専用ページ</div>
              <div className="button-description">チーフ・リーダーとして報告書を作成・確認</div>
            </div>
          </button>

          <button
            className="select-button staff-button"
            onClick={() => navigate("/staff")}
          >
            <div className="button-icon">👤</div>
            <div className="button-content">
              <div className="button-title">スタッフ・アクター専用ページ</div>
              <div className="button-description">スタッフ・アクターとして報告書を作成</div>
            </div>
          </button>

          <button
            className="select-button solo-button"
            onClick={() => navigate("/chief")}
          >
            <div className="button-icon">🏢</div>
            <div className="button-content">
              <div className="button-title">一人現場ページ</div>
              <div className="button-description">一人で現場作業を行う場合</div>
            </div>
          </button>

          <button
            className="select-button watch-button"
            onClick={() => navigate("/watchman")}
          >
            <div className="button-icon">🏠</div>
            <div className="button-content">
              <div className="button-title">留守番ページ</div>
              <div className="button-description">留守番業務の報告書を確認</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectPage;

