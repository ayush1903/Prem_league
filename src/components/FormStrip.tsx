export type FormResult = 'W' | 'D' | 'L' | null

export const RESULT_STYLES: Record<'W' | 'D' | 'L', { bg: string; fg: string; label: string }> = {
  W: { bg: '#16a34a', fg: '#ffffff', label: 'Win' },
  D: { bg: '#9CA3AF', fg: '#ffffff', label: 'Draw' },
  L: { bg: '#dc2626', fg: '#ffffff', label: 'Loss' },
}

type IconSize = 'sm' | 'md'

const ICON_SIZE_CLASSES: Record<IconSize, string> = {
  sm: 'h-3.5 w-3.5 text-[9px]',
  md: 'h-5 w-5 text-xs',
}

const GLYPH_SIZE_CLASSES: Record<IconSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
}

export function FormIcon({ result, size = 'sm' }: { result: FormResult; size?: IconSize }) {
  const dimensions = ICON_SIZE_CLASSES[size]
  const glyphDimensions = GLYPH_SIZE_CLASSES[size]

  if (result === null) {
    return (
      <span
        aria-label="Not yet played"
        title="Not yet played"
        className={`inline-block shrink-0 rounded-full border border-gray-300 dark:border-gray-700 ${dimensions}`}
      />
    )
  }

  const { bg, fg, label } = RESULT_STYLES[result]

  return (
    <span
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${dimensions}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {result === 'W' && (
        <svg viewBox="0 0 12 12" className={glyphDimensions} fill="none" stroke={fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5L5 9L9.5 3.5" />
        </svg>
      )}
      {result === 'D' && <span className="block h-[2px] w-1.5 rounded-full" style={{ backgroundColor: fg }} />}
      {result === 'L' && (
        <svg viewBox="0 0 12 12" className={glyphDimensions} fill="none" stroke={fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3L9 9M9 3L3 9" />
        </svg>
      )}
    </span>
  )
}

function FormStrip({ results }: { results: FormResult[] }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {results.map((result, i) => (
        <FormIcon key={i} result={result} />
      ))}
    </div>
  )
}

export default FormStrip
