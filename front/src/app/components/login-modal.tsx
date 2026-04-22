import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Shield, ChevronRightCircle } from "lucide-react";
import { USERS_DATA, type Role } from "./sidebar-data";

interface LoginModalProps {
  role: Role;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  handleRoleChange: (role: Role) => void;
}

export function LoginModal({ role, isLoginModalOpen, setIsLoginModalOpen, handleRoleChange }: LoginModalProps) {
  return (
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
  );
}