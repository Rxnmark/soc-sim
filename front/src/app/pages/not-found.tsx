import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="size-full flex items-center justify-center bg-background">
      <Card className="p-12 bg-card border-border text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">404</span>
        </div>
        <h2 className="text-card-foreground mb-3">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </Card>
    </div>
  );
}
