import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi, sqlApi, savedQueriesApi } from '../services/api';
import { useDashboardStore } from '../store/dashboardStore';
import { WIDGET_TYPES } from '../utils/helpers';
import { useTranslation } from '../i18n';

const AGG_OPTIONS = [
  { value: 'sum', labelKey: 'aggOptions.sum' },
  { value: 'count', labelKey: 'aggOptions.count' },
  { value: 'count_distinct', labelKey: 'aggOptions.countDistinct' },
  { value: 'avg', labelKey: 'aggOptions.avg' },
  { value: 'min', labelKey: 'aggOptions.min' },
  { value: 'max', labelKey: 'aggOptions.max' },
];

const COND_OPERATORS = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '=', label: '=' },
];

const COND_COLORS = [
  { value: '#3fb950', labelKey: 'condColors.green' },
  { value: '#f85149', labelKey: 'condColors.red' },
  { value: '#d29922', labelKey: 'condColors.yellow' },
  { value: '#4493f8', labelKey: 'condColors.blue' },
  { value: '#f778ba', labelKey: 'condColors.pink' },
];

export default function WidgetConfigPanel({ widget, onClose }) {
  const { t } = useTranslation();
  const updateWidget = useDashboardStore((s) => s.updateWidget);

  const [title, setTitle] = useState(widget?.title || '');
  const [type, setType] = useState(widget?.type || 'bar');
  const [dataSourceType, setDataSourceType] = useState(widget?.data_config?.type === 'sql' ? 'sql' : 'visual');
  const [savedQueryId, setSavedQueryId] = useState(widget?.data_config?.saved_query_id || '');
  const [sqlDimensions, setSqlDimensions] = useState(widget?.data_config?.type === 'sql' ? (widget?.data_config?.dimensions || []) : []);
  const [sqlMeasures, setSqlMeasures] = useState(widget?.data_config?.type === 'sql' ? (widget?.data_config?.measures || []) : []);
  const [source, setSource] = useState(widget?.data_config?.source || '');
  const [dimensions, setDimensions] = useState(widget?.data_config?.dimensions || []);
  const [measures, setMeasures] = useState(widget?.data_config?.measures || []);
  const [limit, setLimit] = useState(widget?.data_config?.limit || 100);
  const [format, setFormat] = useState(widget?.visual_config?.format || 'number');
  const [prefix, setPrefix] = useState(widget?.visual_config?.prefix || '');
  const [slicerField, setSlicerField] = useState(widget?.data_config?.slicerField || '');
  const [conditionalRules, setConditionalRules] = useState(widget?.visual_config?.conditionalRules || []);
  const [gaugeTarget, setGaugeTarget] = useState(widget?.visual_config?.gaugeTarget || 100);
  const [subtitle, setSubtitle] = useState(widget?.visual_config?.subtitle || '');
  const [description, setDescription] = useState(widget?.visual_config?.description || '');
  const [titleAlign, setTitleAlign] = useState(widget?.visual_config?.titleAlign || 'left');

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const { data: savedQueries = [] } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: () => savedQueriesApi.list().then((r) => r.data.data),
  });

  const selectedSavedQuery = savedQueries.find((sq) => sq.id === savedQueryId);

  const { data: sqlPreview, isLoading: sqlPreviewLoading } = useQuery({
    queryKey: ['sql-preview', savedQueryId],
    queryFn: async () => {
      const sq = savedQueries.find((q) => q.id === savedQueryId);
      if (!sq) return null;
      const res = await sqlApi.execute(sq.sql, sq.connection_id);
      return res.data.data;
    },
    enabled: dataSourceType === 'sql' && !!savedQueryId && savedQueries.length > 0,
    staleTime: 60000,
    retry: 1,
  });

  const sqlColumns = useMemo(() => {
    if (!sqlPreview?.rows?.length) return [];
    const sampleRows = sqlPreview.rows.slice(0, 50);
    return Object.keys(sampleRows[0]).map((key) => {
      const numCount = sampleRows.filter((r) => r[key] !== null && r[key] !== '' && !isNaN(Number(r[key]))).length;
      const isNumeric = numCount > sampleRows.length * 0.6;
      return { key, label: key, isNumeric };
    });
  }, [sqlPreview]);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title || '');
      setType(widget.type || 'bar');
      setDataSourceType(widget.data_config?.type === 'sql' ? 'sql' : 'visual');
      setSavedQueryId(widget.data_config?.saved_query_id || '');
      setSqlDimensions(widget.data_config?.type === 'sql' ? (widget.data_config?.dimensions || []) : []);
      setSqlMeasures(widget.data_config?.type === 'sql' ? (widget.data_config?.measures || []) : []);
      setSource(widget.data_config?.source || '');
      setDimensions(widget.data_config?.dimensions || []);
      setMeasures(widget.data_config?.measures || []);
      setLimit(widget.data_config?.limit || 100);
      setFormat(widget.visual_config?.format || 'number');
      setPrefix(widget.visual_config?.prefix || '');
      setSlicerField(widget.data_config?.slicerField || '');
      setConditionalRules(widget.visual_config?.conditionalRules || []);
      setGaugeTarget(widget.visual_config?.gaugeTarget || 100);
      setSubtitle(widget.visual_config?.subtitle || '');
      setDescription(widget.visual_config?.description || '');
      setTitleAlign(widget.visual_config?.titleAlign || 'left');
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

  const applyChanges = () => {
    let dataConfig;
    if (dataSourceType === 'sql' && selectedSavedQuery) {
      dataConfig = {
        type: 'sql',
        sql: selectedSavedQuery.sql,
        connection_id: selectedSavedQuery.connection_id,
        saved_query_id: savedQueryId,
        dimensions: sqlDimensions,
        measures: sqlMeasures,
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
        subtitle,
        description,
        titleAlign,
        conditionalRules: conditionalRules.length > 0 ? conditionalRules : undefined,
        ...(isGauge && { gaugeTarget: parseFloat(gaugeTarget) || 100 }),
      },
    });
  };

  const toggleSqlDimension = (col) => {
    setSqlDimensions((prev) => prev.includes(col) ? prev.filter((d) => d !== col) : [...prev, col]);
  };

  const addSqlMeasure = (colKey) => {
    setSqlMeasures((prev) => [...prev, { field: colKey, alias: colKey, aggregation: 'sum' }]);
  };

  const updateSqlMeasure = (index, updates) => {
    setSqlMeasures((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const removeSqlMeasure = (index) => {
    setSqlMeasures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavedQueryChange = (newId) => {
    setSavedQueryId(newId);
    setSqlDimensions([]);
    setSqlMeasures([]);
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
        <h3>{t('widget.title')}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="config-panel-body">
        {/* General */}
        <div className="config-section">
          <div className="config-section-title">{t('widget.general')}</div>
          <div className="form-group">
            <label className="form-label">{t('widget.widgetTitle')}</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('widget.chartType')}</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {WIDGET_TYPES.map((t) => (<option key={t.type} value={t.type}>{t.label}</option>))}
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="config-section">
          <div className="config-section-title">{t('widget.appearance')}</div>
          <div className="form-group">
            <label className="form-label">{t('widget.subtitle')}</label>
            <input className="form-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={t('widget.subtitlePlaceholder')} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('widget.description')}</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('widget.descriptionPlaceholder')} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('widget.titleAlignment')}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['left', 'center', 'right'].map((align) => (
                <button key={align} className={`btn btn-sm ${titleAlign === align ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTitleAlign(align)} style={{ flex: 1, textTransform: 'capitalize' }}>
                  {t('widget.align' + align.charAt(0).toUpperCase() + align.slice(1))}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Source Type */}
        <div className="config-section">
          <div className="config-section-title">{t('widget.dataSource')}</div>
          <div className="form-group">
            <select className="form-select" value={dataSourceType} onChange={(e) => setDataSourceType(e.target.value)}>
              <option value="visual">{t('widget.visualBuilder')}</option>
              <option value="sql">{t('widget.savedQuery')}</option>
            </select>
          </div>
        </div>

        {/* Saved Query Config */}
        {dataSourceType === 'sql' && (
          <>
            <div className="config-section">
              <div className="config-section-title">{t('widget.savedQuery')}</div>
              <div className="form-group">
                <select className="form-select" value={savedQueryId} onChange={(e) => handleSavedQueryChange(e.target.value)}>
                  <option value="">{t('widget.selectSavedQuery')}</option>
                  {savedQueries.map((sq) => (
                    <option key={sq.id} value={sq.id}>{sq.name}</option>
                  ))}
                </select>
                {savedQueries.length === 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('widget.noSavedQueries')}</p>
                )}
              </div>
              {selectedSavedQuery && (
                <div style={{ padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', maxHeight: 60, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedSavedQuery.sql?.substring(0, 200)}{selectedSavedQuery.sql?.length > 200 ? '...' : ''}
                </div>
              )}
            </div>

            {sqlPreviewLoading && savedQueryId && (
              <div className="config-section" style={{ textAlign: 'center', padding: 16 }}>
                <div className="loading-spinner" style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('widget.discoveringColumns')}</span>
              </div>
            )}

            {sqlColumns.length > 0 && !isSlicer && (
              <>
                {/* How it works guide */}
                <div className="config-section" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-color, #30363d)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    {t('widget.howItWorks')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <p style={{ margin: '0 0 4px' }}>{t('widget.howDimensions')}</p>
                    <p style={{ margin: '0 0 4px' }}>{t('widget.howMeasures')}</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      {type === 'table' ? `💡 ${t('widget.hintTable')}` :
                       type === 'kpi' ? `💡 ${t('widget.hintKpi')}` :
                       `💡 ${t('widget.hintChart')}`}
                    </p>
                  </div>
                </div>

                <div className="config-section">
                  <div className="config-section-title">
                    {t('widget.dimensions')}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 6px' }}>
                    {t('widget.dimensionsHint')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sqlColumns.filter((c) => !c.isNumeric).map((col) => (
                      <label key={col.key} className="form-checkbox">
                        <input type="checkbox" checked={sqlDimensions.includes(col.key)} onChange={() => toggleSqlDimension(col.key)} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {col.label}
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-tertiary, #161b22)', padding: '1px 5px', borderRadius: 3 }}>ABC</span>
                        </span>
                      </label>
                    ))}
                    {sqlColumns.filter((c) => c.isNumeric).map((col) => (
                      <label key={col.key} className="form-checkbox">
                        <input type="checkbox" checked={sqlDimensions.includes(col.key)} onChange={() => toggleSqlDimension(col.key)} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {col.label}
                          <span style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--bg-tertiary, #161b22)', padding: '1px 5px', borderRadius: 3 }}>123</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="config-section">
                  <div className="config-section-title">
                    {t('widget.measures')}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }}
                      onClick={() => { const avail = sqlColumns.filter((c) => !sqlMeasures.some((m) => m.field === c.key)); if (avail.length > 0) addSqlMeasure((avail.find((c) => c.isNumeric) || avail[0]).key); }}>
                      + {t('common.add')}
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 6px' }}>
                    {t('widget.measuresHint')}
                  </p>
                  {sqlMeasures.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <select className="form-select" value={m.field} onChange={(e) => updateSqlMeasure(i, { field: e.target.value, alias: e.target.value })}>
                          {sqlColumns.map((col) => (
                            <option key={col.key} value={col.key}>{col.label}{col.isNumeric ? ' ⓝ' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <select className="form-select" value={m.aggregation || 'sum'} onChange={(e) => updateSqlMeasure(i, { aggregation: e.target.value })}>
                          {AGG_OPTIONS.map((a) => (<option key={a.value} value={a.value}>{t(a.labelKey)}</option>))}
                        </select>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeSqlMeasure(i)} style={{ color: 'var(--danger)', flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  {sqlMeasures.length === 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('widget.addMeasureHint')}</p>
                  )}
                </div>

                {/* Live preview summary */}
                <div className="config-section" style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      <strong>{sqlPreview?.rowCount || 0}</strong> {t('common.rows')} &middot; <strong>{sqlColumns.length}</strong> {t('common.columns')}
                    </div>
                    {sqlDimensions.length > 0 && sqlMeasures.length > 0 && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {t('widget.willGroupBy')} <strong>{sqlDimensions.join(', ')}</strong> {t('widget.andShow')}{' '}
                        {sqlMeasures.map((m) => `${m.aggregation?.toUpperCase() || 'SUM'}(${m.field})`).join(', ')}
                      </div>
                    )}
                    {sqlDimensions.length === 0 && sqlMeasures.length > 0 && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {t('widget.noGrouping')} {sqlMeasures.map((m) => `${m.aggregation?.toUpperCase() || 'SUM'}(${m.field})`).join(', ')}
                      </div>
                    )}
                    {sqlDimensions.length === 0 && sqlMeasures.length === 0 && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {t('widget.selectDimMeasure')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Visual Builder Source */}
        {dataSourceType === 'visual' && (
          <div className="config-section">
            <div className="config-section-title">{t('widget.source')}</div>
            <div className="form-group">
              <select className="form-select" value={source} onChange={(e) => handleSourceChange(e.target.value)}>
                <option value="">{t('widget.selectSource')}</option>
                {schema && Object.entries(schema).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
              </select>
            </div>
          </div>
        )}

        {/* Slicer Config */}
        {dataSourceType === 'visual' && isSlicer && sourceSchema && (
          <div className="config-section">
            <div className="config-section-title">{t('widget.slicerField')}</div>
            <div className="form-group">
              <select className="form-select" value={slicerField} onChange={(e) => setSlicerField(e.target.value)}>
                <option value="">{t('widget.selectFilter')}</option>
                {sourceSchema.dimensions.map((dim) => (<option key={dim.key} value={dim.key}>{dim.label}</option>))}
              </select>
            </div>
          </div>
        )}

        {/* Dimensions & Measures for non-slicer */}
        {dataSourceType === 'visual' && !isSlicer && sourceSchema && (
          <>
            <div className="config-section">
              <div className="config-section-title">{t('widget.dimensions')}</div>
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
                {t('widget.measures')}
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addMeasure}>+ {t('common.add')}</button>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, padding: '2px 8px', color: 'var(--purple)' }} onClick={addCalculatedField} title="Add Calculated Field">fx</button>
              </div>
              {measures.map((m, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  {m.type === 'calculated' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--purple-soft, #30363d)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple, #a371f7)' }}>{t('widget.calculatedField')}</span>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeMeasure(i)} style={{ color: 'var(--danger)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      <input className="form-input" placeholder={t('widget.alias')} value={m.alias} onChange={(e) => updateMeasure(i, { alias: e.target.value })} style={{ fontSize: 11 }} />
                      <input className="form-input" placeholder={t('widget.calcPlaceholder')} value={m.expression || ''} onChange={(e) => updateMeasure(i, { expression: e.target.value })} style={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('widget.calcHint')}</span>
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
                          {AGG_OPTIONS.map((a) => (<option key={a.value} value={a.value}>{t(a.labelKey)}</option>))}
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
            <div className="config-section-title">{t('widget.kpiDisplay')}</div>
            <div className="form-group">
              <label className="form-label">{t('widget.format')}</label>
              <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="number">{t('widget.number')}</option>
                <option value="currency">{t('widget.currency')}</option>
                <option value="percentage">{t('widget.percentage')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('widget.prefix')}</label>
              <input className="form-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder={t('widget.prefixPlaceholder')} />
            </div>
          </div>
        )}

        {/* Gauge Config */}
        {isGauge && (
          <div className="config-section">
            <div className="config-section-title">{t('widget.gaugeSettings')}</div>
            <div className="form-group">
              <label className="form-label">{t('widget.targetValue')}</label>
              <input className="form-input" type="number" value={gaugeTarget} onChange={(e) => setGaugeTarget(e.target.value)} />
            </div>
          </div>
        )}

        {/* Conditional Formatting */}
        {showCondFormatting && (
          <div className="config-section">
            <div className="config-section-title">
              {t('widget.conditionalFormatting')}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={addCondRule}>{t('widget.addRule')}</button>
            </div>
            {conditionalRules.map((rule, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('widget.ifValue')}</span>
                <select className="form-select" value={rule.operator} onChange={(e) => updateCondRule(i, { operator: e.target.value })} style={{ width: 50 }}>
                  {COND_OPERATORS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                <input className="form-input" type="number" value={rule.value} onChange={(e) => updateCondRule(i, { value: e.target.value })} style={{ width: 70 }} placeholder="value" />
                <select className="form-select" value={rule.color} onChange={(e) => updateCondRule(i, { color: e.target.value })} style={{ width: 80 }}>
                  {COND_COLORS.map((c) => (<option key={c.value} value={c.value}>{t(c.labelKey)}</option>))}
                </select>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: rule.color, flexShrink: 0 }} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeCondRule(i)} style={{ color: 'var(--danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
            {conditionalRules.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('widget.condHint')}</p>
            )}
          </div>
        )}

        {/* Options */}
        {!isSlicer && (
          <div className="config-section">
            <div className="config-section-title">{t('widget.options')}</div>
            <div className="form-group">
              <label className="form-label">{t('widget.rowLimit')}</label>
              <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={10000} />
            </div>
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyChanges}>
          {t('widget.applyChanges')}
        </button>
      </div>
    </div>
  );
}
