import { TFile } from 'obsidian';

export interface PluginSettings {
  timeAxisFolder: string;
}

export interface ReferenceMatch {
  file: TFile;
  sentence: string;
  lineNumber: number;
}

export interface MatrixCell {
  timeAxisFile: TFile;
  link: string;
  baseFile: TFile;
  matches: ReferenceMatch[];
}

export type MatrixData = MatrixCell[][];