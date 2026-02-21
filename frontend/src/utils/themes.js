export const DASHBOARD_THEMES = {
  default: {
    name: 'Default',
    nameKey: 'themes.default',
    colors: ['#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149', '#58a6ff', '#bc8cff', '#56d364'],
    bg: 'var(--bg-primary)',
    cardBg: 'var(--bg-secondary)',
    textColor: 'var(--text-primary)',
  },
  ocean: {
    name: 'Ocean',
    nameKey: 'themes.ocean',
    colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#2dd4bf', '#67e8f9', '#38bdf8', '#7dd3fc', '#a5f3fc'],
    bg: '#0c1929',
    cardBg: '#0f2337',
    textColor: '#e0f2fe',
  },
  sunset: {
    name: 'Sunset',
    nameKey: 'themes.sunset',
    colors: ['#f97316', '#ef4444', '#ec4899', '#f59e0b', '#fb923c', '#f87171', '#f472b6', '#fbbf24'],
    bg: '#1a0f0a',
    cardBg: '#261510',
    textColor: '#fef3c7',
  },
  forest: {
    name: 'Forest',
    nameKey: 'themes.forest',
    colors: ['#22c55e', '#10b981', '#059669', '#84cc16', '#34d399', '#4ade80', '#a3e635', '#86efac'],
    bg: '#0a1a0f',
    cardBg: '#0f261a',
    textColor: '#dcfce7',
  },
  corporate: {
    name: 'Corporate',
    nameKey: 'themes.corporate',
    colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#a78bfa', '#818cf8', '#93c5fd', '#c4b5fd'],
    bg: '#111827',
    cardBg: '#1f2937',
    textColor: '#f3f4f6',
  },
  vibrant: {
    name: 'Vibrant',
    nameKey: 'themes.vibrant',
    colors: ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#a855f7', '#22d3ee', '#fbbf24'],
    bg: '#0f0720',
    cardBg: '#1a0f30',
    textColor: '#faf5ff',
  },
};

export const getThemeColors = (themeId) => {
  return DASHBOARD_THEMES[themeId]?.colors || DASHBOARD_THEMES.default.colors;
};
