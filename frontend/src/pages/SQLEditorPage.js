import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sqlApi } from '../services/api';
import { formatAxisValue } from '../utils/helpers';

const EXAMPLE_QUERIES = [
  {
    label: 'Users who bought products',
    sql: `SELECT u.name AS customer, p.name AS product, o.quantity, o.total_price
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN products p ON p.id = o.product_id
ORDER BY o.created_at DESC
LIMIT 50`,
  },
  {
    label: 'Revenue by category & region',
    sql: `SELECT c.name AS category, u.city AS region,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(o.total_price) AS total_revenue,
  ROUND(AVG(o.total_price), 2) AS avg_order_value
FROM orders o
JOIN products p ON p.id = o.product_id
JOIN categories c ON c.id = p.category_id
JOIN users u ON u.id = o.user_id
GROUP BY c.name, u.city
ORDER BY total_revenue DESC`,
  },
  {
    label: 'Top customers by spend',
    sql: `SELECT u.name, u.email, u.city,
  COUNT(o.id) AS total_orders,
  SUM(o.total_price) AS total_spent,
  MAX(o.created_at) AS last_order
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name, u.email, u.city
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 20`,
  },
  {
    label: 'Product performance',
    sql: `SELECT p.name AS product, c.name AS category,
  p.price AS unit_price,
  COALESCE(SUM(o.quantity), 0) AS units_sold,
  COALESCE(SUM(o.total_price), 0) AS revenue,
  COUNT(DISTINCT o.user_id) AS unique_buyers
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN orders o ON o.product_id = p.id
GROUP BY p.id, p.name, c.name, p.price
ORDER BY revenue DESC`,
  },
  {
    label: 'Monthly sales trend',
    sql: `SELECT
  TO_CHAR(o.created_at, 'YYYY-MM') AS month,
  COUNT(*) AS orders,
  SUM(o.total_price) AS revenue,
  COUNT(DISTINCT o.user_id) AS unique_customers
FROM orders o
GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
ORDER BY month`,
  },
];

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'CROSS JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL',
  'IS NOT NULL', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS',
  'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'UNION ALL', 'WITH',
  'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST', 'EXISTS', 'ANY', 'ALL',
  'LATERAL', 'CROSS APPLY', 'OUTER APPLY',
];

export default function SQLEditorPage() {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [expandedTables, setExpandedTables] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef(null);

  const { data: tables } = useQuery({
    queryKey: ['sql-tables'],
    queryFn: () => sqlApi.tables().then((r) => r.data.data),
  });

  const executeQuery = useCallback(async () => {
    if (!sql.trim() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await sqlApi.execute(sql.trim());
      setResult(res.data.data);
      setHistory((prev) => {
        const entry = { sql: sql.trim(), time: new Date().toISOString(), rows: res.data.data.rowCount, elapsed: res.data.data.elapsed };
        return [entry, ...prev.filter((h) => h.sql !== sql.trim())].slice(0, 50);
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Query failed';
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [sql, running]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [executeQuery]);

  const handleExportCSV = () => {
    if (!result?.rows?.length) return;
    const fields = result.fields.map((f) => f.name);
    const lines = [fields.join(',')];
    result.rows.forEach((row) => {
      lines.push(fields.map((f) => {
        const val = row[f];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newSql = sql.substring(0, start) + text + sql.substring(end);
    setSql(newSql);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  };

  const toggleTable = (name) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const filteredTables = tables?.filter((t) => {
    if (!schemaSearch) return true;
    const s = schemaSearch.toLowerCase();
    return t.name.toLowerCase().includes(s) ||
      t.columns.some((c) => c.column.toLowerCase().includes(s));
  }) || [];

  const lineCount = sql.split('\n').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="toolbar" style={{ gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SQL Editor</span>
        </div>

        <div className="toolbar-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExamples(!showExamples)}
            style={{ position: 'relative' }}>
            Examples
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(!showHistory)}>
            History ({history.length})
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button
            className="btn btn-primary btn-sm"
            onClick={executeQuery}
            disabled={!sql.trim() || running}
            style={{ minWidth: 120 }}
          >
            {running ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="loading-spinner" style={{ width: 12, height: 12 }} /> Running...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run (Ctrl+Enter)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Examples Dropdown */}
      {showExamples && (
        <div style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EXAMPLE_QUERIES.map((eq, i) => (
            <button key={i} className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6 }}
              onClick={() => { setSql(eq.sql); setShowExamples(false); setResult(null); setError(null); }}>
              {eq.label}
            </button>
          ))}
        </div>
      )}

      {/* History Dropdown */}
      {showHistory && history.length > 0 && (
        <div style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', padding: 8, maxHeight: 200, overflow: 'auto' }}>
          {history.map((h, i) => (
            <div key={i} onClick={() => { setSql(h.sql); setShowHistory(false); setResult(null); setError(null); }}
              style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: 10 }}>
                {new Date(h.time).toLocaleTimeString('tr-TR')} · {h.rows} rows · {h.elapsed}ms
              </span>
              {h.sql.substring(0, 120)}
            </div>
          ))}
        </div>
      )}

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Schema Browser */}
        {schemaOpen && (
          <div style={{ width: 260, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Schema Browser</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setSchemaOpen(false)}
                style={{ width: 20, height: 20, padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <input
                value={schemaSearch}
                onChange={(e) => setSchemaSearch(e.target.value)}
                placeholder="Search tables/columns..."
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 8px', color: 'var(--text-primary)', fontSize: 11 }}
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 4px 8px' }}>
              {filteredTables.map((table) => (
                <div key={table.name}>
                  <div
                    onClick={() => toggleTable(table.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      style={{ width: 10, height: 10, transform: expandedTables[table.name] ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    <span
                      onClick={(e) => { e.stopPropagation(); insertAtCursor(table.name); }}
                      title="Click to insert table name"
                      style={{ cursor: 'pointer' }}
                    >
                      {table.name}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{table.columns.length}</span>
                  </div>
                  {expandedTables[table.name] && (
                    <div style={{ paddingLeft: 24 }}>
                      {table.columns.map((col) => {
                        const isFk = table.foreignKeys?.some((fk) => fk.from_column === col.column);
                        return (
                          <div
                            key={col.column}
                            onClick={() => insertAtCursor(col.column)}
                            title={`${col.type}${col.nullable === 'YES' ? ', nullable' : ''}${isFk ? ' (FK)' : ''}\nClick to insert`}
                            style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 4 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            {isFk ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="2" strokeLinecap="round" style={{ width: 9, height: 9, flexShrink: 0 }}>
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                              </svg>
                            ) : (
                              <span style={{ width: 9, display: 'inline-block', flexShrink: 0, textAlign: 'center', color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}>
                                {col.type?.startsWith('int') || col.type === 'numeric' || col.type === 'decimal' ? '#' : col.type?.includes('char') || col.type === 'text' ? 'A' : col.type === 'boolean' ? '?' : col.type?.includes('time') || col.type === 'date' ? 'D' : '·'}
                              </span>
                            )}
                            <span>{col.column}</span>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{col.type}</span>
                          </div>
                        );
                      })}
                      {table.foreignKeys?.length > 0 && (
                        <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border)', marginTop: 2 }}>
                          {table.foreignKeys.map((fk, i) => (
                            <div key={i} style={{ fontSize: 9, color: '#d29922', lineHeight: 1.6 }}>
                              {fk.from_column} → {fk.to_table}.{fk.to_column}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SQL Keywords */}
            <div style={{ borderTop: '1px solid var(--border)', padding: 8, maxHeight: 100, overflow: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Quick Insert</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {SQL_KEYWORDS.slice(0, 20).map((kw) => (
                  <button key={kw} onClick={() => insertAtCursor(kw + ' ')}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'monospace' }}>
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Editor + Results */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* SQL Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2px solid var(--border)', minHeight: 180, maxHeight: '50%' }}>
            {!schemaOpen && (
              <button className="btn btn-ghost btn-sm" onClick={() => setSchemaOpen(true)}
                style={{ position: 'absolute', left: 4, top: 52, zIndex: 10, fontSize: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                Schema
              </button>
            )}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Line Numbers */}
              <div style={{
                width: 40, background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border)',
                padding: '10px 0', fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                fontSize: 12, lineHeight: '20px', color: 'var(--text-muted)', textAlign: 'right',
                userSelect: 'none', overflow: 'hidden',
              }}>
                {Array.from({ length: Math.max(lineCount, 8) }, (_, i) => (
                  <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="Write your SQL query here...&#10;&#10;Example:&#10;SELECT u.name, p.name AS product, o.quantity&#10;FROM orders o&#10;JOIN users u ON u.id = o.user_id&#10;JOIN products p ON p.id = o.product_id"
                spellCheck={false}
                style={{
                  flex: 1, background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  border: 'none', outline: 'none', resize: 'none', padding: '10px 12px',
                  fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                  fontSize: 13, lineHeight: '20px', tabSize: 2,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertAtCursor('  ');
                  }
                }}
              />
            </div>
          </div>

          {/* Results Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Results Header */}
            <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Results
                {result && (
                  <span style={{ fontWeight: 400, fontSize: 11 }}>
                    {result.rowCount} rows · {result.elapsed}ms
                    {result.truncated && <span style={{ color: 'var(--warning)', marginLeft: 4 }}>(truncated at 5000)</span>}
                  </span>
                )}
              </span>
              {result?.rows?.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} style={{ fontSize: 11 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12 }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>

            {/* Results Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {!result && !error && !running && (
                <div className="empty-state" style={{ height: '100%', padding: 40 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 40, height: 40, opacity: 0.5 }}>
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                  <h3 style={{ fontSize: 14, marginTop: 8 }}>Write a SQL query and press Ctrl+Enter to run</h3>
                  <p style={{ fontSize: 12 }}>Click on table/column names in the schema browser to insert them. Try the Examples button for sample queries.</p>
                </div>
              )}

              {running && (
                <div style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <div className="loading-spinner" /> Running query...
                </div>
              )}

              {error && (
                <div style={{ padding: 16 }}>
                  <div style={{
                    background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)',
                    borderRadius: 8, padding: 16, color: '#f85149',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Query Error
                    </div>
                    <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#ffa198' }}>
                      {error}
                    </pre>
                  </div>
                </div>
              )}

              {result?.rows?.length === 0 && (
                <div className="empty-state" style={{ height: '100%' }}>
                  <h3 style={{ fontSize: 14 }}>Query returned no results</h3>
                </div>
              )}

              {result?.rows?.length > 0 && (
                <table className="widget-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400 }}>#</th>
                      {result.fields.map((f) => (
                        <th key={f.name} style={{ whiteSpace: 'nowrap' }}>{f.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                        {result.fields.map((f) => {
                          const val = row[f.name];
                          const isNum = typeof val === 'number';
                          return (
                            <td key={f.name} style={{
                              textAlign: isNum ? 'right' : 'left',
                              fontVariantNumeric: isNum ? 'tabular-nums' : undefined,
                              maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: val === null ? 'var(--text-muted)' : undefined,
                              fontStyle: val === null ? 'italic' : undefined,
                            }}>
                              {val === null ? 'NULL' : isNum ? formatAxisValue(val) : String(val)}
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
    </div>
  );
}
