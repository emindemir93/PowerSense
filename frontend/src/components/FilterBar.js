import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';

export default function FilterBar() {
  const crossFilters = useDashboardStore((s) => s.crossFilters);
  const removeCrossFilter = useDashboardStore((s) => s.removeCrossFilter);
  const clearCrossFilters = useDashboardStore((s) => s.clearCrossFilters);

  if (crossFilters.length === 0) return null;

  return (
    <div className="filter-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      {crossFilters.map((filter, i) => (
        <div key={i} className="filter-chip">
          <span>{filter.field}: {String(filter.value)}</span>
          <span className="filter-chip-remove" onClick={() => removeCrossFilter(i)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 12, height: 12 }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        </div>
      ))}
      <button
        className="btn btn-ghost btn-sm"
        onClick={clearCrossFilters}
        style={{ fontSize: 11 }}
      >
        Clear All
      </button>
    </div>
  );
}
