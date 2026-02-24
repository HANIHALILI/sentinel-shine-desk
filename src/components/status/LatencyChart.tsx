import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LatencyPoint } from '@/lib/types';
import { format } from 'date-fns';

interface Props {
  data: LatencyPoint[];
}

export function LatencyChart({ data }: Props) {
  // Downsample to ~120 points for display
  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 120));
    return data
      .filter((_, i) => i % step === 0)
      .map(p => ({
        time: new Date(p.timestamp).getTime(),
        latency: p.latency,
        status: p.status,
      }));
  }, [data]);

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded px-3 py-2 shadow-lg text-xs">
                  <div className="font-mono text-foreground">{d.latency}ms</div>
                  <div className="text-muted-foreground">{format(new Date(d.time), 'HH:mm')}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={1.5}
            fill="url(#latencyGradient)"
            dot={false}
            activeDot={{ r: 3, fill: 'hsl(217, 91%, 60%)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
