import React from 'react';
import type { TelemetryPoint } from '../types/nwis';

interface TelemetryCardProps {
  data: TelemetryPoint[];
  field: keyof Omit<TelemetryPoint, 'depth'>;
  label: string;
  unit: string;
  color: string;
  reference?: number;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  data,
  field,
  label,
  unit,
  color,
  reference
}) => {
  const values = data.map(d => Number(d[field]) || 0);
  const currentVal = values.length ? values[values.length - 1] : null;

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 100;
  const range = max - min || 1;

  // Build SVG sparkline path
  const width = 240;
  const height = 48;
  const paddingY = 4;

  const points = values.map((val, idx) => {
    const x = values.length > 1 ? (idx / (values.length - 1)) * width : width / 2;
    const y = height - paddingY - ((val - min) / range) * (height - paddingY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = points.length > 1 ? `M ${points.join(' L ')}` : '';

  const refY =
    reference != null && reference >= min && reference <= max
      ? height - paddingY - ((reference - min) / range) * (height - paddingY * 2)
      : null;

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="label-tag text-muted-foreground">{label}</span>
        <span className="font-mono-nums text-sm font-bold" style={{ color }}>
          {currentVal != null ? currentVal.toFixed(1) : '—'}
          <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
        </span>
      </div>

      <div className="h-16 w-full flex items-center justify-center overflow-hidden">
        {values.length < 2 ? (
          <div className="text-[10px] text-muted-foreground">Awaiting telemetry...</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {refY != null && (
              <line
                x1={0}
                y1={refY}
                x2={width}
                y2={refY}
                stroke="hsl(var(--critical))"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}
            <path d={pathD} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
