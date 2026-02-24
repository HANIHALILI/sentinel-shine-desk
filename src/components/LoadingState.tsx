import { Loader2 } from 'lucide-react';

interface Props {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-3" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingState />
    </div>
  );
}
