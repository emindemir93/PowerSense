import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryApi } from '../services/api';
import { formatAxisValue } from '../utils/helpers';

export default function DataExplorerPage() {
  const [source, setSource] = useState('');
  const [selectedDims, setSelectedDims] = useState([]);
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [limit, setLimit] = useState(100);
  const [hasQueried, setHasQueried] = useState(false);

  const { data: schema } = useQuery({
    queryKey: ['query-schema'],
    queryFn: () => queryApi.schema().then((r) => r.data.data),
  });

  const queryPayload = useMemo(() => {
    if (!source || (selectedDims.length === 0 && selectedMeasures.length === 0)) return null;
    return {
      source,
      dimensions: selectedDims,
      measures: selectedMeasures.map((m) => {
        const sm = schema?.[source]?.measures?.find((x) => x.key === m);
        return { field: m, aggregation: sm?.defaultAgg || 'sum', alias: m };
      }),
      limit: parseInt(limit) || 100,
    };
  }, [source, selectedDims, selectedMeasures, limit, schema]);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['explore', queryPayload],
    queryFn: () => queryApi.execute(queryPayload).then((r) => r.data.data),
    enabled: false,
  });

  const handleRun = () => {
    if (queryPayload) {
      setHasQueried(true);
      refetch();
    }
  };

  const sourceSchema = schema?.[source];

  const handleSourceChange = (s) => {
    setSource(s);
    setSelectedDims([]);
    setSelectedMeasures([]);
    setHasQueried(false);
  };

  const toggleDim = (d) => setSelectedDims((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  const toggleMeasure = (m) => setSelectedMeasures((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  const columns = useMemo(() => {
    return [...selectedDims, ...selectedMeasures];
  }, [selectedDims, selectedMeasures]);

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>Data Explorer</h1>
        <p>Query and explore your data interactively</p>
      </div>

      <div className="explorer-controls">
        <select className="form-select" style={{ width: 200 }} value={source} onChange={(e) => handleSourceChange(e.target.value)}>
          <option value="">Select source...</option>
          {schema && Object.entries(schema).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        {sourceSchema && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dimensions:</span>
              {sourceSchema.dimensions.map((d) => (
                <label key={d.key} className="form-checkbox" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={selectedDims.includes(d.key)} onChange={() => toggleDim(d.key)} />
                  {d.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Measures:</span>
              {sourceSchema.measures.map((m) => (
                <label key={m.key} className="form-checkbox" style={{ fontSize: 12 }}>
                  <input type="checkbox" checked={selectedMeasures.includes(m.key)} onChange={() => toggleMeasure(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </>
        )}

        <input className="form-input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} style={{ width: 80 }} min={1} max={10000} placeholder="Limit" />
        <button className="btn btn-primary btn-sm" onClick={handleRun} disabled={!queryPayload || isLoading}>
          {isLoading ? 'Running...' : 'Run Query'}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      )}

      {hasQueried && result && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            {result.length} rows returned
          </div>
          <div className="explorer-table-wrap">
            <table className="widget-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} style={{ textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col} style={{ fontVariantNumeric: selectedMeasures.includes(col) ? 'tabular-nums' : undefined, textAlign: selectedMeasures.includes(col) ? 'right' : 'left' }}>
                        {selectedMeasures.includes(col) ? formatAxisValue(row[col]) : (row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasQueried && result && result.length === 0 && (
        <div className="empty-state">
          <h3>No Results</h3>
          <p>Try adjusting your query parameters</p>
        </div>
      )}
    </div>
  );
}
