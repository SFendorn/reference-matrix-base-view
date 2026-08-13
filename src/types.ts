import { TFile } from 'obsidian';

export const VIEW_TYPE_REFERENCE_MATRIX = 'reference-matrix-view';

export interface MatchLine {
  /** 0-based line in the time axis note it came from. */
  line: number;
  /** The source line, markup intact, for Obsidian to render. */
  markdown: string;
}

export interface MatrixCell {
  baseFile: TFile;
  matches: MatchLine[];
}

export interface MatrixRow {
  timeAxisFile: TFile;
  cells: MatrixCell[];
}

export type MatrixData = MatrixRow[];
