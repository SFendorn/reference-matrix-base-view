import { App, TFile } from 'obsidian';
import { MatrixCell, MatrixData } from '../types';
import { notesInFolder } from './collectNotes';
import { findMatches } from './findMatches';

/**
 * One row per note in the time axis folder, one cell per entry file it
 * references. `entryFiles` may contain duplicates and time axis notes; both are
 * filtered out here.
 */
export async function buildMatrix(
  app: App,
  timeAxisFolder: string,
  entryFiles: TFile[]
): Promise<MatrixData> {
  const timeAxisFiles = notesInFolder(app.vault, timeAxisFolder);

  // Keyed by path, so a file listed in several groups yields one column, and
  // insertion order fixes the column order across every row.
  const timeAxisPaths = new Set(timeAxisFiles.map((file) => file.path));
  const baseFiles = new Map<string, TFile>();
  for (const file of entryFiles) {
    if (!timeAxisPaths.has(file.path)) {
      baseFiles.set(file.path, file);
    }
  }

  const rows: MatrixData = [];
  for (const timeAxisFile of timeAxisFiles) {
    const content = await app.vault.read(timeAxisFile);
    const cells: MatrixCell[] = [];

    for (const baseFile of baseFiles.values()) {
      const matches = findMatches(content, baseFile);

      if (matches.length > 0) {
        cells.push({ baseFile, matches });
      }
    }
    rows.push({ timeAxisFile, cells });
  }

  return rows;
}
