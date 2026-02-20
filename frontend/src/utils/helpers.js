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
];

export function formatNumber(value, format, prefix = '', suffix = '') {
  if (value === null || value === undefined) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);

  let formatted;
  if (format === 'currency') {
    if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      formatted = (num / 1e3).toFixed(1) + 'K';
    } else {
      formatted = num.toFixed(2);
    }
  } else if (format === 'percentage') {
    formatted = num.toFixed(1) + '%';
  } else {
    if (num >= 1e6) {
      formatted = (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
      formatted = (num / 1e3).toFixed(1) + 'K';
    } else if (Number.isInteger(num)) {
      formatted = num.toLocaleString();
    } else {
      formatted = num.toFixed(2);
    }
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

export function buildQueryPayload(dataConfig, crossFilters = []) {
  if (!dataConfig || !dataConfig.source) return null;

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

  return payload;
}

export function isWidgetConfigured(widget) {
  const dc = widget?.data_config;
  if (!dc || !dc.source) return false;
  if ((!dc.dimensions || dc.dimensions.length === 0) && (!dc.measures || dc.measures.length === 0)) return false;
  return true;
}
