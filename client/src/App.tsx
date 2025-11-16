import { Routes, Route } from "react-router-dom";
import MasterPage from "./pages/MasterPage";
import StaffPage from "./pages/StaffPage";
import ChiefPage from "./pages/ChiefPage";
import SalesPage from "./pages/SalesPage";
import AccountingPage from "./pages/AccountingPage";
import ReportManagementPage from "./pages/ReportManagementPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<StaffPage />} />
      <Route path="/staff" element={<StaffPage />} />
      <Route path="/chief" element={<ChiefPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route path="/accounting" element={<AccountingPage />} />
      <Route path="/admin/reports" element={<ReportManagementPage />} />
      <Route path="/admin/master" element={<MasterPage />} />
    </Routes>
  );
}

export default App;

