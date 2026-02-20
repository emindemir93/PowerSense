import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, formatNumber, formatAxisValue, formatTableValue, truncateLabel, getConditionalColor } from '../utils/helpers';
import { useTranslation } from '../i18n';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#21262d', border: '1px solid #30363d', borderRadius: 6, fontSize: 12, color: '#e6edf3', padding: '8px 12px' },
  itemStyle: { color: '#e6edf3' },
  labelStyle: { color: '#8b949e', marginBottom: 4 },
};

const AXIS_STYLE = {
  tick: { fill: '#8b949e', fontSize: 11 },
  axisLine: { stroke: '#30363d' },
  tickLine: false,
};

function getDimensionKey(widget) { return widget.data_config?.dimensions?.[0] || 'dim_0'; }
function getMeasureKeys(widget) { return (widget.data_config?.measures || []).map((m, i) => m.alias || `measure_${i}`); }
function getMeasureLabels(widget) { return (widget.data_config?.measures || []).map((m) => m.alias || m.field || 'Value'); }
function getColors(widget) { return widget.visual_config?.colors || CHART_COLORS; }

export default function WidgetRenderer({ widget, data, loading, onCrossFilter, activeCrossFilter }) {
  const { t } = useTranslation();
  if (loading) return <div className="loading-spinner" />;
  if (!data || data.length === 0) {
    return <div className="empty-state" style={{ padding: 16 }}><p style={{ fontSize: 12 }}>{t('widget.noData')}</p></div>;
  }

  switch (widget.type) {
    case 'kpi': return <KPIWidget widget={widget} data={data} />;
    case 'bar': return <BarChartWidget widget={widget} data={data} onCrossFilter={onCrossFilter} activeCrossFilter={activeCrossFilter} />;
    case 'hbar': return <HBarChartWidget widget={widget} data={data} onCrossFilter={onCrossFilter} activeCrossFilter={activeCrossFilter} />;
    case 'line': return <LineChartWidget widget={widget} data={data} />;
    case 'area': return <AreaChartWidget widget={widget} data={data} />;
    case 'pie': return <PieChartWidget widget={widget} data={data} onCrossFilter={onCrossFilter} innerRadius={0} />;
    case 'donut': return <PieChartWidget widget={widget} data={data} onCrossFilter={onCrossFilter} innerRadius="60%" />;
    case 'scatter': return <ScatterChartWidget widget={widget} data={data} />;
    case 'table': return <TableWidget widget={widget} data={data} />;
    case 'gauge': return <GaugeWidget widget={widget} data={data} />;
    case 'funnel': return <FunnelChartWidget widget={widget} data={data} />;
    case 'treemap': return <TreemapWidget widget={widget} data={data} />;
    case 'waterfall': return <WaterfallWidget widget={widget} data={data} />;
    case 'regionmap': return <RegionMapWidget widget={widget} data={data} onCrossFilter={onCrossFilter} />;
    case 'pivot': return <PivotTableWidget widget={widget} data={data} />;
    default: return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unknown: {widget.type}</div>;
  }
}

function KPIWidget({ widget, data }) {
  const vc = widget.visual_config || {};
  const value = data?.[0] ? Object.values(data[0]).find((v) => typeof v === 'number') ?? Object.values(data[0])[0] : 0;
  const condColor = getConditionalColor(value, vc.conditionalRules);

  return (
    <div className="kpi-widget">
      <div className="kpi-value" style={{ color: condColor || vc.color || 'var(--accent)' }}>
        {formatNumber(value, vc.format, vc.prefix, vc.suffix)}
      </div>
      <div className="kpi-label">{widget.title}</div>
    </div>
  );
}

function BarChartWidget({ widget, data, onCrossFilter, activeCrossFilter }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const measureLabels = getMeasureLabels(widget);
  const colors = getColors(widget);
  const chartData = useMemo(() => data.map((d) => ({ ...d, name: truncateLabel(d[dimKey], 16) })), [data, dimKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="name" {...AXIS_STYLE} interval={0} angle={chartData.length > 6 ? -35 : 0} textAnchor={chartData.length > 6 ? 'end' : 'middle'} height={chartData.length > 6 ? 60 : 30} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisValue} width={50} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        {measureKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />}
        {measureKeys.map((key, i) => (
          <Bar key={key} dataKey={key} name={measureLabels[i]} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} cursor="pointer"
            onClick={(d) => onCrossFilter && onCrossFilter(dimKey, d[dimKey])} opacity={activeCrossFilter ? 0.4 : 1}>
            {activeCrossFilter && chartData.map((entry, idx) => (
              <Cell key={idx} opacity={entry[dimKey] === activeCrossFilter.value ? 1 : 0.4} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function HBarChartWidget({ widget, data, onCrossFilter, activeCrossFilter }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const measureLabels = getMeasureLabels(widget);
  const colors = getColors(widget);
  const chartData = useMemo(() => data.map((d) => ({ ...d, name: truncateLabel(d[dimKey], 20) })), [data, dimKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis type="number" {...AXIS_STYLE} tickFormatter={formatAxisValue} />
        <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={100} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        {measureKeys.map((key, i) => (
          <Bar key={key} dataKey={key} name={measureLabels[i]} fill={colors[i % colors.length]} radius={[0, 3, 3, 0]} cursor="pointer"
            onClick={(d) => onCrossFilter && onCrossFilter(dimKey, d[dimKey])} opacity={activeCrossFilter ? 0.4 : 1}>
            {activeCrossFilter && chartData.map((entry, idx) => (
              <Cell key={idx} opacity={entry[dimKey] === activeCrossFilter.value ? 1 : 0.4} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartWidget({ widget, data }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const measureLabels = getMeasureLabels(widget);
  const colors = getColors(widget);
  const chartData = useMemo(() => data.map((d) => ({ ...d, name: d[dimKey] })), [data, dimKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="name" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisValue} width={50} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        {measureKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />}
        {measureKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} name={measureLabels[i]} stroke={colors[i % colors.length]} strokeWidth={2}
            dot={{ r: 3, fill: colors[i % colors.length] }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartWidget({ widget, data }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const measureLabels = getMeasureLabels(widget);
  const colors = getColors(widget);
  const chartData = useMemo(() => data.map((d) => ({ ...d, name: d[dimKey] })), [data, dimKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <defs>
          {measureKeys.map((key, i) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="name" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisValue} width={50} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        {measureKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />}
        {measureKeys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key} name={measureLabels[i]} stroke={colors[i % colors.length]} strokeWidth={2} fill={`url(#grad-${key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieChartWidget({ widget, data, onCrossFilter, innerRadius = 0 }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const colors = getColors(widget);
  const chartData = useMemo(() => data.map((d) => ({ name: d[dimKey] || 'Unknown', value: parseFloat(d[measureKeys[0]]) || 0, rawDimValue: d[dimKey] })), [data, dimKey, measureKeys]);
  const renderLabel = ({ name, percent }) => `${truncateLabel(name, 12)} ${(percent * 100).toFixed(0)}%`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius="80%" paddingAngle={2} dataKey="value"
          label={widget.visual_config?.showLabels !== false ? renderLabel : false} labelLine={false} cursor="pointer"
          onClick={(d) => onCrossFilter && onCrossFilter(dimKey, d.rawDimValue)} style={{ fontSize: 11, fill: '#8b949e' }}>
          {chartData.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterChartWidget({ widget, data }) {
  const { t } = useTranslation();
  const dims = widget.data_config?.dimensions || [];
  const measures = widget.data_config?.measures || [];
  const colors = getColors(widget);
  const xKey = measures.length >= 2 ? (measures[0].alias || 'measure_0') : '';
  const yKey = measures.length >= 2 ? (measures[1].alias || 'measure_1') : '';
  const dimKey = dims[0] || null;
  const chartData = useMemo(() => {
    if (!xKey || !yKey) return [];
    return data.map((d) => ({ x: parseFloat(d[xKey]) || 0, y: parseFloat(d[yKey]) || 0, name: dimKey ? d[dimKey] : '' }));
  }, [data, xKey, yKey, dimKey]);

  if (measures.length < 2) return <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{t('widget.scatterRequires')}</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis type="number" dataKey="x" name={xKey} {...AXIS_STYLE} tickFormatter={formatAxisValue} />
        <YAxis type="number" dataKey="y" name={yKey} {...AXIS_STYLE} tickFormatter={formatAxisValue} width={50} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        <Scatter data={chartData} fill={colors[0]}>
          {chartData.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function TableWidget({ widget, data }) {
  const condRules = widget.visual_config?.conditionalRules || [];
  const isSql = widget.data_config?.type === 'sql';

  const columns = useMemo(() => {
    if (isSql && data?.length > 0) {
      return Object.keys(data[0]).map((key) => {
        const isNum = data.some((row) => typeof row[key] === 'number' || (row[key] !== null && !isNaN(Number(row[key]))));
        return { key, label: key.replace(/_/g, ' '), type: isNum ? 'measure' : 'dimension' };
      });
    }
    const dims = widget.data_config?.dimensions || [];
    const measures = widget.data_config?.measures || [];
    const cols = [];
    dims.forEach((d) => cols.push({ key: d, label: d.replace(/_/g, ' '), type: 'dimension' }));
    measures.forEach((m, i) => {
      const alias = m.alias || `measure_${i}`;
      cols.push({ key: alias, label: (m.alias || m.field || '').replace(/_/g, ' '), type: 'measure' });
    });
    return cols;
  }, [widget.data_config, data, isSql]);

  return (
    <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
      <table className="widget-table">
        <thead>
          <tr>{columns.map((col) => (<th key={col.key} style={{ textTransform: 'capitalize' }}>{col.label}</th>))}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => {
                const val = row[col.key];
                const condColor = col.type === 'measure' ? getConditionalColor(val, condRules) : null;
                return (
                  <td key={col.key} style={{
                    textAlign: col.type === 'measure' ? 'right' : 'left',
                    fontVariantNumeric: col.type === 'measure' ? 'tabular-nums' : undefined,
                    color: condColor || undefined,
                    fontWeight: condColor ? 600 : undefined,
                  }}>
                    {col.type === 'measure' ? formatTableValue(val) : (val ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GaugeWidget({ widget, data }) {
  const vc = widget.visual_config || {};
  const value = data?.[0] ? Object.values(data[0]).find((v) => typeof v === 'number') ?? 0 : 0;
  const target = parseFloat(vc.gaugeTarget) || 100;
  const pct = Math.min(Math.max((value / target) * 100, 0), 100);
  const angle = -90 + (pct / 100) * 180;
  const color = pct >= 80 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <svg viewBox="0 0 200 120" style={{ width: '80%', maxWidth: 240 }}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#21262d" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${pct * 2.51} 251`} />
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="32" stroke="#e6edf3" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="5" fill="#e6edf3" />
        <text x="100" y="88" textAnchor="middle" fill={color} fontSize="22" fontWeight="700">
          {formatAxisValue(value)}
        </text>
        <text x="100" y="115" textAnchor="middle" fill="#8b949e" fontSize="10">
          Target: {formatAxisValue(target)} ({pct.toFixed(0)}%)
        </text>
      </svg>
    </div>
  );
}

function FunnelChartWidget({ widget, data }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const colors = getColors(widget);

  const chartData = useMemo(() =>
    data.map((d, i) => ({
      name: d[dimKey] || `Step ${i + 1}`,
      value: parseFloat(d[measureKeys[0]]) || 0,
      fill: colors[i % colors.length],
    })).sort((a, b) => b.value - a.value),
    [data, dimKey, measureKeys, colors]
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
        <Funnel dataKey="value" data={chartData} isAnimationActive>
          <LabelList position="right" fill="#e6edf3" stroke="none" fontSize={11}
            formatter={(v) => formatAxisValue(v)} />
          <LabelList position="left" fill="#8b949e" stroke="none" fontSize={11}
            dataKey="name" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

const TREEMAP_COLORS = ['#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149', '#58a6ff', '#bc8cff', '#56d364'];

function TreemapWidget({ widget, data }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);

  const chartData = useMemo(() =>
    data.map((d, i) => ({
      name: truncateLabel(d[dimKey] || `Item ${i}`, 18),
      size: parseFloat(d[measureKeys[0]]) || 0,
      fill: TREEMAP_COLORS[i % TREEMAP_COLORS.length],
    })),
    [data, dimKey, measureKeys]
  );

  const CustomContent = ({ x, y, width, height, name, size, fill }) => {
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#0d1117" strokeWidth={2} rx={4} style={{ opacity: 0.85 }} />
        {width > 50 && height > 35 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
              {name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>
              {formatAxisValue(size)}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap data={chartData} dataKey="size" nameKey="name" content={<CustomContent />}>
        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatAxisValue(v)} />
      </Treemap>
    </ResponsiveContainer>
  );
}

function WaterfallWidget({ widget, data }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return data.map((d) => {
      const val = parseFloat(d[measureKeys[0]]) || 0;
      const base = cumulative;
      cumulative += val;
      return {
        name: truncateLabel(d[dimKey], 14),
        base: Math.min(base, cumulative),
        value: Math.abs(val),
        total: cumulative,
        isPositive: val >= 0,
        rawValue: val,
      };
    });
  }, [data, dimKey, measureKeys]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="name" {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisValue} width={50} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(v, name, props) => {
          if (name === 'base') return [null, null];
          return [formatAxisValue(props.payload.rawValue), 'Value'];
        }} />
        <Bar dataKey="base" stackId="stack" fill="transparent" />
        <Bar dataKey="value" stackId="stack" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.isPositive ? '#3fb950' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RegionMapWidget({ widget, data, onCrossFilter }) {
  const dimKey = getDimensionKey(widget);
  const measureKeys = getMeasureKeys(widget);
  const colors = ['#0e4429', '#006d32', '#26a641', '#39d353', '#3fb950'];

  const { items, maxVal } = useMemo(() => {
    const items = data.map((d) => ({
      name: d[dimKey] || 'Unknown',
      value: parseFloat(d[measureKeys[0]]) || 0,
    })).sort((a, b) => b.value - a.value);
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    return { items, maxVal };
  }, [data, dimKey, measureKeys]);

  const getColor = (val) => {
    const idx = Math.floor((val / maxVal) * (colors.length - 1));
    return colors[Math.min(idx, colors.length - 1)];
  };

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
        {items.map((item) => (
          <div key={item.name} onClick={() => onCrossFilter && onCrossFilter(dimKey, item.name)}
            style={{
              background: getColor(item.value), borderRadius: 6, padding: '10px 8px',
              cursor: 'pointer', transition: 'transform 0.15s', textAlign: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {formatTableValue(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PivotTableWidget({ widget, data }) {
  const { t } = useTranslation();
  const condRules = widget.visual_config?.conditionalRules || [];

  const { rowDim, colDim, pivotData, colValues, measures: pivotMeasures } = useMemo(() => {
    const dims = widget.data_config?.dimensions || [];
    const measures = widget.data_config?.measures || [];
    const rowDim = dims[0] || null;
    const colDim = dims.length >= 2 ? dims[1] : null;
    const measureAlias = measures[0]?.alias || 'measure_0';

    if (!colDim) {
      return { rowDim, colDim: null, pivotData: data, colValues: [], measures };
    }

    const colValues = [...new Set(data.map((d) => d[colDim]))].sort();
    const rowMap = {};
    data.forEach((d) => {
      const rKey = d[rowDim] ?? 'Unknown';
      if (!rowMap[rKey]) rowMap[rKey] = { [rowDim]: rKey, __total: 0 };
      const val = parseFloat(d[measureAlias]) || 0;
      rowMap[rKey][d[colDim]] = val;
      rowMap[rKey].__total += val;
    });

    return { rowDim, colDim, pivotData: Object.values(rowMap), colValues, measures };
  }, [data, widget.data_config]);

  if (!rowDim) return <div className="empty-state"><p style={{ fontSize: 12 }}>{t('widget.pivotRequires')}</p></div>;

  if (!colDim) {
    return (
      <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
        <table className="widget-table">
          <thead><tr><th>{rowDim}</th>{pivotMeasures.map((m, i) => <th key={i}>{m.alias || m.field}</th>)}</tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row[rowDim] ?? '-'}</td>
                {pivotMeasures.map((m, mi) => {
                  const alias = m.alias || `measure_${mi}`;
                  const val = row[alias];
                  const cc = getConditionalColor(val, condRules);
                  return <td key={mi} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: cc || undefined, fontWeight: cc ? 600 : undefined }}>{formatTableValue(val)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
      <table className="widget-table">
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-tertiary)', zIndex: 2 }}>{rowDim}</th>
            {colValues.map((cv) => <th key={cv}>{truncateLabel(cv, 14)}</th>)}
            <th style={{ fontWeight: 700 }}>{t('common.total')}</th>
          </tr>
        </thead>
        <tbody>
          {pivotData.map((row, i) => (
            <tr key={i}>
              <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1, fontWeight: 500 }}>{row[rowDim]}</td>
              {colValues.map((cv) => {
                const val = row[cv] || 0;
                const cc = getConditionalColor(val, condRules);
                return <td key={cv} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: cc || undefined, fontWeight: cc ? 600 : undefined }}>{val ? formatTableValue(val) : '-'}</td>;
              })}
              <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTableValue(row.__total || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
