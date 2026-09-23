export const DEFAULT_TABLE_CELL_MAX_CHARACTERS: 20

export interface TableCellTextTruncation {
  fullText: string
  displayText: string
  truncated: boolean
}

export function formatTableCellValue(value: unknown): string
export function splitTableCellGraphemes(text: string): string[]
export function truncateTableCellText(
  value: unknown,
  maxCharacters?: number | false,
): TableCellTextTruncation
