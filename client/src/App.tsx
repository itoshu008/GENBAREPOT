import { Routes, Route } from "react-router-dom";
import MasterPage from "./pages/MasterPage";

function App() {
  return (
    <Routes>
      <Route path="/admin/master" element={<MasterPage />} />
      <Route path="/" element={<MasterPage />} />
    </Routes>
  );
}

export default App;

