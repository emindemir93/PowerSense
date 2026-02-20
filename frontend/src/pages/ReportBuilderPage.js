import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryApi, reportsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatAxisValue } from '../utils/helpers';

const AGG_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'count_distinct', label: 'Count Distinct' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

export default function ReportBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isNew = id === 'new';
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
        setSource(qc.source || '');
        setDimensions(qc.dimensions || []);
        setMeasures(qc.measures || []);
        setLimit(qc.limit || 100);
      }
    }
  }, [existingReport]);

  const sourceSchema = schema?.[source];

  const queryPayload = useMemo(() => {
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
  }, [source, dimensions, measures, limit]);

  const handlePreview = async () => {
    if (!queryPayload) return;
    setPreviewLoading(true);
    try {
      const res = await queryApi.execute(queryPayload);
      setPreviewData(res.data.data);
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
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      query_config: queryPayload,
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
            placeholder="Report name..."
            disabled={!canEdit}
          />
        </div>
        <div className="toolbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePreview}
            disabled={!queryPayload || previewLoading}
          >
            {previewLoading ? 'Running...' : 'Run Query'}
          </button>
          {!isNew && (
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          )}
          {canEdit && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={!name.trim() || !queryPayload || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Report'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Query Builder */}
        <div style={{ width: 340, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 16, background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div className="config-section">
            <div className="config-section-title">Report Details</div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this report show?" />
            </div>
            <label className="form-checkbox" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public (visible to all users)
            </label>

            <div className="form-group">
              <label className="form-label">Schedule (Auto-run)</label>
              <select className="form-select" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                <option value="">No schedule</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {schedule && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Report will auto-run {schedule} and results will be cached.</span>}
            </div>
          </div>

          <div className="divider" />

          <div className="config-section">
            <div className="config-section-title">1. Data Source</div>
            <div className="form-group">
              <select className="form-select" value={source} onChange={(e) => handleSourceChange(e.target.value)}>
                <option value="">Select data source...</option>
                {schema && Object.entries(schema).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {sourceSchema && (
            <>
              <div className="config-section">
                <div className="config-section-title">2. Dimensions (Group By)</div>
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
                  3. Measures (Aggregations)
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addMeasure}>+ Add</button>
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
                        <option key={a.value} value={a.value}>{a.label}</option>
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
                    Click "+ Add" to add a measure
                  </div>
                )}
              </div>

              <div className="config-section">
                <div className="config-section-title">4. Options</div>
                <div className="form-group">
                  <label className="form-label">Row Limit</label>
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
              Query Results
              {previewData && <span style={{ fontWeight: 400, marginLeft: 8 }}>({previewData.length} rows)</span>}
            </span>
            {queryPayload && (
              <button className="btn btn-primary btn-sm" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Running...' : 'Run Query'}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {!previewData && !previewLoading && (
              <div className="empty-state" style={{ height: '100%' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 48, height: 48 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <h3>Build Your Query</h3>
                <p>Select a data source, choose dimensions and measures, then click "Run Query" to preview results</p>
              </div>
            )}

            {previewLoading && (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="loading-spinner" />
              </div>
            )}

            {previewData && previewData.length === 0 && (
              <div className="empty-state" style={{ height: '100%' }}>
                <h3>No Results</h3>
                <p>Try adjusting your query parameters</p>
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
