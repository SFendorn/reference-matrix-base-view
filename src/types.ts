import { TFile } from 'obsidian';

export interface PluginSettings {
  timeAxisFolder: string;
  compact: boolean;
}

export interface MatrixCell {
  timeAxisFile: TFile;
  link: string;
  baseFile: TFile;
  matches: string[];
}

export type MatrixData = MatrixCell[][];