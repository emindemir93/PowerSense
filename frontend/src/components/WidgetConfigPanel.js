import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi, savedQueriesApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { WIDGET_TYPES } from '../utils/helpers';

const AGG_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'count_distinct', label: 'Count Distinct' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const COND_OPERATORS = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '=', label: '=' },
];

const COND_COLORS = [
  { value: '#3fb950', label: 'Green' },
  { value: '#f85149', label: 'Red' },
  { value: '#d29922', label: 'Yellow' },
  { value: '#4493f8', label: 'Blue' },
  { value: '#f778ba', label: 'Pink' },
];

export default function WidgetConfigPanel({ widget, onClose }) {
  const updateWidget = useDashboardStore((s) => s.updateWidget);

  const [title, setTitle] = useState(widget?.title || '');
  const [type, setType] = useState(widget?.type || 'bar');
  const [dataSourceType, setDataSourceType] = useState(widget?.data_config?.type === 'sql' ? 'sql' : 'visual');
  const [savedQueryId, setSavedQueryId] = useState(widget?.data_config?.saved_query_id || '');
  const [sqlDimColumn, setSqlDimColumn] = useState(widget?.data_config?.sqlDimColumn || '');
  const [sqlMeasureColumn, setSqlMeasureColumn] = useState(widget?.data_config?.sqlMeasureColumn || '');
  const [source, setSource] = useState(widget?.data_config?.source || '');
  const [dimensions, setDimensions] = useState(widget?.data_config?.dimensions || []);
  const [measures, setMeasures] = useState(widget?.data_config?.measures || []);
  const [limit, setLimit] = useState(widget?.data_config?.limit || 100);
  const [format, setFormat] = useState(widget?.visual_config?.format || 'number');
  const [prefix, setPrefix] = useState(widget?.visual_config?.prefix || '');
  const [slicerField, setSlicerField] = useState(widget?.data_config?.slicerField || '');
  const [conditionalRules, setConditionalRules] = useState(widget?.visual_config?.conditionalRules || []);
  const [gaugeTarget, setGaugeTarget] = useState(widget?.visual_config?.gaugeTarget || 100);

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const { data: savedQueries = [] } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: () => savedQueriesApi.list().then((r) => r.data.data),
  });

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '');
      setType(widget.type || 'bar');
      setDataSourceType(widget.data_config?.type === 'sql' ? 'sql' : 'visual');
      setSavedQueryId(widget.data_config?.saved_query_id || '');
      setSqlDimColumn(widget.data_config?.sqlDimColumn || '');
      setSqlMeasureColumn(widget.data_config?.sqlMeasureColumn || '');
      setSource(widget.data_config?.source || '');
      setDimensions(widget.data_config?.dimensions || []);
      setMeasures(widget.data_config?.measures || []);
      setLimit(widget.data_config?.limit || 100);
      setFormat(widget.visual_config?.format || 'number');
      setPrefix(widget.visual_config?.prefix || '');
      setSlicerField(widget.data_config?.slicerField || '');
      setConditionalRules(widget.visual_config?.conditionalRules || []);
      setGaugeTarget(widget.visual_config?.gaugeTarget || 100);
    }
  }, [widget]);

  if (!widget) return null;

  const sourceSchema = schema?.[source];
  const isSlicer = type === 'slicer';
  const isKpi = type === 'kpi';
  const isGauge = type === 'gauge';
  const isTable = type === 'table';
  const isPivot = type === 'pivot';
  const showCondFormatting = isKpi || isTable || isPivot;

  const selectedSavedQuery = savedQueries.find((sq) => sq.id === savedQueryId);

  const applyChanges = () => {
    let dataConfig;
    if (dataSourceType === 'sql' && selectedSavedQuery) {
      dataConfig = {
        type: 'sql',
        sql: selectedSavedQuery.sql,
        connection_id: selectedSavedQuery.connection_id,
        saved_query_id: savedQueryId,
        sqlDimColumn,
        sqlMeasureColumn,
        dimensions: sqlDimColumn ? [sqlDimColumn] : [],
        measures: sqlMeasureColumn ? [{ field: sqlMeasureColumn, alias: sqlMeasureColumn, aggregation: 'sum' }] : [],
        limit: parseInt(limit) || 100,
      };
    } else {
      dataConfig = {
        source,
        dimensions,
        measures,
        limit: parseInt(limit) || 100,
        ...(isSlicer && { slicerField }),
        ...(widget.data_config?.filters && { filters: widget.data_config.filters }),
        ...(widget.data_config?.sort && { sort: widget.data_config.sort }),
      };
    }
    updateWidget(widget.id, {
      title,
      type,
      data_config: dataConfig,
      visual_config: {
        ...widget.visual_config,
        format,
        prefix,
        conditionalRules: conditionalRules.length > 0 ? conditionalRules : undefined,
        ...(isGauge && { gaugeTarget: parseFloat(gaugeTarget) || 100 }),
      },
    });
  };

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setDimensions([]);
    setMeasures([]);
    setSlicerField('');
  };

  const toggleDimension = (dim) => {
    setDimensions((prev) => prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]);
  };

  const addMeasure = () => {
    const available = sourceSchema?.measures || [];
    if (available.length > 0) {
      setMeasures((prev) => [...prev, { field: available[0].key, aggregation: available[0].defaultAgg, alias: available[0].key }]);
    }
  };

  const addCalculatedField = () => {
    setMeasures((prev) => [...prev, { type: 'calculated', alias: 'calc_field', expression: '{total_amount} / {order_count}' }]);
  };

  const updateMeasure = (index, updates) => {
    setMeasures((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const removeMeasure = (index) => {
    setMeasures((prev) => prev.filter((_, i) => i !== index));
  };

  const addCondRule = () => {
    setConditionalRules((prev) => [...prev, { operator: '>', value: '', color: '#3fb950' }]);
  };

  const updateCondRule = (index, updates) => {
    setConditionalRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const removeCondRule = (index) => {
    setConditionalRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <h3>Widget Configuration</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="config-panel-body">
        {/* General */}
        <div className="config-section">
          <div className="config-section-title">General</div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Chart Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {WIDGET_TYPES.map((t) => (<option key={t.type} value={t.type}>{t.label}</option>))}
            </select>
          </div>
        </div>

        {/* Data Source Type */}
        <div className="config-section">
          <div className="config-section-title">Data Source</div>
          <div className="form-group">
            <select className="form-select" value={dataSourceType} onChange={(e) => setDataSourceType(e.target.value)}>
              <option value="visual">Visual Builder</option>
              <option value="sql">Saved Query</option>
            </select>
          </div>
        </div>

        {/* Saved Query Config */}
        {dataSourceType === 'sql' && (
          <div className="config-section">
            <div className="config-section-title">Saved Query</div>
            <div className="form-group">
              <select className="form-select" value={savedQueryId} onChange={(e) => setSavedQueryId(e.target.value)}>
                <option value="">Select a saved query...</option>
                {savedQueries.map((sq) => (
                  <option key={sq.id} value={sq.id}>{sq.name}</option>
                ))}
              </select>
              {savedQueries.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>No saved queries. Use SQL Editor to save one.</p>
              )}
            </div>
            {selectedSavedQuery && (
              <>
                <div className="form-group">
                  <label className="form-label">Dimension Column (X axis / labels)</label>
                  <input className="form-input" value={sqlDimColumn} onChange={(e) => setSqlDimColumn(e.target.value)}
                    placeholder="e.g. category, month, name..." style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Column name from query result for grouping</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Measure Column (Y axis / values)</label>
                  <input className="form-input" value={sqlMeasureColumn} onChange={(e) => setSqlMeasureColumn(e.target.value)}
                    placeholder="e.g. total, count, revenue..." style={{ fontSize: 12 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Column name from query result for values</span>
                </div>
                <div style={{ marginTop: 4, padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', maxHeight: 60, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedSavedQuery.sql?.substring(0, 150)}{selectedSavedQuery.sql?.length > 150 ? '...' : ''}
                </div>
              </>
            )}
          </div>
        )}

        {/* Visual Builder Source */}
        {dataSourceType === 'visual' && (
          <div className="config-section">
            <div className="config-section-title">Source</div>
            <div className="form-group">
              <select className="form-select" value={source} onChange={(e) => handleSourceChange(e.target.value)}>
                <option value="">Select a data source...</option>
                {schema && Object.entries(schema).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
              </select>
            </div>
          </div>
        )}

        {/* Slicer Config */}
        {dataSourceType === 'visual' && isSlicer && sourceSchema && (
          <div className="config-section">
            <div className="config-section-title">Slicer Field</div>
            <div className="form-group">
              <select className="form-select" value={slicerField} onChange={(e) => setSlicerField(e.target.value)}>
                <option value="">Select filter field...</option>
                {sourceSchema.dimensions.map((dim) => (<option key={dim.key} value={dim.key}>{dim.label}</option>))}
              </select>
            </div>
          </div>
        )}

        {/* Dimensions & Measures for non-slicer */}
        {dataSourceType === 'visual' && !isSlicer && sourceSchema && (
          <>
            <div className="config-section">
              <div className="config-section-title">Dimensions (Group By)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sourceSchema.dimensions.map((dim) => (
                  <label key={dim.key} className="form-checkbox">
                    <input type="checkbox" checked={dimensions.includes(dim.key)} onChange={() => toggleDimension(dim.key)} />
                    {dim.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title">
                Measures
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addMeasure}>+ Add</button>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, padding: '2px 8px', color: 'var(--purple)' }} onClick={addCalculatedField} title="Add Calculated Field">fx</button>
              </div>
              {measures.map((m, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  {m.type === 'calculated' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--purple-soft, #30363d)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple, #a371f7)' }}>CALCULATED FIELD</span>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMeasure(i)} style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      <input className="form-input" placeholder="Alias" value={m.alias} onChange={(e) => updateMeasure(i, { alias: e.target.value })} style={{ fontSize: 11 }} />
                      <input className="form-input" placeholder="e.g. {total_amount} / {order_count}" value={m.expression || ''} onChange={(e) => updateMeasure(i, { expression: e.target.value })} style={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Use {'{field_name}'} to reference measures</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <select className="form-select" value={m.field} onChange={(e) => updateMeasure(i, { field: e.target.value, alias: e.target.value })}>
                          {sourceSchema.measures.map((sm) => (<option key={sm.key} value={sm.key}>{sm.label}</option>))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <select className="form-select" value={m.aggregation} onChange={(e) => updateMeasure(i, { aggregation: e.target.value })}>
                          {AGG_OPTIONS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
                        </select>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMeasure(i)} style={{ color: 'var(--danger)', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* KPI Display */}
        {isKpi && (
          <div className="config-section">
            <div className="config-section-title">KPI Display</div>
            <div className="form-group">
              <label className="form-label">Format</label>
              <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prefix</label>
              <input className="form-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. $, ₺" />
            </div>
          </div>
        )}

        {/* Gauge Config */}
        {isGauge && (
          <div className="config-section">
            <div className="config-section-title">Gauge Settings</div>
            <div className="form-group">
              <label className="form-label">Target Value</label>
              <input className="form-input" type="number" value={gaugeTarget} onChange={(e) => setGaugeTarget(e.target.value)} />
            </div>
          </div>
        )}

        {/* Conditional Formatting */}
        {showCondFormatting && (
          <div className="config-section">
            <div className="config-section-title">
              Conditional Formatting
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addCondRule}>+ Rule</button>
            </div>
            {conditionalRules.map((rule, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>If value</span>
                <select className="form-select" value={rule.operator} onChange={(e) => updateCondRule(i, { operator: e.target.value })} style={{ width: 50 }}>
                  {COND_OPERATORS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                <input className="form-input" type="number" value={rule.value} onChange={(e) => updateCondRule(i, { value: e.target.value })} style={{ width: 70 }} placeholder="value" />
                <select className="form-select" value={rule.color} onChange={(e) => updateCondRule(i, { color: e.target.value })} style={{ width: 80 }}>
                  {COND_COLORS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: rule.color, flexShrink: 0 }} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeCondRule(i)} style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
            {conditionalRules.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add rules to change value colors based on thresholds</p>
            )}
          </div>
        )}

        {/* Options */}
        {!isSlicer && (
          <div className="config-section">
            <div className="config-section-title">Options</div>
            <div className="form-group">
              <label className="form-label">Row Limit</label>
              <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={10000} />
            </div>
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyChanges}>
          Apply Changes
        </button>
      </div>
    </div>
  );
}
