import { useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { RiskMatrix } from "../components/risk-matrix";
import { CriticalThreats } from "../components/critical-threats";
import { ExportModal } from "../components/export-modal";
import { NotificationsPopover } from "../components/notifications-popover";
import { Button } from "../components/ui/button";
import { FileDown, Search, RefreshCw, X } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import { useRiskData, useBusinessRisks } from "./risk-management-hooks";
import { RiskCategoryDonut, RiskFinancialBar } from "./risk-management-charts";

export default function RiskManagementDashboard() {
  const { t } = useTranslation();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    apiData, lastUpdated, isRefreshing,
    fetchSummary, fetchLogs, fetchArchived,
    unprocessedCount, mitigationRate,
  } = useRiskData();
  const { categoryChartData, financialImpactData } = useBusinessRisks();

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10">
          <div>
            <h1 className="text-card-foreground font-semibold">{t('riskManagement.title', 'Risk Management')}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.last_updated', 'Last updated')}: <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
              </p>
              <button
                onClick={() => { fetchSummary(true); fetchLogs(); fetchArchived(); }}
                disabled={isRefreshing}
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

            <Button onClick={() => setIsExportModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <FileDown className="w-4 h-4 mr-2" />
              {t('dashboard.export_reports', 'Export Reports')}
            </Button>

            <NotificationsPopover apiData={apiData} displayedLogsCount={unprocessedCount} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.total_risks', 'Total Risks')}</p>
                <p className="text-2xl font-bold text-card-foreground">{unprocessedCount}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.critical_threats', 'Critical Threats')}</p>
                <p className="text-2xl font-bold text-red-500">{apiData?.critical_threats ?? "..."}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.financial_exposure', 'Financial Exposure')}</p>
                <p className="text-2xl font-bold text-card-foreground">{apiData?.financial_exposure ?? "..."}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{t('dashboard.mitigation_rate', 'Mitigation Rate')}</p>
                <p className="text-2xl font-bold text-card-foreground">{mitigationRate}%</p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${mitigationRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <RiskMatrix searchQuery={searchQuery} />

              <div className="grid grid-cols-1 gap-6">
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Risk Distribution by Category</h3>
                  <RiskCategoryDonut data={categoryChartData} />
                </div>

                <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Financial Impact by Risk</h3>
                  <RiskFinancialBar data={financialImpactData} />
                </div>
              </div>
            </div>

            <CriticalThreats searchQuery={searchQuery} />
          </div>
        </main>
      </div>

      <ExportModal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} />
    </div>
  );
}