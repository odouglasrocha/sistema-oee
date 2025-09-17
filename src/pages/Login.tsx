import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Factory, BarChart3, Settings, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading, error: authError } = useAuth();
  const { toast } = useToast();

  // Usar erro do contexto se disponível
  const displayError = error || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações básicas
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, insira um email válido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      await login(email, password, rememberMe);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao sistema OEE Monitor.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      
      // Toast para erros específicos
      if (errorMessage.includes('bloqueada')) {
        toast({
          title: "Conta bloqueada",
          description: "Sua conta foi temporariamente bloqueada devido a múltiplas tentativas de login.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('inativa')) {
        toast({
          title: "Conta inativa",
          description: "Sua conta está inativa. Entre em contato com o administrador.",
          variant: "destructive",
        });
      }
    }
  };



  return (
    <div className="min-h-screen bg-gradient-surface flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-primary via-primary-light to-primary-dark p-12">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/20">
            <Factory className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            OEE Monitor
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Sistema Inteligente de Monitoramento Industrial
          </p>
          <div className="grid grid-cols-1 gap-4 text-primary-foreground/80">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <span>Análise em Tempo Real</span>
            </div>
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span>IA Preditiva Avançada</span>
            </div>
            <div className="flex items-center gap-3">
              <Factory className="w-5 h-5" />
              <span>Controle Total da Produção</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Factory className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">OEE Monitor</h1>
          </div>

          <Card className="card-industrial shadow-industrial">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Lembrar de mim
                  </Label>
                </div>

                {displayError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{displayError}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-primary-foreground hover:shadow-lg transition-all duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>


            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;