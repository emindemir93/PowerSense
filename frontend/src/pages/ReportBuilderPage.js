import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryApi, reportsApi, savedQueriesApi, sqlApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatAxisValue } from '../utils/helpers';
import { useTranslation } from '../i18n';

const AGG_OPTIONS = [
  { value: 'sum', labelKey: 'aggOptions.sum' },
  { value: 'count', labelKey: 'aggOptions.count' },
  { value: 'count_distinct', labelKey: 'aggOptions.countDistinct' },
  { value: 'avg', labelKey: 'aggOptions.avg' },
  { value: 'min', labelKey: 'aggOptions.min' },
  { value: 'max', labelKey: 'aggOptions.max' },
];

export default function ReportBuilderPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isNew = id === 'new';
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [queryType, setQueryType] = useState('visual'); // 'visual' | 'sql'
  const [savedQueryId, setSavedQueryId] = useState('');
  const [sqlQuery, setSqlQuery] = useState(''); // for existing reports with sql not in saved list
  const [sqlConnectionId, setSqlConnectionId] = useState('');
  const [source, setSource] = useState('');
  const [dimensions, setDimensions] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [limit, setLimit] = useState(100);
  const [isPublic, setIsPublic] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const { data: savedQueries = [] } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: () => savedQueriesApi.list().then((r) => r.data.data),
    enabled: canEdit,
  });

  const { data: existingReport } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id).then((r) => r.data.data),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (existingReport) {
      setName(existingReport.name || '');
      setDescription(existingReport.description || '');
      setIsPublic(existingReport.is_public || false);
      setSchedule(existingReport.schedule || '');
      const qc = typeof existingReport.query_config === 'string'
        ? JSON.parse(existingReport.query_config)
        : existingReport.query_config;
      if (qc) {
        if (qc.type === 'sql') {
          setQueryType('sql');
          setSqlQuery(qc.sql || '');
          setSqlConnectionId(qc.connection_id || '');
          setSavedQueryId('__custom__');
        } else {
          setQueryType('visual');
          setSource(qc.source || '');
          setDimensions(qc.dimensions || []);
          setMeasures(qc.measures || []);
          setLimit(qc.limit || 100);
        }
      }
    }
  }, [existingReport]);

  const sourceSchema = schema?.[source];

  const selectedSavedQuery = savedQueryId && savedQueryId !== '__custom__' ? savedQueries.find((sq) => sq.id === savedQueryId) : null;
  const sqlPayload = selectedSavedQuery
    ? { sql: selectedSavedQuery.sql, connection_id: selectedSavedQuery.connection_id }
    : (savedQueryId === '__custom__' || sqlQuery ? { sql: sqlQuery, connection_id: sqlConnectionId } : null);

  const queryPayload = useMemo(() => {
    if (queryType === 'sql') {
      if (!sqlPayload?.sql) return null;
      return { type: 'sql', sql: sqlPayload.sql, connection_id: sqlPayload.connection_id };
    }
    if (!source || (dimensions.length === 0 && measures.length === 0)) return null;
    return {
      source,
      dimensions,
      measures: measures.map((m) => ({
        field: m.field,
        aggregation: m.aggregation,
        alias: m.alias || m.field,
      })),
      limit: parseInt(limit) || 100,
    };
  }, [queryType, sqlPayload, source, dimensions, measures, limit]);

  const handlePreview = async () => {
    if (!queryPayload) return;
    setPreviewLoading(true);
    try {
      if (queryPayload.type === 'sql') {
        const res = await sqlApi.execute(queryPayload.sql, queryPayload.connection_id);
        const data = res.data.data;
        setPreviewData(data.rows || []);
      } else {
        const res = await queryApi.execute(queryPayload);
        setPreviewData(res.data.data);
      }
    } catch (err) {
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data) => isNew ? reportsApi.create(data) : reportsApi.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isNew) {
        navigate(`/reports/${res.data.data.id}`, { replace: true });
      }
    },
  });

  const handleSave = () => {
    if (!name.trim()) return;
    const qc = queryType === 'sql' && sqlPayload
      ? { type: 'sql', sql: sqlPayload.sql, connection_id: sqlPayload.connection_id || null }
      : queryPayload;
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      query_config: qc,
      is_public: isPublic,
      schedule: schedule || null,
    });
  };

  const handleExport = () => {
    if (isNew || !id) return;
    reportsApi.export(id).then((res) => {
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const handleSourceChange = (s) => {
    setSource(s);
    setDimensions([]);
    setMeasures([]);
    setPreviewData(null);
  };

  const toggleDimension = (dim) => {
    setDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
    setPreviewData(null);
  };

  const addMeasure = () => {
    if (!sourceSchema?.measures?.length) return;
    const first = sourceSchema.measures[0];
    setMeasures((prev) => [...prev, { field: first.key, aggregation: first.defaultAgg, alias: first.key }]);
    setPreviewData(null);
  };

  const updateMeasure = (index, updates) => {
    setMeasures((prev) => prev.map((m, i) => i === index ? { ...m, ...updates } : m));
    setPreviewData(null);
  };

  const removeMeasure = (index) => {
    setMeasures((prev) => prev.filter((_, i) => i !== index));
    setPreviewData(null);
  };

  const columns = useMemo(() => {
    if (!previewData || previewData.length === 0) return [];
    return Object.keys(previewData[0]);
  }, [previewData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/reports')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="toolbar-title">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('reportBuilder.namePlaceholder')}
            disabled={!canEdit}
          />
        </div>
        <div className="toolbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePreview}
            disabled={!queryPayload || previewLoading}
          >
            {previewLoading ? t('common.running') : t('reportBuilder.runQuery')}
          </button>
          {!isNew && (
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('reportBuilder.exportCsv')}
            </button>
          )}
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={!name.trim() || !queryPayload || saveMutation.isPending}
            >
              {saveMutation.isPending ? t('common.saving') : saved ? t('common.saved') : t('reportBuilder.saveReport')}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Query Builder */}
        <div style={{ width: 340, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 16, background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div className="config-section">
            <div className="config-section-title">{t('reportBuilder.details')}</div>
            <div className="form-group">
              <label className="form-label">{t('reportBuilder.description')}</label>
              <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('reportBuilder.descPlaceholder')} />
            </div>
            <label className="form-checkbox" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              {t('reportBuilder.publicLabel')}
            </label>

            <div className="form-group">
              <label className="form-label">{t('reportBuilder.schedule')}</label>
              <select className="form-select" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                <option value="">{t('reportBuilder.noSchedule')}</option>
                <option value="daily">{t('reportBuilder.daily')}</option>
                <option value="weekly">{t('reportBuilder.weekly')}</option>
                <option value="monthly">{t('reportBuilder.monthly')}</option>
              </select>
              {schedule && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Report will auto-run {schedule} and results will be cached.</span>}
            </div>
          </div>

          <div className="divider" />

          <div className="config-section">
            <div className="config-section-title">{t('reportBuilder.queryType')}</div>
            <div className="form-group">
              <select className="form-select" value={queryType} onChange={(e) => { setQueryType(e.target.value); setPreviewData(null); }}>
                <option value="visual">{t('widget.visualBuilder')}</option>
                <option value="sql">{t('widget.savedQuery')}</option>
              </select>
            </div>
          </div>

          {queryType === 'sql' && (
            <div className="config-section">
              <div className="config-section-title">{t('reportBuilder.selectSavedQuery')}</div>
              <div className="form-group">
                <select className="form-select" value={savedQueryId} onChange={(e) => { const v = e.target.value; setSavedQueryId(v); if (v !== '__custom__') { setSqlQuery(''); setSqlConnectionId(''); } setPreviewData(null); }}>
                  <option value="">{t('reportBuilder.selectSavedQueryPlaceholder')}</option>
                  {sqlQuery && <option value="__custom__">{t('reportBuilder.customSql')}</option>}
                  {savedQueries.map((sq) => (
                    <option key={sq.id} value={sq.id}>{sq.name}</option>
                  ))}
                </select>
                {savedQueries.length === 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    {t('reportBuilder.noSavedQueries')}
                  </p>
                )}
              </div>
            </div>
          )}

          {queryType === 'visual' && (
          <div className="config-section">
            <div className="config-section-title">{t('reportBuilder.dataSource')}</div>
            <div className="form-group">
              <select className="form-select" value={source} onChange={(e) => handleSourceChange(e.target.value)}>
                <option value="">{t('reportBuilder.selectSource')}</option>
                {schema && Object.entries(schema).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
          )}

          {queryType === 'visual' && sourceSchema && (
            <>
              <div className="config-section">
                <div className="config-section-title">{t('reportBuilder.dimensionsStep')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sourceSchema.dimensions.map((dim) => (
                    <label key={dim.key} className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={dimensions.includes(dim.key)}
                        onChange={() => toggleDimension(dim.key)}
                      />
                      {dim.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="config-section">
                <div className="config-section-title">
                  {t('reportBuilder.measuresStep')}
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addMeasure}>{t('common.add')}</button>
                </div>
                {measures.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <select className="form-select" style={{ flex: 1 }} value={m.field} onChange={(e) => updateMeasure(i, { field: e.target.value, alias: e.target.value })}>
                      {sourceSchema.measures.map((sm) => (
                        <option key={sm.key} value={sm.key}>{sm.label}</option>
                      ))}
                    </select>
                    <select className="form-select" style={{ flex: 1 }} value={m.aggregation} onChange={(e) => updateMeasure(i, { aggregation: e.target.value })}>
                      {AGG_OPTIONS.map((a) => (
                        <option key={a.value} value={a.value}>{t(a.labelKey)}</option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMeasure(i)} style={{ color: 'var(--danger)', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                {measures.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                    {t('reportBuilder.addMeasureHint')}
                  </div>
                )}
              </div>

              <div className="config-section">
                <div className="config-section-title">{t('reportBuilder.optionsStep')}</div>
                <div className="form-group">
                  <label className="form-label">{t('widget.rowLimit')}</label>
                  <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={10000} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('reportBuilder.queryResults')}
              {previewData && <span style={{ fontWeight: 400, marginLeft: 8 }}>({previewData.length} {t('common.rows')})</span>}
            </span>
            {queryPayload && (
              <button className="btn btn-primary btn-sm" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? t('common.running') : t('reportBuilder.runQuery')}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {!previewData && !previewLoading && (
              <div className="empty-state" style={{ height: '100%' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <h3>{t('reportBuilder.buildQuery')}</h3>
                <p>{t('reportBuilder.buildQueryHint')}</p>
              </div>
            )}

            {previewLoading && (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="loading-spinner" />
              </div>
            )}

            {previewData && previewData.length === 0 && (
              <div className="empty-state" style={{ height: '100%' }}>
                <h3>{t('common.noResults')}</h3>
                <p>{t('reportBuilder.noResultsHint')}</p>
              </div>
            )}

            {previewData && previewData.length > 0 && (
              <table className="widget-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} style={{ textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => {
                        const isMeasure = measures.some((m) => (m.alias || m.field) === col);
                        return (
                          <td key={col} style={{ textAlign: isMeasure ? 'right' : 'left', fontVariantNumeric: isMeasure ? 'tabular-nums' : undefined }}>
                            {isMeasure ? formatAxisValue(row[col]) : (row[col] ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
