import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';

export default function FilterBar() {
  const crossFilters = useDashboardStore((s) => s.crossFilters);
  const removeCrossFilter = useDashboardStore((s) => s.removeCrossFilter);
  const clearCrossFilters = useDashboardStore((s) => s.clearCrossFilters);
  const dateRange = useDashboardStore((s) => s.dateRange);
  const setDateRange = useDashboardStore((s) => s.setDateRange);

  const hasFilters = crossFilters.length > 0;
  const hasDateRange = dateRange.from || dateRange.to;

  return (
    <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderBottom: '1px solid var(--border)', minHeight: 40, flexWrap: 'wrap' }}>
      {/* Date Range Picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          type="date"
          className="form-input"
          value={dateRange.from || ''}
          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          style={{ height: 26, fontSize: 11, width: 130, padding: '2px 6px' }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
        <input
          type="date"
          className="form-input"
          value={dateRange.to || ''}
          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          style={{ height: 26, fontSize: 11, width: 130, padding: '2px 6px' }}
        />
        {hasDateRange && (
          <button className="btn btn-ghost btn-sm" onClick={() => setDateRange({ from: '', to: '' })} style={{ fontSize: 10, padding: '2px 6px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Divider */}
      {hasFilters && <div style={{ width: 1, height: 20, background: 'var(--border)' }} />}

      {/* Cross Filters */}
      {hasFilters && (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {crossFilters.map((filter, i) => (
            <div key={i} className="filter-chip">
              <span style={{ fontSize: 11 }}>{filter.field}: {String(filter.value)}</span>
              <span className="filter-chip-remove" onClick={() => removeCrossFilter(i)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 10, height: 10 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={clearCrossFilters} style={{ fontSize: 10, padding: '2px 8px' }}>Clear All</button>
        </>
      )}
    </div>
  );
}
