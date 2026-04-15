import { useState, useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { RiskMatrix } from "../components/risk-matrix";
import { CriticalThreats } from "../components/critical-threats";
import { ExportModal } from "../components/export-modal";
import { NotificationsPopover } from "../components/notifications-popover";
import { Button } from "../components/ui/button";
import { FileDown, Search, RefreshCw, X } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

export default function RiskManagementDashboard() {
  const { t } = useTranslation();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSummary = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/risks/summary");
      const data = await response.json();
      setApiData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "light") document.documentElement.classList.remove("dark");
    else if (savedTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (!isDark) document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");
    } else document.documentElement.classList.add("dark"); 

    fetchSummary();
    const interval = setInterval(() => fetchSummary(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = lastUpdated.toLocaleTimeString();

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10">
          <div>
            <h1 className="text-card-foreground font-semibold">{t('riskManagement.title', 'Risk Management')}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.last_updated', 'Last updated')}: <span className="font-mono">{formattedTime}</span>
              </p>
              <button 
                onClick={() => fetchSummary(true)} disabled={isRefreshing}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('riskManagement.search_placeholder', 'Search risks')}
                className="pl-9 pr-8 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-background transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <NotificationsPopover apiData={apiData} />

            <Button onClick={() => setIsExportModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <FileDown className="w-4 h-4 mr-2" />
              {t('dashboard.export_reports', 'Export Reports')}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.total_risks', 'Total Risks')}</p>
                <p className="text-2xl font-bold text-card-foreground">{apiData ? apiData.total_risks : "..."}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.critical_threats', 'Critical Threats')}</p>
                <p className="text-2xl font-bold text-red-500">{apiData ? apiData.critical_threats : "..."}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.financial_exposure', 'Financial Exposure')}</p>
                <p className="text-2xl font-bold text-card-foreground">{apiData ? apiData.financial_exposure : "..."}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.mitigation_rate', 'Mitigation Rate')}</p>
                <p className="text-2xl font-bold text-card-foreground">{apiData ? `${apiData.mitigation_rate}%` : "..."}</p>
              </div>
            </div>

            <RiskMatrix searchQuery={searchQuery} />
            <CriticalThreats searchQuery={searchQuery} />
          </div>
        </main>
      </div>

      <ExportModal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} />
    </div>
  );
}
