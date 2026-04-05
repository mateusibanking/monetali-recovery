import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Nenhum dado encontrado',
  description = 'Ainda não há registros para exibir.',
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
    <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
