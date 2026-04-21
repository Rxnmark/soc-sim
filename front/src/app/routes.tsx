import { createBrowserRouter } from "react-router";
import RiskManagementDashboard from "./pages/risk-management";
import CybersecurityDashboard from "./pages/cybersecurity";
import RiskAnalysisPage from "./pages/risk-analysis";
import ProjectsPage from "./pages/projects";
import AnalyticsPage from "./pages/analytics";
import ReportsPage from "./pages/reports";
import TeamPage from "./pages/team";
import SettingsPage from "./pages/settings";
import CyberThreatsPage from "./pages/cyber-threats";
import CyberAssetsPage from "./pages/cyber-assets";
import CyberAccessPage from "./pages/cyber-access";
import CyberDataPage from "./pages/cyber-data";
import CyberAnalyticsPage from "./pages/cyber-analytics";
import NotFoundPage from "./pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RiskManagementDashboard,
  },
  {
    path: "/risk-analysis",
    Component: RiskAnalysisPage,
  },
  {
    path: "/projects",
    Component: ProjectsPage,
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
    path: "/team",
    Component: TeamPage,
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
    path: "/cybersecurity/access",
    Component: CyberAccessPage,
  },
  {
    path: "/cybersecurity/data",
    Component: CyberDataPage,
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
