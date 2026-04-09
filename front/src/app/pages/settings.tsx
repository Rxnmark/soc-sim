import { useEffect, useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Moon, Sun, Monitor, Paintbrush, Bell, Shield, User } from "lucide-react";

export default function Settings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");

  // Завантажуємо збережену тему при відкритті сторінки
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark"); // За замовчуванням темна
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("app-theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="size-full flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center px-6">
          <div>
            <h1 className="text-card-foreground font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your application preferences and appearance</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Appearance Settings */}
            <Card className="p-6 bg-card border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Paintbrush className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Customize how the dashboard looks on your device.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Theme Preference</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'light' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="font-semibold">Light</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="font-semibold">Dark</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'system' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("system")}
                    >
                      <Monitor className="w-6 h-6" />
                      <span className="font-semibold">System</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Placeholder for future settings */}
            <div className="grid grid-cols-2 gap-6 opacity-60">
              <Card className="p-6 bg-card border-border shadow-sm pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">Notifications</h2>
                </div>
                <p className="text-sm text-muted-foreground">Notification preferences will be available soon.</p>
              </Card>

              <Card className="p-6 bg-card border-border shadow-sm pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">Account Profile</h2>
                </div>
                <p className="text-sm text-muted-foreground">User management features are under development.</p>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}