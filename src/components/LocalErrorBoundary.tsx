import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
  boundaryName?: string;
}

export function LocalErrorBoundary({ error, reset, boundaryName = "local" }: ErrorBoundaryProps) {
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: boundaryName });
  }, [error, boundaryName]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-destructive/20 bg-destructive/5 animate-in fade-in zoom-in duration-300">
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
        {error.message || "Ocorreu um problema inesperado. Tente novamente mais tarde."}
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="gap-2"
      >
        <RefreshCcw className="h-4 w-4" />
        Tentar Novamente
      </Button>
    </div>
  );
}
