import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import App from "./App.js";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/majiang">
      <Routes>
        <Route path="/*" element={<App />} />
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  </StrictMode>,
);
