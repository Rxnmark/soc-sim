export interface ReportData {
    apiData: {
        critical_threats: number;
        financial_exposure: string;
    };
    unprocessedCount: number;
    mitigationRate: number;
    categoryChartData: Array<{ name: string; value: number }>;
    financialImpactData: Array<{ name: string; impact: number }>;
    lastUpdated: Date;
}

export interface CalendarDay {
    date: Date;
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    hasReport: boolean;
}