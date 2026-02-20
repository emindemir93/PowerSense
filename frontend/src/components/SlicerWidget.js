import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useTranslation } from '../i18n';

export default function SlicerWidget({ widget }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const crossFilters = useDashboardStore((s) => s.crossFilters);
  const toggleCrossFilter = useDashboardStore((s) => s.toggleCrossFilter);

  const source = widget.data_config?.source;
  const field = widget.data_config?.slicerField;
  const multiSelect = widget.visual_config?.multiSelect !== false;

  const { data: values, isLoading } = useQuery({
    queryKey: ['slicer-values', source, field],
    queryFn: () => queryApi.filterValues(source, field).then((r) => r.data.data),
    enabled: !!source && !!field,
    staleTime: 60000,
  });

  const activeValues = useMemo(() => {
    return crossFilters
      .filter((f) => f.source === source && f.field === field)
      .map((f) => f.value);
  }, [crossFilters, source, field]);

  const filteredValues = useMemo(() => {
    if (!values) return [];
    if (!search.trim()) return values;
    const q = search.toLowerCase();
    return values.filter((v) => String(v).toLowerCase().includes(q));
  }, [values, search]);

  const handleToggle = (value) => {
    toggleCrossFilter({
      widgetId: widget.id,
      source,
      field,
      value,
    });
  };

  const clearAll = () => {
    activeValues.forEach((v) => {
      toggleCrossFilter({ widgetId: widget.id, source, field, value: v });
    });
  };

  if (isLoading) return <div className="loading-spinner" />;
  if (!source || !field) {
    return <div className="empty-state" style={{ padding: 12 }}><p style={{ fontSize: 12 }}>{t('slicer.configure')}</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder={t('slicer.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 26, fontSize: 11, flex: 1 }}
        />
        {activeValues.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ fontSize: 10, padding: '2px 6px', whiteSpace: 'nowrap' }}>
            {t('slicer.clear')}
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {filteredValues.map((val) => {
          const isActive = activeValues.includes(val);
          return (
            <div
              key={val}
              onClick={() => handleToggle(val)}
              style={{
                padding: '5px 10px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: isActive ? 'none' : '1.5px solid var(--border)',
                background: isActive ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isActive && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{ width: 10, height: 10 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              {String(val)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
