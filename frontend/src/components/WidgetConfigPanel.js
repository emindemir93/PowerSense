import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi } from '../services/api';
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

export default function WidgetConfigPanel({ widget, onClose }) {
  const updateWidget = useDashboardStore((s) => s.updateWidget);

  const [title, setTitle] = useState(widget?.title || '');
  const [type, setType] = useState(widget?.type || 'bar');
  const [source, setSource] = useState(widget?.data_config?.source || '');
  const [dimensions, setDimensions] = useState(widget?.data_config?.dimensions || []);
  const [measures, setMeasures] = useState(widget?.data_config?.measures || []);
  const [limit, setLimit] = useState(widget?.data_config?.limit || 100);
  const [colors, setColors] = useState(widget?.visual_config?.colors || []);
  const [format, setFormat] = useState(widget?.visual_config?.format || 'number');
  const [prefix, setPrefix] = useState(widget?.visual_config?.prefix || '');

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '');
      setType(widget.type || 'bar');
      setSource(widget.data_config?.source || '');
      setDimensions(widget.data_config?.dimensions || []);
      setMeasures(widget.data_config?.measures || []);
      setLimit(widget.data_config?.limit || 100);
      setColors(widget.visual_config?.colors || []);
      setFormat(widget.visual_config?.format || 'number');
      setPrefix(widget.visual_config?.prefix || '');
    }
  }, [widget]);

  if (!widget) return null;

  const sourceSchema = schema?.[source];

  const applyChanges = () => {
    updateWidget(widget.id, {
      title,
      type,
      data_config: {
        source,
        dimensions,
        measures,
        limit: parseInt(limit) || 100,
        ...(widget.data_config?.filters && { filters: widget.data_config.filters }),
        ...(widget.data_config?.sort && { sort: widget.data_config.sort }),
      },
      visual_config: {
        ...widget.visual_config,
        colors: colors.length > 0 ? colors : undefined,
        format,
        prefix,
      },
    });
  };

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setDimensions([]);
    setMeasures([]);
  };

  const toggleDimension = (dim) => {
    setDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const addMeasure = () => {
    const availableMeasures = sourceSchema?.measures || [];
    if (availableMeasures.length > 0) {
      setMeasures((prev) => [
        ...prev,
        { field: availableMeasures[0].key, aggregation: availableMeasures[0].defaultAgg, alias: availableMeasures[0].key },
      ]);
    }
  };

  const updateMeasure = (index, updates) => {
    setMeasures((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const removeMeasure = (index) => {
    setMeasures((prev) => prev.filter((_, i) => i !== index));
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
        <div className="config-section">
          <div className="config-section-title">General</div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Chart Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {WIDGET_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">Data Source</div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="form-select" value={source} onChange={(e) => handleSourceChange(e.target.value)}>
              <option value="">Select a data source...</option>
              {schema && Object.entries(schema).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {sourceSchema && (
          <>
            <div className="config-section">
              <div className="config-section-title">Dimensions (Group By)</div>
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
                Measures
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addMeasure}>+ Add</button>
              </div>
              {measures.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <select className="form-select" value={m.field} onChange={(e) => updateMeasure(i, { field: e.target.value, alias: e.target.value })}>
                      {sourceSchema.measures.map((sm) => (
                        <option key={sm.key} value={sm.key}>{sm.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <select className="form-select" value={m.aggregation} onChange={(e) => updateMeasure(i, { aggregation: e.target.value })}>
                      {AGG_OPTIONS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => removeMeasure(i)}
                    style={{ color: 'var(--danger)', flexShrink: 0 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {type === 'kpi' && (
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

        <div className="config-section">
          <div className="config-section-title">Options</div>
          <div className="form-group">
            <label className="form-label">Row Limit</label>
            <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={10000} />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyChanges}>
          Apply Changes
        </button>
      </div>
    </div>
  );
}
