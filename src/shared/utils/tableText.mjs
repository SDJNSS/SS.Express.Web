export const DEFAULT_TABLE_CELL_MAX_CHARACTERS = 20

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatTableCellValue(value) {
  if (value === null || value === undefined) return ''

  try {
    return String(value)
  } catch {
    return ''
  }
}

/**
 * Split text by user-perceived characters so emoji sequences and combining marks
 * are never cut in the middle.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitTableCellGraphemes(text) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }

  return Array.from(text)
}

/**
 * @param {number | false} maxCharacters
 * @returns {number | false}
 */
function normalizeMaxCharacters(maxCharacters) {
  if (maxCharacters === false) return false
  if (!Number.isFinite(maxCharacters) || maxCharacters < 1) {
    return DEFAULT_TABLE_CELL_MAX_CHARACTERS
  }

  return Math.floor(maxCharacters)
}

/**
 * @param {unknown} value
 * @param {number | false} [maxCharacters]
 * @returns {{ fullText: string, displayText: string, truncated: boolean }}
 */
export function truncateTableCellText(value, maxCharacters = DEFAULT_TABLE_CELL_MAX_CHARACTERS) {
  const fullText = formatTableCellValue(value)
  const normalizedMax = normalizeMaxCharacters(maxCharacters)
  if (normalizedMax === false) {
    return { fullText, displayText: fullText, truncated: false }
  }

  const graphemes = splitTableCellGraphemes(fullText)
  if (graphemes.length <= normalizedMax) {
    return { fullText, displayText: fullText, truncated: false }
  }

  return {
    fullText,
    displayText: `${graphemes.slice(0, normalizedMax).join('')}…`,
    truncated: true,
  }
}
