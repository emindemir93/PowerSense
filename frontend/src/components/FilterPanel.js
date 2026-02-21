import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { useTranslation } from '../i18n';

const OPERATORS = [
  { value: 'equals', key: 'equals' },
  { value: 'not_equals', key: 'notEquals' },
  { value: 'contains', key: 'contains' },
  { value: 'greater_than', key: 'greaterThan' },
  { value: 'less_than', key: 'lessThan' },
];

export default function FilterPanel({ show, onClose }) {
  const { t } = useTranslation();
  const globalFilters = useDashboardStore((s) => s.globalFilters);
  const addGlobalFilter = useDashboardStore((s) => s.addGlobalFilter);
  const removeGlobalFilter = useDashboardStore((s) => s.removeGlobalFilter);
  const clearGlobalFilters = useDashboardStore((s) => s.clearGlobalFilters);

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const [selectedSource, setSelectedSource] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('equals');
  const [filterValue, setFilterValue] = useState('');

  const sources = useMemo(() => (schema ? Object.keys(schema) : []), [schema]);

  const fields = useMemo(() => {
    if (!schema || !selectedSource || !schema[selectedSource]) return [];
    const src = schema[selectedSource];
    return src.dimensions || src.columns || [];
  }, [schema, selectedSource]);

  const handleAdd = () => {
    if (!selectedSource || !selectedField || !filterValue.trim()) return;
    addGlobalFilter({
      field: selectedField,
      operator: selectedOperator,
      value: filterValue.trim(),
      type: selectedSource,
    });
    setFilterValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const operatorLabel = (op) => {
    const found = OPERATORS.find((o) => o.value === op);
    return found ? t(`builder.${found.key}`) : op;
  };

  return (
    <div style={{
      position: 'fixed', right: show ? 0 : -380, top: 0, bottom: 0, width: 380,
      background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
      transition: 'right 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>
          {t('builder.filterPanel')}
          {globalFilters.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '2px 7px' }}>
              {globalFilters.length}
            </span>
          )}
        </h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Add Filter Form */}
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('builder.addFilter')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select
            value={selectedSource}
            onChange={(e) => { setSelectedSource(e.target.value); setSelectedField(''); }}
            style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }}
          >
            <option value="">{t('builder.filterSource')}...</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            disabled={!selectedSource}
            style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }}
          >
            <option value="">{t('builder.filterField')}...</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12 }}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{t(`builder.${op.key}`)}</option>
            ))}
          </select>

          <input
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('builder.filterValue')}
            style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }}
          />

          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={!selectedSource || !selectedField || !filterValue.trim()}
            style={{ width: '100%' }}
          >
            {t('builder.addFilter')}
          </button>
        </div>
      </div>

      {/* Active Filters */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{t('builder.activeFilters')}</div>

        {globalFilters.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
            {t('builder.noFilters')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {globalFilters.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-tertiary)', borderRadius: 6, padding: '8px 10px',
                borderLeft: '3px solid var(--accent)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{f.type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 600 }}>{f.field}</span>
                    {' '}
                    <span style={{ color: 'var(--accent)' }}>{operatorLabel(f.operator)}</span>
                    {' '}
                    <span>{f.value}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeGlobalFilter(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {globalFilters.length > 0 && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={clearGlobalFilters}
            style={{ width: '100%' }}
          >
            {t('common.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}
