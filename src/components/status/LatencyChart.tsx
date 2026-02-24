import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MetricPoint } from '@/lib/api/types';
import { format } from 'date-fns';

interface Props {
  data: MetricPoint[];
  showP95?: boolean;
  showP99?: boolean;
  height?: number;
}

interface ChartPoint {
  time: number;
  latencyAvg: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  isGap: boolean;
}

export function LatencyChart({ data, showP95 = false, showP99 = false, height = 80 }: Props) {
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data || data.length === 0) return [];

    // For large datasets (1440 points), downsample for rendering
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(data.length / maxPoints));

    return data
      .filter((_, i) => i % step === 0)
      .map(p => ({
        time: new Date(p.timestamp).getTime(),
        latencyAvg: p.isGap ? null : p.latencyAvg,
        latencyP95: p.isGap ? null : p.latencyP95,
        latencyP99: p.isGap ? null : p.latencyP99,
        isGap: !!p.isGap,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">
        No metrics data available
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
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
              const d = payload[0].payload as ChartPoint;
              if (d.isGap) {
                return (
                  <div className="bg-popover border border-border rounded px-3 py-2 shadow-lg text-xs">
                    <div className="text-muted-foreground">{format(new Date(d.time), 'HH:mm')}</div>
                    <div className="text-destructive font-medium">No data (gap)</div>
                  </div>
                );
              }
              return (
                <div className="bg-popover border border-border rounded px-3 py-2 shadow-lg text-xs space-y-0.5">
                  <div className="text-muted-foreground">{format(new Date(d.time), 'HH:mm')}</div>
                  <div className="font-mono text-foreground">avg: {d.latencyAvg}ms</div>
                  {d.latencyP95 !== null && <div className="font-mono text-muted-foreground">p95: {d.latencyP95}ms</div>}
                  {d.latencyP99 !== null && <div className="font-mono text-muted-foreground">p99: {d.latencyP99}ms</div>}
                </div>
              );
            }}
          />
          {showP99 && (
            <Area
              type="monotone"
              dataKey="latencyP99"
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="none"
              dot={false}
              connectNulls={false}
            />
          )}
          {showP95 && (
            <Area
              type="monotone"
              dataKey="latencyP95"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="none"
              dot={false}
              connectNulls={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="latencyAvg"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={1.5}
            fill="url(#latencyGradient)"
            dot={false}
            activeDot={{ r: 3, fill: 'hsl(217, 91%, 60%)' }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
