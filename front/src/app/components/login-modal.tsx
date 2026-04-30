import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Shield, Lock, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, role: string, username: string) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  // Phase: "credentials" | "2fa" | "error"
  const [phase, setPhase] = useState<"credentials" | "2fa">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.role, username);
      } else if (data.require_2fa) {
        setPendingUsername(username);
        setPhase("2fa");
      } else {
        setError(data.detail || "Invalid credentials");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/verify-2fa-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: pendingUsername, code: otpCode }),
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.role, pendingUsername);
      } else {
        setError(data.detail || "Invalid 2FA code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setOtpCode("");
    setError("");
    setPhase("credentials");
    setPendingUsername("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] bg-popover border border-border rounded-xl p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 bg-muted/30 border-b border-border">
          <DialogTitle className="text-xl font-bold text-popover-foreground flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            Enterprise Guardian Auth
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1.5">
            {phase === "credentials" ? "Enter your credentials to access the platform." : "Enter the 6-digit code from your authenticator app."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {phase === "credentials" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ceo"
                    className="pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Login
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handle2FAVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium">2FA Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] h-14"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPhase("credentials")}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="p-4 bg-muted/20 border-t border-border flex justify-between items-center text-xs text-muted-foreground font-mono">
          <span>Auth Mode: JWT + TOTP</span>
          <span>v1.0.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}