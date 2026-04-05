import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LoginPage = () => {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error: loginError } = await login(email, password);

    if (loginError) {
      // Translate common Supabase errors to Portuguese
      if (loginError.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (loginError.includes('Email not confirmed')) {
        setError('Email ainda não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError(loginError);
      }
      setSubmitting(false);
    }
    // On success, the auth listener redirects automatically
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,11%)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text
              x="24"
              y="38"
              textAnchor="middle"
              fontFamily="'Arvo', serif"
              fontSize="42"
              fontWeight="400"
              fill="white"
            >
              m
            </text>
            <rect x="6" y="46" width="36" height="3" rx="1.5" fill="#D4A843" />
          </svg>
          <span
            className="mt-1 text-sm tracking-[0.2em] text-white"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}
          >
            monetali
          </span>
          <p className="text-[10px] text-gray-400 mt-2 tracking-wider uppercase">
            Controle de Inadimplência
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[hsl(222,47%,14%)] border border-[hsl(222,30%,22%)] rounded-xl p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-white text-center mb-6">Entrar</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-[hsl(222,47%,11%)] border-[hsl(222,30%,25%)] text-white placeholder:text-gray-500 focus:border-[#D4A843] focus:ring-[#D4A843]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-[hsl(222,47%,11%)] border-[hsl(222,30%,25%)] text-white placeholder:text-gray-500 focus:border-[#D4A843] focus:ring-[#D4A843]/20"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-[#D4A843] hover:bg-[#c49a3a] text-[hsl(222,47%,11%)] font-semibold"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(222,47%,11%)] border-t-transparent" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Monetali Recovery &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
