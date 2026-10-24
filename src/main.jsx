/**
 * App entry point: mounts React inside CrmProvider (the shared CRM data store).
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { CrmProvider } from "./context/CrmContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrmProvider>
      <App />
    </CrmProvider>
  </React.StrictMode>
);
