export const CHART_COLORS = [
  '#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149',
  '#58a6ff', '#bc8cff', '#56d364', '#db6d28', '#f778ba',
  '#79c0ff', '#d2a8ff', '#7ee787', '#e3b341', '#ffa198',
];

export const WIDGET_TYPES = [
  { type: 'kpi', label: 'KPI Card', icon: 'kpi', defaultSize: { w: 3, h: 2 } },
  { type: 'bar', label: 'Bar Chart', icon: 'bar', defaultSize: { w: 6, h: 5 } },
  { type: 'hbar', label: 'Horizontal Bar', icon: 'hbar', defaultSize: { w: 6, h: 5 } },
  { type: 'line', label: 'Line Chart', icon: 'line', defaultSize: { w: 8, h: 5 } },
  { type: 'area', label: 'Area Chart', icon: 'area', defaultSize: { w: 8, h: 5 } },
  { type: 'pie', label: 'Pie Chart', icon: 'pie', defaultSize: { w: 4, h: 5 } },
  { type: 'donut', label: 'Donut Chart', icon: 'donut', defaultSize: { w: 4, h: 5 } },
  { type: 'scatter', label: 'Scatter Plot', icon: 'scatter', defaultSize: { w: 6, h: 5 } },
  { type: 'table', label: 'Data Table', icon: 'table', defaultSize: { w: 6, h: 5 } },
  { type: 'slicer', label: 'Slicer (Filter)', icon: 'slicer', defaultSize: { w: 3, h: 4 } },
  { type: 'gauge', label: 'Gauge', icon: 'gauge', defaultSize: { w: 3, h: 3 } },
  { type: 'funnel', label: 'Funnel Chart', icon: 'funnel', defaultSize: { w: 4, h: 5 } },
  { type: 'treemap', label: 'Treemap', icon: 'treemap', defaultSize: { w: 6, h: 5 } },
  { type: 'waterfall', label: 'Waterfall Chart', icon: 'waterfall', defaultSize: { w: 8, h: 5 } },
  { type: 'regionmap', label: 'Region Map', icon: 'regionmap', defaultSize: { w: 6, h: 5 } },
  { type: 'pivot', label: 'Pivot Table', icon: 'pivot', defaultSize: { w: 8, h: 6 } },
];

export const DRILL_HIERARCHIES = {
  orders: {
    geo: ['region', 'customer_city', 'customer_name'],
    time: ['year', 'quarter', 'month'],
    product: ['category', 'product'],
  },
  customers: {
    geo: ['region', 'city', 'name'],
  },
  products: {
    product: ['category', 'name'],
  },
};

export function formatNumber(value, format, prefix = '', suffix = '') {
  if (value === null || value === undefined) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);

  let formatted;
  if (format === 'currency') {
    if (num >= 1e6) formatted = (num / 1e6).toFixed(1) + 'M';
    else if (num >= 1e3) formatted = (num / 1e3).toFixed(1) + 'K';
    else formatted = num.toFixed(2);
  } else if (format === 'percentage') {
    formatted = num.toFixed(1) + '%';
  } else {
    if (num >= 1e6) formatted = (num / 1e6).toFixed(1) + 'M';
    else if (num >= 1e3) formatted = (num / 1e3).toFixed(1) + 'K';
    else if (Number.isInteger(num)) formatted = num.toLocaleString();
    else formatted = num.toFixed(2);
  }

  return `${prefix}${formatted}${suffix}`;
}

export function formatAxisValue(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
  return num.toLocaleString();
}

export function truncateLabel(label, maxLen = 20) {
  if (!label) return '';
  const str = String(label);
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

export function buildQueryPayload(dataConfig, crossFilters = [], dateRange = null) {
  if (!dataConfig) return null;
  if (dataConfig.type === 'sql') return dataConfig;
  if (!dataConfig.source) return null;

  const payload = {
    source: dataConfig.source,
    dimensions: dataConfig.dimensions || [],
    measures: dataConfig.measures || [],
    filters: { ...(dataConfig.filters || {}) },
    sort: dataConfig.sort || undefined,
    limit: dataConfig.limit || 1000,
  };

  for (const cf of crossFilters) {
    if (cf.source === dataConfig.source && cf.field) {
      const existing = payload.filters[cf.field];
      if (Array.isArray(existing)) {
        if (!existing.includes(cf.value)) existing.push(cf.value);
      } else if (existing && existing !== cf.value) {
        payload.filters[cf.field] = [existing, cf.value];
      } else {
        payload.filters[cf.field] = cf.value;
      }
    }
  }

  if (dateRange && dateRange.from) payload.filters.date_from = dateRange.from;
  if (dateRange && dateRange.to) payload.filters.date_to = dateRange.to;

  return payload;
}

export function isWidgetConfigured(widget) {
  if (widget?.type === 'slicer') {
    const dc = widget?.data_config;
    return dc?.source && dc?.slicerField;
  }
  const dc = widget?.data_config;
  if (dc?.type === 'sql' && dc?.sql) return true;
  if (!dc || !dc.source) return false;
  if ((!dc.dimensions || dc.dimensions.length === 0) && (!dc.measures || dc.measures.length === 0)) return false;
  return true;
}

export function getConditionalColor(value, rules) {
  if (!rules || rules.length === 0 || value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  for (const rule of rules) {
    const threshold = parseFloat(rule.value);
    if (isNaN(threshold)) continue;
    if (rule.operator === '<' && num < threshold) return rule.color;
    if (rule.operator === '>' && num > threshold) return rule.color;
    if (rule.operator === '<=' && num <= threshold) return rule.color;
    if (rule.operator === '>=' && num >= threshold) return rule.color;
    if (rule.operator === '=' && num === threshold) return rule.color;
  }
  return null;
}

export function getDrillHierarchy(source, currentDimension) {
  const hierarchies = DRILL_HIERARCHIES[source];
  if (!hierarchies) return null;
  for (const [, chain] of Object.entries(hierarchies)) {
    const idx = chain.indexOf(currentDimension);
    if (idx >= 0 && idx < chain.length - 1) {
      return { next: chain[idx + 1], chain, currentIndex: idx };
    }
  }
  return null;
}
