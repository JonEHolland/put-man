import { useRef, useEffect, useState, useCallback, ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { useEnvironmentStore } from '../../stores/environmentStore'

interface VariableHighlightInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Regex to match {{variable}} patterns
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g

interface ParsedSegment {
  type: 'text' | 'variable'
  value: string
  variableName?: string
}

function parseVariables(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(VARIABLE_REGEX)

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index)
      })
    }

    // Add the variable
    segments.push({
      type: 'variable',
      value: match[0],
      variableName: match[1]
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex)
    })
  }

  return segments
}

export default function VariableHighlightInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  disabled = false
}: VariableHighlightInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)

  const { activeEnvironment } = useEnvironmentStore()

  // Get defined variable names from active environment
  const definedVariables = new Set(
    activeEnvironment?.variables
      ?.filter((v) => v.enabled && v.key)
      .map((v) => v.key) || []
  )

  const handleScroll = useCallback(() => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft
      setScrollLeft(inputRef.current.scrollLeft)
    }
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  // Sync scroll position
  useEffect(() => {
    const input = inputRef.current
    if (input) {
      input.addEventListener('scroll', handleScroll)
      return () => input.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const segments = parseVariables(value)

  const renderHighlightedContent = (): ReactNode[] => {
    return segments.map((segment, index) => {
      if (segment.type === 'variable') {
        const isDefined = definedVariables.has(segment.variableName || '')
        return (
          <span
            key={index}
            className={`rounded px-0.5 ${
              isDefined
                ? 'text-orange-400 bg-orange-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
            title={
              isDefined
                ? `Variable: ${segment.variableName}`
                : `Undefined variable: ${segment.variableName}`
            }
          >
            {segment.value}
          </span>
        )
      }
      return <span key={index}>{segment.value}</span>
    })
  }

  return (
    <div className={`relative ${className}`}>
      {/* Highlight layer (behind input) */}
      <div
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre"
        style={{
          padding: 'inherit',
          font: 'inherit',
          letterSpacing: 'inherit'
        }}
        aria-hidden="true"
      >
        <div
          className="inline-block"
          style={{
            transform: `translateX(-${scrollLeft}px)`,
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem'
          }}
        >
          {value ? renderHighlightedContent() : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
      </div>

      {/* Actual input (transparent text, visible caret) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder=""
        disabled={disabled}
        className="w-full bg-transparent relative z-10"
        style={{
          color: 'transparent',
          caretColor: 'white'
        }}
      />
    </div>
  )
}

// Export the utility function for use elsewhere
export { parseVariables, VARIABLE_REGEX }
export type { ParsedSegment }
