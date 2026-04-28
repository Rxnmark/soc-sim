import { useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { RiskMatrix } from "../components/risk-matrix";
import { ExportModal } from "../components/export-modal";
import { NotificationsPopover } from "../components/notifications-popover";
import { Button } from "../components/ui/button";
import { FileDown } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import { useRiskData, useBusinessRisks } from "./risk-management-hooks";
import { RiskCategoryDonut, RiskFinancialBar } from "./risk-management-charts";

export default function RiskManagementDashboard() {
  const { t } = useTranslation();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t('riskManagement.title', 'Risk Management')}</h1>
              <p className="text-xs text-muted-foreground">{t('riskManagement.subtitle', 'Risk assessment and mitigation tracking')}</p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('riskManagement.last_updated', 'Last updated')}: <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setIsExportModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <FileDown className="w-4 h-4 mr-2" />
              {t('dashboard.export_reports', 'Export Reports')}
            </Button>

            <NotificationsPopover apiData={apiData} displayedLogsCount={unprocessedCount} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-6 h-full">
            <div className="grid grid-cols-4 gap-4 shrink-0">
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

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              <div className="flex flex-col min-h-0">
                <RiskMatrix />
              </div>

              <div className="grid grid-rows-2 gap-6 min-h-0">
                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex flex-col">
                  <h3 className="text-sm font-semibold text-card-foreground mb-2 shrink-0">{t('riskManagement.category_distribution', 'Risk Distribution by Category')}</h3>
                  <div className="flex-1 min-h-0">
                    <RiskCategoryDonut data={categoryChartData} />
                  </div>
                </div>

                <div className="p-6 bg-card border border-border rounded-lg shadow-sm flex flex-col">
                  <h3 className="text-sm font-semibold text-card-foreground mb-2 shrink-0">{t('riskManagement.financial_impact', 'Financial Impact by Risk')}</h3>
                  <div className="flex-1 min-h-0">
                    <RiskFinancialBar data={financialImpactData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ExportModal 
        open={isExportModalOpen} 
        onOpenChange={setIsExportModalOpen} 
        reportData={{
          apiData,
          unprocessedCount,
          mitigationRate,
          categoryChartData,
          financialImpactData,
          lastUpdated
        }}
      />
    </div>
  );
}