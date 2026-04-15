import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router"; 
// 1. ІМПОРТУЄМО КОМПОНЕНТИ МОДАЛЬНОГО ВІКНА (ТІ ШО З ФІГМИ/SHADCN)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { 
  Shield, Lock, Settings, User, ChevronDown, ChevronRight,
  LayoutDashboard, AlertTriangle, Server, Network, BarChart3,
  Briefcase, FileText, Users, LogOut, ChevronRightCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "../../context/LanguageContext";

// Типи ролей (залишаємо для логіки)
type Role = "CEO" | "CISO" | "PM";

// 2. ДАНІ ПЕРСОНАЖІВ ДЛЯ АКАУНТІВ
const USERS_DATA = {
  CEO: { 
    name: "Olena Vance", 
    title: "Chief Executive Officer", 
    role: "CEO" as Role,
    initial: "E", 
    color: "bg-indigo-500", 
    desc: "Strategic overview, full access to security & risk metrics."
  },
  CISO: { 
    name: "Dmitro Volhov", 
    title: "Chief Info. Security Officer", 
    role: "CISO" as Role,
    initial: "D", 
    color: "bg-purple-500", 
    desc: "Technical focus on threats, assets, and access control."
  },
  PM: { 
    name: "Chloe Dubois", 
    title: "Lead Risk Manager", 
    role: "PM" as Role,
    initial: "C", 
    color: "bg-emerald-500", 
    desc: "Compliance reporting, project analytics, and financial risks."
  }
};

export function Sidebar() {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>("CEO");
  
  // 3. СТАН ДЛЯ ВІДКРИТТЯ ВІКНА ЛОГІНУ (МОДАЛКИ)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const [isCyberOpen, setIsCyberOpen] = useState(true);
  const [isRiskOpen, setIsRiskOpen] = useState(true);

  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    // Якщо роль не встановлена, примусово відкриваємо логін при старті (опціонально для демо)
    const savedRole = localStorage.getItem("user-role") as Role;
    if (savedRole) {
      setRole(savedRole);
    } else {
      setTimeout(() => setIsLoginModalOpen(true), 500); 
    }
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("user-role", newRole);
    // Після вибору акаунта закриваємо вікно і редиректимо на головну для цієї ролі
    setIsLoginModalOpen(false);
    if (newRole === "PM") window.location.href = "/"; // Risk Dashboard
    if (newRole === "CISO") window.location.href = "/cybersecurity"; // Cyber Dashboard
    // CEO може залишитись де він є
  };

  const canAccessCyber = role === "CEO" || role === "CISO";
  const canAccessRisk = role === "CEO" || role === "PM";

  // Отримуємо дані поточного залогіненого юзера
  const currentUser = USERS_DATA[role];

  // Навігаційні списки (без змін)
  const cyberItems = [
    { name: t('sidebar.dashboard'), href: "/cybersecurity", icon: LayoutDashboard },
    { name: t('sidebar.threats'), href: "/cybersecurity/threats", icon: AlertTriangle },
    { name: t('sidebar.assets'), href: "/cybersecurity/assets", icon: Server },
    { name: "Access Control", href: "/cybersecurity/access", icon: Network },
    { name: "Security Analytics", href: "/cybersecurity/analytics", icon: BarChart3 },
  ];

  const riskItems = [
    { name: t('riskManagement.sidebarTitle', 'Risk Management'), href: "/", icon: LayoutDashboard },
    { name: t('sidebar.projects'), href: "/projects", icon: Briefcase },
    { name: t('sidebar.analytics'), href: "/analytics", icon: BarChart3 },
    { name: t('sidebar.reports'), href: "/reports", icon: FileText },
    { name: t('sidebar.team'), href: "/team", icon: Users },
  ];

  return (
    <>
      <div className="w-64 bg-card border-r border-border h-screen flex flex-col transition-colors z-10">
        
        {/* 4. ОНОВЛЕНИЙ ПРОФІЛЬ В САЙДБАРІ (ЯК КНОПКА ДЛЯ МОДАЛКИ) */}
        <div className="p-4 border-b border-border">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${currentUser.color}`}>
                {currentUser.initial}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-card-foreground leading-tight truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground font-medium truncate">{currentUser.title}</p>
              </div>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* 2. ГОЛОВНА НАВІГАЦІЯ (МОДУЛІ) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* --- CYBER DEFENSE MODULE --- */}
          <div>
            <button 
              onClick={() => setIsCyberOpen(!isCyberOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground tracking-wider mb-2 px-2"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                {t('sidebar.cyber_defense')}
              </div>
              {isCyberOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            
            {isCyberOpen && (
              <div className="space-y-1">
                {cyberItems.map((item) => {
                  const isActive = currentPath === item.href;
                  if (!canAccessCyber) {
                    return (
                      <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all opacity-50 cursor-not-allowed text-muted-foreground grayscale">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          {item.name}
                        </div>
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                      </div>
                    );
                  }
                  return (
                    <Link key={item.name} to={item.href} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}>
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- RISK & COMPLIANCE MODULE --- */}
          <div>
            <button 
              onClick={() => setIsRiskOpen(!isRiskOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground tracking-wider mb-2 px-2"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                {t('sidebar.risk_compliance')}
              </div>
              {isRiskOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            
            {isRiskOpen && (
              <div className="space-y-1">
                {riskItems.map((item) => {
                  const isActive = currentPath === item.href;
                  if (!canAccessRisk) {
                    return (
                      <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all opacity-50 cursor-not-allowed text-muted-foreground grayscale">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          {item.name}
                        </div>
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                      </div>
                    );
                  }
                  return (
                    <Link key={item.name} to={item.href} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}>
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ГЛОБАЛЬНІ НАЛАШТУВАННЯ (ВНИЗУ) */}
        <div className="p-4 border-t border-border">
          <Link to="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${currentPath === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'}`}>
            <Settings className={`w-4 h-4 ${currentPath === '/settings' ? 'text-primary animate-[spin_3s_linear_infinite]' : 'text-muted-foreground'}`} />
            {t('sidebar.settings')}
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. МОДАЛЬНЕ ВІКНО ЛОГІНУ / ВИБОРУ АКАУНТА (DEMO) */}
      {/* ========================================================= */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border border-border rounded-xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 bg-muted/30 border-b border-border">
            <DialogTitle className="text-xl font-bold text-popover-foreground flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              Welcome to Enterprise Guardian
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1.5">
              Select your profile to access the platform workspaces and metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {Object.values(USERS_DATA).map((u) => (
              <button 
                key={u.role}
                onClick={() => handleRoleChange(u.role)}
                className={`w-full p-4 rounded-lg border text-left flex items-start gap-4 transition-all hover:shadow-md hover:scale-[1.01] ${
                  role === u.role 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                    : 'border-border bg-background hover:bg-muted/40 hover:border-primary/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 mt-0.5 shadow-sm ${u.color}`}>
                  {u.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-popover-foreground">{u.name}</p>
                    <p className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      u.role === 'CEO' ? 'text-indigo-400 bg-indigo-500/10' : u.role === 'CISO' ? 'text-purple-400 bg-purple-500/10' : 'text-emerald-400 bg-emerald-500/10'
                    }`}>
                      {u.title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {u.desc}
                  </p>
                </div>
                <ChevronRightCircle className={`w-5 h-5 text-primary mt-4 ${role === u.role ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          
          <div className="p-4 bg-muted/20 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-mono">
            <span>Auth Mode: DEMO / SSO simulation</span>
            <span>v0.9.1</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}