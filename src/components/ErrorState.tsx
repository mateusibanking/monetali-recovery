import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorState = ({ message = 'Ocorreu um erro ao carregar os dados.', onRetry }: ErrorStateProps) => (
  <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
      <AlertTriangle className="h-7 w-7 text-destructive" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </button>
    )}
  </div>
);

export default ErrorState;
