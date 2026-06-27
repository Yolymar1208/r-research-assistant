'use client'

import type { DatasetSummary } from '@/app/types'

interface Props {
  summary: DatasetSummary
}

const TYPE_COLORS: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-800',
  integer: 'bg-indigo-100 text-indigo-800',
  character: 'bg-green-100 text-green-800',
  logical: 'bg-purple-100 text-purple-800',
  date: 'bg-orange-100 text-orange-800',
  unknown: 'bg-gray-100 text-gray-600',
}

export default function DatasetSummaryPanel({ summary }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header stats */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-sm">Dataset Summary</h2>
        <div className="flex gap-6 mt-1 text-sm text-gray-600">
          <span>
            <span className="font-medium text-gray-900">{summary.rowCount.toLocaleString()}</span> rows
          </span>
          <span>
            <span className="font-medium text-gray-900">{summary.columnCount}</span> columns
          </span>
          <span className="text-gray-400">{summary.fileName}</span>
        </div>
      </div>

      {/* Column table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Column</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">R Name</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Missing</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Unique</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Sample Values</th>
            </tr>
          </thead>
          <tbody>
            {summary.columns.map((col, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {col.name}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                  {col.cleanName}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      TYPE_COLORS[col.detectedType] || TYPE_COLORS.unknown
                    }`}
                  >
                    {col.detectedType}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {col.missingCount > 0 ? (
                    <span className="text-amber-600 font-medium">
                      {col.missingCount} ({col.missingPercent}%)
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">{col.uniqueCount}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {col.sample
                    .filter((v) => v !== null)
                    .slice(0, 3)
                    .map(String)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data preview */}
      {summary.preview.length > 0 && (
        <details className="border-t border-gray-200">
          <summary className="px-4 py-2 bg-gray-50 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
            ▸ Preview (first {summary.preview.length} rows)
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {Object.keys(summary.preview[0]).map((key) => (
                    <th key={key} className="text-left px-3 py-1.5 font-medium text-gray-600 whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                        {val === null ? <span className="text-gray-300">—</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
