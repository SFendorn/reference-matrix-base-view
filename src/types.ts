import { TFile } from 'obsidian';

export const VIEW_TYPE_REFERENCE_MATRIX = 'reference-matrix-view';

export interface MatrixCell {
  baseFile: TFile;
  matches: string[];
}

export interface MatrixRow {
  timeAxisFile: TFile;
  cells: MatrixCell[];
}

export type MatrixData = MatrixRow[];
