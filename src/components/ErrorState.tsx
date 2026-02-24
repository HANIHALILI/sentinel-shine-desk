import { ApiClientError } from '@/lib/api/client';
import { AlertTriangle, WifiOff, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  error: Error;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: Props) {
  let icon = <AlertTriangle className="w-8 h-8" />;
  let title = 'Something went wrong';
  let description = error.message;

  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        icon = <WifiOff className="w-8 h-8" />;
        title = 'Connection failed';
        description = 'Unable to reach the API server. Check your network connection.';
        break;
      case 'TIMEOUT':
        icon = <Clock className="w-8 h-8" />;
        title = 'Request timed out';
        description = 'The server took too long to respond. Try again.';
        break;
      default:
        if (error.status === 401 || error.status === 403) {
          icon = <ShieldAlert className="w-8 h-8" />;
          title = 'Access denied';
          description = 'You do not have permission to access this resource.';
        } else if (error.status === 404) {
          title = 'Not found';
          description = 'The requested resource could not be found.';
        }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-destructive mb-3">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}
