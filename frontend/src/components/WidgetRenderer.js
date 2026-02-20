import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, formatNumber, formatAxisValue, truncateLabel, getConditionalColor } from '../utils/helpers';

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
  if (loading) return <div className="loading-spinner" />;
  if (!data || data.length === 0) {
    return <div className="empty-state" style={{ padding: 16 }}><p style={{ fontSize: 12 }}>No data available</p></div>;
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

  if (measures.length < 2) return <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>Scatter requires 2+ measures</div>;

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
  const dims = widget.data_config?.dimensions || [];
  const measures = widget.data_config?.measures || [];
  const condRules = widget.visual_config?.conditionalRules || [];

  const columns = useMemo(() => {
    const cols = [];
    dims.forEach((d) => cols.push({ key: d, label: d.replace(/_/g, ' '), type: 'dimension' }));
    measures.forEach((m, i) => {
      const alias = m.alias || `measure_${i}`;
      cols.push({ key: alias, label: (m.alias || m.field || '').replace(/_/g, ' '), type: 'measure' });
    });
    return cols;
  }, [dims, measures]);

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
                    {col.type === 'measure' ? formatAxisValue(val) : (val ?? '-')}
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
