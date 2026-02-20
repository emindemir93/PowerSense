import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { schemaApi, connectionsApi } from '../services/api';
import { useTranslation } from '../i18n';

const TABLE_WIDTH = 260;
const HEADER_H = 36;
const ROW_H = 26;
const PADDING = 60;
const COLORS = {
  pk: '#f0883e',
  fk: '#a371f7',
  col: '#e6edf3',
  type: '#8b949e',
  headerBg: '#1c2333',
  bodyBg: '#161b22',
  border: '#30363d',
  accent: '#4493f8',
  line: '#58a6ff',
  lineHover: '#f0883e',
  selectedBg: '#1a2332',
};

function computeLayout(tables, relationships) {
  if (!tables.length) return {};

  const graph = {};
  tables.forEach((t) => { graph[t.name] = { in: 0, out: 0, connected: new Set() }; });
  relationships.forEach((r) => {
    if (graph[r.sourceTable] && graph[r.targetTable]) {
      graph[r.sourceTable].out++;
      graph[r.targetTable].in++;
      graph[r.sourceTable].connected.add(r.targetTable);
      graph[r.targetTable].connected.add(r.sourceTable);
    }
  });

  const sorted = [...tables].sort((a, b) => {
    const aConns = (graph[a.name]?.in || 0) + (graph[a.name]?.out || 0);
    const bConns = (graph[b.name]?.in || 0) + (graph[b.name]?.out || 0);
    return bConns - aConns;
  });

  const positions = {};
  const COLS = Math.max(3, Math.ceil(Math.sqrt(sorted.length)));
  const GAP_X = TABLE_WIDTH + PADDING;
  const GAP_Y = 280;

  sorted.forEach((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    positions[t.name] = {
      x: PADDING + col * GAP_X,
      y: PADDING + row * GAP_Y,
    };
  });

  return positions;
}

function getColumnY(table, columnName, positions) {
  const pos = positions[table.name];
  if (!pos) return 0;
  const idx = table.columns.findIndex((c) => c.name === columnName);
  if (idx === -1) return pos.y + HEADER_H + 13;
  return pos.y + HEADER_H + idx * ROW_H + 13;
}

export default function SchemaViewerPage() {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [selectedTable, setSelectedTable] = useState(null);
  const [hoveredRel, setHoveredRel] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedConnection, setSelectedConnection] = useState('');

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list().then((r) => r.data.data),
  });

  const activeConnectionId = selectedConnection || undefined;

  const { data: schema, isLoading, error } = useQuery({
    queryKey: ['db-schema', activeConnectionId],
    queryFn: () => schemaApi.getSchema(activeConnectionId).then((r) => r.data.data),
  });

  useEffect(() => {
    if (schema?.tables) {
      setPositions(computeLayout(schema.tables, schema.relationships));
    }
  }, [schema]);

  const tableMap = useMemo(() => {
    if (!schema?.tables) return {};
    const m = {};
    schema.tables.forEach((t) => { m[t.name] = t; });
    return m;
  }, [schema]);

  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];
    if (!search.trim()) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [schema, search]);

  const filteredTableNames = useMemo(
    () => new Set(filteredTables.map((t) => t.name)),
    [filteredTables]
  );

  const handleMouseDown = useCallback((e, tableName) => {
    e.stopPropagation();
    if (e.button === 0) {
      setDragging({ table: tableName, startX: e.clientX, startY: e.clientY, origPos: { ...positions[tableName] } });
      setSelectedTable(tableName);
    }
  }, [positions]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTable(null);
    }
  }, [dragging, pan]);

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      setPositions((prev) => ({
        ...prev,
        [dragging.table]: { x: dragging.origPos.x + dx, y: dragging.origPos.y + dy },
      }));
    } else if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [dragging, isPanning, panStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.2, z - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  const relatedTables = useMemo(() => {
    if (!selectedTable || !schema) return new Set();
    const set = new Set();
    schema.relationships.forEach((r) => {
      if (r.sourceTable === selectedTable) set.add(r.targetTable);
      if (r.targetTable === selectedTable) set.add(r.sourceTable);
    });
    return set;
  }, [selectedTable, schema]);

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(0.85);
    setSelectedTable(null);
  };

  if (isLoading) {
    return (
      <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    const is403 = error?.response?.status === 403;
    const msg = error?.response?.data?.message || error?.message || 'Unknown error';
    return (
      <div className="content-area">
        <div className="empty-state" style={{ padding: 60 }}>
          <h3>{is403 ? t('schema.accessDenied') : t('common.error')}</h3>
          <p>{is403 ? t('schema.accessDeniedHint') : msg}</p>
          {error?.response?.status === 401 && (
            <p style={{ fontSize: 12, marginTop: 8 }}>Token süresi dolmuş olabilir. Çıkış yapıp tekrar giriş yapın.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20, flexShrink: 0 }}>
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{t('schema.title')}</span>
          {schema && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {schema.database && <strong>{schema.database}</strong>}
              {schema.dbType && <span style={{ marginLeft: 4, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 10, padding: '1px 5px', borderRadius: 3 }}>{schema.dbType.toUpperCase()}</span>}
              {' '}&middot; {schema.stats.tableCount} {t('schema.tablesCount')} &middot; {schema.stats.relationshipCount} {t('schema.relationshipsCount')} &middot; {schema.stats.totalColumns} {t('schema.columns')}
            </span>
          )}
        </div>
        <div className="toolbar-actions">
          {connections && connections.length > 0 && (
            <select
              value={selectedConnection}
              onChange={(e) => { setSelectedConnection(e.target.value); setSelectedTable(null); }}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)',
                fontSize: 11, height: 30,
              }}
            >
              <option value="">{t('schema.defaultConnection')}</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({(c.db_type || 'pg').toUpperCase()})</option>
              ))}
            </select>
          )}
          <input
            className="form-input"
            placeholder={t('schema.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, height: 30, fontSize: 12 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={resetView}>{t('schema.resetView')}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>+</button>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 35, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}>-</button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : dragging ? 'move' : 'grab',
            background: 'var(--bg-primary)',
            position: 'relative',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={COLORS.line} opacity="0.7" />
              </marker>
              <marker id="arrowhead-hover" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={COLORS.lineHover} />
              </marker>
            </defs>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {schema?.relationships.map((rel, i) => {
                const srcTable = tableMap[rel.sourceTable];
                const tgtTable = tableMap[rel.targetTable];
                if (!srcTable || !tgtTable) return null;
                if (!positions[rel.sourceTable] || !positions[rel.targetTable]) return null;

                const visible = filteredTableNames.has(rel.sourceTable) && filteredTableNames.has(rel.targetTable);
                if (!visible) return null;

                const srcPos = positions[rel.sourceTable];
                const tgtPos = positions[rel.targetTable];
                const sy = getColumnY(srcTable, rel.sourceColumn, { [rel.sourceTable]: srcPos });
                const ty = getColumnY(tgtTable, rel.targetColumn, { [rel.targetTable]: tgtPos });

                const srcRight = srcPos.x + TABLE_WIDTH;
                const tgtRight = tgtPos.x + TABLE_WIDTH;

                let sx, tx;
                if (srcRight < tgtPos.x) {
                  sx = srcRight;
                  tx = tgtPos.x;
                } else if (tgtRight < srcPos.x) {
                  sx = srcPos.x;
                  tx = tgtRight;
                } else {
                  sx = srcRight;
                  tx = tgtRight;
                }

                const isHovered = hoveredRel === i;
                const isRelated = selectedTable && (rel.sourceTable === selectedTable || rel.targetTable === selectedTable);
                const opacity = selectedTable ? (isRelated ? 1 : 0.15) : (search && !visible ? 0.1 : 0.6);
                const color = isHovered ? COLORS.lineHover : COLORS.line;

                const dx = (tx - sx) * 0.5;
                const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

                return (
                  <g key={i}>
                    <path
                      d={path}
                      fill="none"
                      stroke={color}
                      strokeWidth={isHovered || isRelated ? 2.5 : 1.5}
                      opacity={opacity}
                      markerEnd={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
                      style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRel(i)}
                      onMouseLeave={() => setHoveredRel(null)}
                    />
                    {isHovered && (
                      <text
                        x={(sx + tx) / 2}
                        y={((sy + ty) / 2) - 8}
                        fill={COLORS.lineHover}
                        fontSize="11"
                        fontWeight="600"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                      >
                        {rel.sourceTable}.{rel.sourceColumn} → {rel.targetTable}.{rel.targetColumn}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {filteredTables.map((table) => {
              const pos = positions[table.name];
              if (!pos) return null;

              const isSelected = selectedTable === table.name;
              const isRelated = relatedTables.has(table.name);
              const dimmed = selectedTable && !isSelected && !isRelated;

              return (
                <div
                  key={table.name}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: TABLE_WIDTH,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1.5px solid ${isSelected ? COLORS.accent : isRelated ? COLORS.line + '80' : COLORS.border}`,
                    boxShadow: isSelected ? `0 0 20px ${COLORS.accent}30` : '0 2px 8px rgba(0,0,0,0.3)',
                    opacity: dimmed ? 0.3 : 1,
                    transition: 'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
                    userSelect: 'none',
                    cursor: dragging?.table === table.name ? 'move' : 'pointer',
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, table.name)}
                  onClick={(e) => { e.stopPropagation(); setSelectedTable(table.name === selectedTable ? null : table.name); }}
                >
                  {/* Table Header */}
                  <div style={{
                    background: isSelected ? COLORS.accent : COLORS.headerBg,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: HEADER_H,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#fff' : COLORS.col, letterSpacing: 0.3 }}>
                      {table.name}
                    </span>
                    <span style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.7)' : COLORS.type, fontVariantNumeric: 'tabular-nums' }}>
                      {table.rowCount.toLocaleString()} {t('schema.rows')}
                    </span>
                  </div>

                  {/* Columns */}
                  <div style={{ background: COLORS.bodyBg }}>
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '3px 12px',
                          height: ROW_H,
                          borderBottom: `1px solid ${COLORS.border}40`,
                          gap: 6,
                        }}
                      >
                        {col.isPrimaryKey && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.pk, minWidth: 16, flexShrink: 0 }}>PK</span>
                        )}
                        {col.isForeignKey && !col.isPrimaryKey && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.fk, minWidth: 16, flexShrink: 0 }}>FK</span>
                        )}
                        {!col.isPrimaryKey && !col.isForeignKey && (
                          <span style={{ minWidth: 16, flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: 12,
                          color: col.isPrimaryKey ? COLORS.pk : col.isForeignKey ? COLORS.fk : COLORS.col,
                          fontWeight: col.isPrimaryKey ? 600 : 400,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {col.name}
                        </span>
                        <span style={{ fontSize: 10, color: COLORS.type, flexShrink: 0 }}>
                          {col.type}
                        </span>
                        {!col.nullable && (
                          <span style={{ fontSize: 8, color: COLORS.pk, fontWeight: 700, flexShrink: 0 }}>*</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        {selectedTable && tableMap[selectedTable] && (
          <div style={{
            width: 300,
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            overflow: 'auto',
            padding: 16,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{selectedTable}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTable(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {tableMap[selectedTable].columns.length} {t('schema.columns')} &middot; ~{tableMap[selectedTable].rowCount.toLocaleString()} {t('schema.rows')}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>
                {t('schema.columnsTitle')}
              </div>
              {tableMap[selectedTable].columns.map((col) => (
                <div key={col.name} style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  marginBottom: 2,
                  background: col.isPrimaryKey || col.isForeignKey ? 'var(--bg-elevated)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {col.isPrimaryKey && <span className="badge badge-yellow" style={{ fontSize: 9, padding: '1px 5px' }}>PK</span>}
                    {col.isForeignKey && <span className="badge badge-purple" style={{ fontSize: 9, padding: '1px 5px' }}>FK</span>}
                    {col.isUnique && <span className="badge badge-blue" style={{ fontSize: 9, padding: '1px 5px' }}>UQ</span>}
                    <span style={{ fontSize: 13, fontWeight: col.isPrimaryKey ? 600 : 400 }}>{col.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, paddingLeft: col.isPrimaryKey || col.isForeignKey ? 30 : 0 }}>
                    {col.type}{!col.nullable && ` · ${t('schema.notNull')}`}{col.hasDefault && ' · DEFAULT'}
                  </div>
                </div>
              ))}
            </div>

            {schema.relationships.filter((r) => r.sourceTable === selectedTable || r.targetTable === selectedTable).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>
                  {t('schema.relationships')}
                </div>
                {schema.relationships
                  .filter((r) => r.sourceTable === selectedTable || r.targetTable === selectedTable)
                  .map((r, i) => {
                    const isOutgoing = r.sourceTable === selectedTable;
                    return (
                      <div key={i} style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        marginBottom: 4,
                        background: 'var(--bg-elevated)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                        onClick={() => setSelectedTable(isOutgoing ? r.targetTable : r.sourceTable)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: isOutgoing ? COLORS.fk : COLORS.pk, fontWeight: 600 }}>
                            {isOutgoing ? '→' : '←'}
                          </span>
                          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            {isOutgoing ? r.targetTable : r.sourceTable}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {r.sourceTable}.{r.sourceColumn} → {r.targetTable}.{r.targetColumn}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.pk }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('schema.primaryKey')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.fk }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('schema.foreignKey')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <span style={{ color: COLORS.pk, fontWeight: 700, fontSize: 10 }}>*</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('schema.notNull')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
