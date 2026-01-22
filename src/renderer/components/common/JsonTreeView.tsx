import { useState, useMemo } from 'react'

interface JsonTreeViewProps {
  data: unknown
  initialExpanded?: boolean
}

export default function JsonTreeView({ data, initialExpanded = true }: JsonTreeViewProps) {
  return (
    <div className="font-mono text-sm p-4 overflow-auto">
      <JsonNode value={data} name={null} depth={0} initialExpanded={initialExpanded} />
    </div>
  )
}

interface JsonNodeProps {
  value: unknown
  name: string | null
  depth: number
  initialExpanded: boolean
  isLast?: boolean
}

function JsonNode({ value, name, depth, initialExpanded, isLast = true }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded && depth < 2)

  const valueType = getValueType(value)
  const isExpandable = valueType === 'object' || valueType === 'array'

  const handleToggle = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded)
    }
  }

  const indent = depth * 16

  if (valueType === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    const isEmpty = entries.length === 0

    return (
      <div>
        <div
          className={`flex items-start ${isExpandable ? 'cursor-pointer hover:bg-white/5' : ''}`}
          style={{ paddingLeft: indent }}
          onClick={handleToggle}
        >
          {isExpandable && !isEmpty && (
            <span className="text-gray-500 w-4 mr-1 shrink-0">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!isExpandable || isEmpty ? <span className="w-5 mr-1 shrink-0" /> : null}
          {name !== null && (
            <>
              <span className="text-purple-400">&quot;{name}&quot;</span>
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
          <span className="text-gray-500">{isEmpty ? '{}' : '{'}</span>
          {!isEmpty && !isExpanded && (
            <>
              <span className="text-gray-600 mx-1">...</span>
              <span className="text-gray-500">{'}'}</span>
              <span className="text-gray-600 ml-2 text-xs">
                {entries.length} {entries.length === 1 ? 'key' : 'keys'}
              </span>
            </>
          )}
          {!isLast && !isExpanded && !isEmpty && <span className="text-gray-500">,</span>}
        </div>
        {isExpanded && !isEmpty && (
          <>
            {entries.map(([key, val], index) => (
              <JsonNode
                key={key}
                name={key}
                value={val}
                depth={depth + 1}
                initialExpanded={initialExpanded}
                isLast={index === entries.length - 1}
              />
            ))}
            <div style={{ paddingLeft: indent }} className="flex">
              <span className="w-5 mr-1" />
              <span className="text-gray-500">{'}'}</span>
              {!isLast && <span className="text-gray-500">,</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  if (valueType === 'array') {
    const items = value as unknown[]
    const isEmpty = items.length === 0

    return (
      <div>
        <div
          className={`flex items-start ${isExpandable ? 'cursor-pointer hover:bg-white/5' : ''}`}
          style={{ paddingLeft: indent }}
          onClick={handleToggle}
        >
          {isExpandable && !isEmpty && (
            <span className="text-gray-500 w-4 mr-1 shrink-0">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!isExpandable || isEmpty ? <span className="w-5 mr-1 shrink-0" /> : null}
          {name !== null && (
            <>
              <span className="text-purple-400">&quot;{name}&quot;</span>
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
          <span className="text-gray-500">{isEmpty ? '[]' : '['}</span>
          {!isEmpty && !isExpanded && (
            <>
              <span className="text-gray-600 mx-1">...</span>
              <span className="text-gray-500">{']'}</span>
              <span className="text-gray-600 ml-2 text-xs">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </>
          )}
          {!isLast && !isExpanded && !isEmpty && <span className="text-gray-500">,</span>}
        </div>
        {isExpanded && !isEmpty && (
          <>
            {items.map((item, index) => (
              <JsonNode
                key={index}
                name={null}
                value={item}
                depth={depth + 1}
                initialExpanded={initialExpanded}
                isLast={index === items.length - 1}
              />
            ))}
            <div style={{ paddingLeft: indent }} className="flex">
              <span className="w-5 mr-1" />
              <span className="text-gray-500">{']'}</span>
              {!isLast && <span className="text-gray-500">,</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  // Primitive values
  return (
    <div className="flex items-start" style={{ paddingLeft: indent }}>
      <span className="w-5 mr-1 shrink-0" />
      {name !== null && (
        <>
          <span className="text-purple-400">&quot;{name}&quot;</span>
          <span className="text-gray-500 mx-1">:</span>
        </>
      )}
      <PrimitiveValue value={value} />
      {!isLast && <span className="text-gray-500">,</span>}
    </div>
  )
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-orange-400">null</span>
  }

  if (value === undefined) {
    return <span className="text-orange-400">undefined</span>
  }

  if (typeof value === 'boolean') {
    return <span className="text-orange-400">{value ? 'true' : 'false'}</span>
  }

  if (typeof value === 'number') {
    return <span className="text-cyan-400">{value}</span>
  }

  if (typeof value === 'string') {
    // Check if it's a URL
    const isUrl = /^https?:\/\//.test(value)
    if (isUrl) {
      return (
        <span className="text-green-400">
          &quot;
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-300"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
          &quot;
        </span>
      )
    }

    // Truncate long strings
    const displayValue = value.length > 500 ? value.slice(0, 500) + '...' : value
    return <span className="text-green-400">&quot;{escapeString(displayValue)}&quot;</span>
  }

  return <span className="text-gray-400">{String(value)}</span>
}

function getValueType(value: unknown): 'object' | 'array' | 'primitive' {
  if (value === null || value === undefined) return 'primitive'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'primitive'
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}
