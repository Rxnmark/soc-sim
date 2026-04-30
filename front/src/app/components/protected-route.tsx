import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Role } from "./sidebar-data";
import { LoginModal } from "./login-modal";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: Role[];
}

function decodeJwt(token: string): { sub?: string; role?: string; exp?: number } {
    try {
        const base64 = token.split(".")[1];
        const json = atob(base64);
        return JSON.parse(json);
    } catch {
        return {};
    }
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("auth-token");
        if (!token) {
            setShowLogin(true);
            return;
        }

        const payload = decodeJwt(token);
        if (payload.exp && payload.exp < Date.now() / 1000) {
            localStorage.removeItem("auth-token");
            setShowLogin(true);
            return;
        }

        const role = payload.role as Role | undefined;
        if (!role || !allowedRoles.includes(role)) {
            // Role not allowed — redirect to default page
            navigate(role === "PM" ? "/" : "/cybersecurity", { replace: true });
            return;
        }

        setIsAuthenticated(true);
        setHasAccess(true);
    }, [navigate, location.pathname, allowedRoles]);

    const handleLoginSuccess = (_token: string, _role: string, _user: string) => {
        // After login, re-check access
        const token = localStorage.getItem("auth-token");
        if (token) {
            const payload = decodeJwt(token);
            const role = payload.role as Role;
            if (allowedRoles.includes(role)) {
                setShowLogin(false);
                setIsAuthenticated(true);
                setHasAccess(true);
            }
        }
    };

    if (showLogin) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <LoginModal
                    isOpen={showLogin}
                    onClose={() => { }}
                    onLoginSuccess={handleLoginSuccess}
                />
            </div>
        );
    }

    if (!hasAccess) {
        return null;
    }

    return <>{children}</>;
}