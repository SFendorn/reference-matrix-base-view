import { TFile } from 'obsidian';

export interface MatrixCell {
  baseFile: TFile;
  matches: string[];
}

export interface MatrixRow {
  timeAxisFile: TFile;
  cells: MatrixCell[];
}

export type MatrixData = MatrixRow[];
