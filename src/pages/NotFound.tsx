import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center card-industrial">
        <CardHeader className="pb-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-lg text-muted-foreground">
            Página não encontrada
          </p>
          <p className="text-sm text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <div className="flex flex-col gap-2 pt-4">
            <Button asChild className="w-full">
              <Link to="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Voltar ao Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
