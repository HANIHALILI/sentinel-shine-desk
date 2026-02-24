import { useSearchParams } from 'react-router-dom';
import { env } from '@/lib/env';

/**
 * Detect embed mode via query param ?embed=true or env var.
 */
export function useEmbed(): boolean {
  const [params] = useSearchParams();
  return params.get('embed') === 'true' || env.EMBED_MODE;
}
