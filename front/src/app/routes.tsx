import { createBrowserRouter } from "react-router";
import RiskManagementDashboard from "./pages/risk-management";
import CybersecurityDashboard from "./pages/cybersecurity";
import AnalyticsPage from "./pages/analytics";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";
import CyberThreatsPage from "./pages/cyber-threats";
import CyberAssetsPage from "./pages/cyber-assets";
import CyberAnalyticsPage from "./pages/cyber-analytics";
import NotFoundPage from "./pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RiskManagementDashboard,
  },
  {
    path: "/analytics",
    Component: AnalyticsPage,
  },
  {
    path: "/reports",
    Component: ReportsPage,
  },
  {
    path: "/settings",
    Component: SettingsPage,
  },
  {
    path: "/cybersecurity",
    Component: CybersecurityDashboard,
  },
  {
    path: "/cybersecurity/threats",
    Component: CyberThreatsPage,
  },
  {
    path: "/cybersecurity/assets",
    Component: CyberAssetsPage,
  },
  {
    path: "/cybersecurity/analytics",
    Component: CyberAnalyticsPage,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);
