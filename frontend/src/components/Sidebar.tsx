import React from 'react';
import { LayoutDashboard, Layers, History, AlertTriangle, Activity } from 'lucide-react';
import { useNwis } from '../context/NwisContext';

export const WORKSPACE_TABS = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'subsurface' as const, label: 'Subsurface', icon: Layers },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'risk' as const, label: 'Risk', icon: AlertTriangle },
  { id: 'drill' as const, label: 'Drill', icon: Activity }
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, proposedWell } = useNwis();

  return (
    <nav className="w-16 lg:w-44 shrink-0 border-r border-border bg-card flex flex-col py-3 select-none">
      <div className="label-tag text-muted-foreground px-4 mb-2 hidden lg:block">Workspace</div>
      <div className="space-y-1">
        {WORKSPACE_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mx-2 my-0.5 h-11 w-[calc(100%-1rem)] rounded-md flex items-center gap-3 px-3 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-3 hidden lg:block">
        <div className="panel-inset p-2.5 text-[10px] text-muted-foreground leading-relaxed">
          Contextual to <span className="font-semibold text-foreground">{proposedWell?.name || 'P-01'}</span>. All nearby-well, subsurface & risk data updates with depth and radius.
        </div>
      </div>
    </nav>
  );
};
