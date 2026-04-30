import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Settings, LogOut, ChevronDown, ChevronRight, Shield, Lock, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "../../context/LanguageContext";
import { USERS_DATA, type Role, type NavItem, CYBER_NAV_ITEMS, RISK_NAV_ITEMS } from "./sidebar-data";
import { LoginModal } from "./login-modal";

function decodeJwt(token: string): { sub?: string; role?: string; exp?: number } {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function Sidebar() {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCyberOpen, setIsCyberOpen] = useState(true);
  const [isRiskOpen, setIsRiskOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // On mount, check for valid JWT token
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      const payload = decodeJwt(token);
      if (payload.exp && payload.exp > Date.now() / 1000 && payload.role) {
        setRole(payload.role as Role);
        setUsername(payload.sub || "");
        return;
      }
    }
    // No valid token — show login modal
    setTimeout(() => setIsLoginModalOpen(true), 500);
  }, []);

  const handleLoginSuccess = useCallback((token: string, userRole: string, userName: string) => {
    localStorage.setItem("auth-token", token);
    setRole(userRole as Role);
    setUsername(userName);
    setIsLoginModalOpen(false);

    // Redirect based on role
    if (userRole === "PM") navigate("/");
    else if (userRole === "CISO") navigate("/cybersecurity");
    else navigate("/");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth-token");
    setRole(null);
    setUsername("");
    navigate("/");
  }, [navigate]);

  const canAccessCyber = role === "CEO" || role === "CISO";
  const canAccessRisk = role === "CEO" || role === "PM";
  const currentUser = role ? USERS_DATA[role] : null;

  const cyberItems: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> =
    CYBER_NAV_ITEMS.map(item => ({ name: t(item.translationKey), href: item.href, icon: item.icon }));
  const riskItems: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> =
    RISK_NAV_ITEMS.map(item => ({ name: t(item.translationKey), href: item.href, icon: item.icon }));

  return (
    <>
      <div className="w-64 bg-card border-r border-border h-screen flex flex-col transition-colors z-10">
        <div className="p-4 border-b border-border">
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${currentUser.color}`}>
                  {currentUser.initial}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-card-foreground leading-tight truncate">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground font-medium truncate">{currentUser.title}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs">Logout</span>
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground text-sm"
            >
              <Shield className="w-4 h-4" />
              Login
            </button>
          )}
        </div>

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
                {cyberItems.map((item: NavItem) => {
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
                {riskItems.map((item: NavItem) => {
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

        <div className="p-4 border-t border-border">
          <Link to="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${currentPath === '/settings' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'}`}>
            <Settings className={`w-4 h-4 ${currentPath === '/settings' ? 'text-primary animate-[spin_3s_linear_infinite]' : 'text-muted-foreground'}`} />
            {t('sidebar.settings')}
          </Link>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}