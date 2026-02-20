import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi, savedQueriesApi, sqlApi } from '../services/api';
import { formatAxisValue } from '../utils/helpers';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n';

export default function DataExplorerPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canUseSql = user?.role === 'admin' || user?.role === 'analyst';

  const [mode, setMode] = useState('visual'); // 'visual' | 'sql'
  const [source, setSource] = useState('');
  const [selectedDims, setSelectedDims] = useState([]);
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [limit, setLimit] = useState(100);
  const [savedQueryId, setSavedQueryId] = useState('');
  const [hasQueried, setHasQueried] = useState(false);
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const { data: savedQueries = [] } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: () => savedQueriesApi.list().then((r) => r.data.data),
    enabled: canUseSql,
  });

  const selectedSavedQuery = savedQueries.find((sq) => sq.id === savedQueryId);

  const queryPayload = useMemo(() => {
    if (mode === 'sql') return null;
    if (!source || (selectedDims.length === 0 && selectedMeasures.length === 0)) return null;
    return {
      source,
      dimensions: selectedDims,
      measures: selectedMeasures.map((m) => {
        const sm = schema?.[source]?.measures?.find((x) => x.key === m);
        return { field: m, aggregation: sm?.defaultAgg || 'sum', alias: m };
      }),
      limit: parseInt(limit) || 100,
    };
  }, [mode, source, selectedDims, selectedMeasures, limit, schema]);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['explore', queryPayload],
    queryFn: () => queryApi.execute(queryPayload).then((r) => r.data.data),
    enabled: false,
  });

  const handleRun = async () => {
    if (mode === 'sql' && selectedSavedQuery) {
      setHasQueried(true);
      setSqlLoading(true);
      setSqlResult(null);
      try {
        const res = await sqlApi.execute(selectedSavedQuery.sql, selectedSavedQuery.connection_id);
        setSqlResult(res.data.data?.rows || []);
      } catch {
        setSqlResult([]);
      } finally {
        setSqlLoading(false);
      }
    } else if (queryPayload) {
      setHasQueried(true);
      setSqlResult(null);
      refetch();
    }
  };

  const sourceSchema = schema?.[source];

  const handleSourceChange = (s) => {
    setSource(s);
    setSelectedDims([]);
    setSelectedMeasures([]);
    setHasQueried(false);
  };

  const toggleDim = (d) => setSelectedDims((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  const toggleMeasure = (m) => setSelectedMeasures((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  const columns = useMemo(() => {
    if (mode === 'sql' && sqlResult?.length > 0) return Object.keys(sqlResult[0]);
    return [...selectedDims, ...selectedMeasures];
  }, [mode, sqlResult, selectedDims, selectedMeasures]);

  const displayResult = mode === 'sql' ? sqlResult : result;
  const displayLoading = mode === 'sql' ? sqlLoading : isLoading;
  const canRun = mode === 'sql' ? !!selectedSavedQuery : !!queryPayload;

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>{t('dataExplorer.title')}</h1>
        <p>{t('dataExplorer.subtitle')}</p>
      </div>

      <div className="explorer-controls">
        {canUseSql && (
          <select className="form-select" style={{ width: 140 }} value={mode} onChange={(e) => { setMode(e.target.value); setHasQueried(false); setSqlResult(null); }}>
            <option value="visual">{t('widget.visualBuilder')}</option>
            <option value="sql">{t('widget.savedQuery')}</option>
          </select>
        )}

        {mode === 'sql' ? (
          <>
            <select className="form-select" style={{ width: 220 }} value={savedQueryId} onChange={(e) => { setSavedQueryId(e.target.value); setHasQueried(false); setSqlResult(null); }}>
              <option value="">{t('dataExplorer.selectSavedQuery')}</option>
              {savedQueries.map((sq) => (
                <option key={sq.id} value={sq.id}>{sq.name}</option>
              ))}
            </select>
            {savedQueries.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dataExplorer.noSavedQueries')}</span>
            )}
          </>
        ) : (
          <>
        <select className="form-select" style={{ width: 200 }} value={source} onChange={(e) => handleSourceChange(e.target.value)}>
          <option value="">{t('dataExplorer.selectSource')}</option>
          {schema && Object.entries(schema).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        {sourceSchema && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dataExplorer.dimensionsLabel')}</span>
              {sourceSchema.dimensions.map((d) => (
                <label key={d.key} className="form-checkbox" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={selectedDims.includes(d.key)} onChange={() => toggleDim(d.key)} />
                  {d.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dataExplorer.measuresLabel')}</span>
              {sourceSchema.measures.map((m) => (
                <label key={m.key} className="form-checkbox" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={selectedMeasures.includes(m.key)} onChange={() => toggleMeasure(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </>
        )}

        <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} style={{ width: 80 }} min={1} max={10000} placeholder={t('dataExplorer.limit')} />
          </>
        )}

        <button className="btn btn-primary btn-sm" onClick={handleRun} disabled={!canRun || displayLoading}>
          {displayLoading ? t('common.running') : t('reportBuilder.runQuery')}
        </button>
      </div>

      {displayLoading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      )}

      {hasQueried && displayResult && displayResult.length > 0 && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            {displayResult.length} {t('dataExplorer.rowsReturned')}
          </div>
          <div className="explorer-table-wrap">
            <table className="widget-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} style={{ textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayResult.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => {
                      const key = Object.keys(row).find((k) => k.toLowerCase() === col.toLowerCase()) || col;
                      const val = row[key];
                      const isNumeric = typeof val === 'number' || (typeof val === 'string' && /^-?\d+\.?\d*$/.test(val));
                      return (
                        <td key={col} style={{ fontVariantNumeric: isNumeric ? 'tabular-nums' : undefined, textAlign: isNumeric ? 'right' : 'left' }}>
                          {isNumeric ? formatAxisValue(val) : (val ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasQueried && displayResult && displayResult.length === 0 && (
        <div className="empty-state">
          <h3>{t('common.noResults')}</h3>
          <p>{t('reportBuilder.noResultsHint')}</p>
        </div>
      )}
    </div>
  );
}
