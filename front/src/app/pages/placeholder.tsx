import { useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { useNavigate } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="size-full flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <h1 className="text-card-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto">
            <Card className="p-12 bg-card border-border text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🚧</span>
                </div>
                <h2 className="text-card-foreground mb-3">Page Under Construction</h2>
                <p className="text-muted-foreground mb-8">
                  This page is currently under development. Please check back later.
                </p>
                <Button onClick={() => navigate(-1)} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
