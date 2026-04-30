import { Card, CardContent } from "../components/ui/card";
import { X, AlertTriangle, Shield, TrendingUp, DollarSign } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { RiskMatrix } from "../components/risk-matrix";

interface ReportData {
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

interface ReportsPanelProps {
    report: ReportData;
    date: Date;
    onClose: () => void;
}

const COLORS = {
    ddos: "#ef4444",
    ransomware: "#f97316",
    stealth: "#a855f7",
    default: ["#22c55e", "#3b82f6", "#eab308", "#ec4899", "#06b6d4"],
};

function getCategoryColor(name: string, index: number): string {
    const lower = name.toLowerCase();
    if (lower.includes("ddos")) return COLORS.ddos;
    if (lower.includes("ransomware")) return COLORS.ransomware;
    if (lower.includes("stealth")) return COLORS.stealth;
    return COLORS.default[index % COLORS.default.length];
}

export function ReportsPanel({ report, date, onClose }: ReportsPanelProps) {
    const { t } = useTranslation();
    const formattedDate = date.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-card-foreground truncate">
                    {t("reports.report_for_date", "Report for ") + formattedDate}
                </h2>
                <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3 shrink-0">
                    <Card className="bg-card border-border">
                        <CardContent className="pt-3 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{t("reports.total_risks", "Всього ризиків")}</span>
                            </div>
                            <p className="text-lg font-bold text-card-foreground">{report.unprocessedCount}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="pt-3 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{t("reports.critical_threats", "Критичні загрози")}</span>
                            </div>
                            <p className="text-lg font-bold text-red-500">{report.apiData.critical_threats}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="pt-3 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{t("reports.mitigation_rate", "Рівень мінімізації")}</span>
                            </div>
                            <p className="text-lg font-bold text-green-500">{report.mitigationRate}%</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardContent className="pt-3 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-purple-500 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{t("reports.financial_exposure", "Фінансова вразливість")}</span>
                            </div>
                            <p className="text-lg font-bold text-card-foreground truncate">{report.apiData.financial_exposure}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                    {/* Category Distribution */}
                    <Card className="bg-card border-border flex flex-col min-h-0">
                        <CardContent className="pt-4 flex flex-col flex-1 min-h-0">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 shrink-0">{t("reports.category_distribution", "Розподіл за категоріями")}</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={report.categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {report.categoryChartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getCategoryColor(report.categoryChartData[index].name, index)} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Impact */}
                    <Card className="bg-card border-border flex flex-col min-h-0">
                        <CardContent className="pt-4 flex flex-col flex-1 min-h-0">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 shrink-0">{t("reports.financial_impact", "Фінансовий вплив за типами ризиків")}</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={report.financialImpactData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={10} />
                                        <YAxis stroke="#888" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                                            labelStyle={{ color: "#fff" }}
                                        />
                                        <Bar dataKey="impact" radius={[4, 4, 0, 0]}>
                                            {report.financialImpactData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getCategoryColor(report.financialImpactData[index].name, index)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Risk Matrix */}
                <RiskMatrix />
            </div>
        </div>
    );
}
