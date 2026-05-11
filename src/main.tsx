import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./app/App.tsx";
import PatientView from "./app/components/PatientView.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/p/:practiceId" element={<PatientView />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);