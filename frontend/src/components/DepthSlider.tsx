import React from 'react';
import { FORMATIONS, getFormationForDepth } from '../services/nwisData';

interface DepthSliderProps {
  maxDepth: number;
  currentDepth: number;
  setCurrentDepth: (depth: number) => void;
}

export const DepthSlider: React.FC<DepthSliderProps> = ({
  maxDepth,
  currentDepth,
  setCurrentDepth
}) => {
  const currentFm = getFormationForDepth(currentDepth);

  const stepDepth = (delta: number) => {
    setCurrentDepth(Math.max(0, Math.min(maxDepth, currentDepth + delta)));
  };

  const getPercent = (d: number) => `${(d / maxDepth) * 100}%`;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="label-tag text-muted-foreground">Depth</div>
        <div className="text-[10px] text-muted-foreground">
          Drag to explore depth · {currentFm.name}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end pr-3 border-r border-border shrink-0">
          <span className="label-tag text-muted-foreground">Current Depth</span>
          <span className="font-mono-nums text-2xl font-bold text-primary leading-none">
            {currentDepth.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground">m MD</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative h-3 rounded overflow-hidden border border-border">
            {FORMATIONS.filter(f => f.top < maxDepth).map(f => {
              const top = Math.max(f.top, 0);
              const bottom = Math.min(f.bottom, maxDepth);
              return (
                <div
                  key={f.name}
                  className="absolute top-0 h-full"
                  style={{
                    left: getPercent(top),
                    width: `calc(${getPercent(bottom)} - ${getPercent(top)})`,
                    background: `${f.color}66`
                  }}
                  title={`${f.name} (${f.top}–${f.bottom}m)`}
                />
              );
            })}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary"
              style={{ left: getPercent(currentDepth) }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={maxDepth}
            step={5}
            value={currentDepth}
            onChange={e => setCurrentDepth(Number(e.target.value))}
            className="nwis-range w-full mt-2 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-muted-foreground font-mono-nums">
            <span>0 m</span>
            <span>{maxDepth.toLocaleString()} m</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => stepDepth(-50)}
              className="h-8 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs font-mono-nums cursor-pointer"
            >
              -50
            </button>
            <button
              onClick={() => stepDepth(-10)}
              className="h-8 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs font-mono-nums cursor-pointer"
            >
              -10
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => stepDepth(10)}
              className="h-8 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs font-mono-nums cursor-pointer"
            >
              +10
            </button>
            <button
              onClick={() => stepDepth(50)}
              className="h-8 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs font-mono-nums cursor-pointer"
            >
              +50
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
