/**
 * Root component: renders AppRoutes. Providers are set up in main.jsx.
 *
 * Every screen is wired in routes/AppRoutes.jsx.
 *
 * Used by: main.jsx
 */

import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return <AppRoutes />;
}
