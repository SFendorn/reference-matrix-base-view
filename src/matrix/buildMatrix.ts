import { App, TFile } from 'obsidian';
import { MatchLine, MatrixCell, MatrixData } from '../types';
import { notesInFolder } from './collectNotes';
import { referencedLines } from './referencedLines';

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

  const targetPaths = new Set(baseFiles.keys());
  const rows: MatrixData = [];

  for (const timeAxisFile of timeAxisFiles) {
    const lineNumbers = referencedLines(app.metadataCache, timeAxisFile, targetPaths);

    // A note that references nothing needs no cell, and no read either.
    if (lineNumbers.size === 0) {
      rows.push({ timeAxisFile, cells: [] });
      continue;
    }

    const lines = (await app.vault.cachedRead(timeAxisFile)).split('\n');
    const cells: MatrixCell[] = [];

    // Driven by baseFiles so the column order follows the query, not the note.
    for (const [path, baseFile] of baseFiles) {
      const matches = matchesAt(lines, lineNumbers.get(path));
      if (matches.length > 0) {
        cells.push({ baseFile, matches });
      }
    }

    rows.push({ timeAxisFile, cells });
  }

  return rows;
}

/** Trimmed only so an indented line is not mistaken for a code block. */
function matchesAt(lines: string[], lineNumbers: number[] | undefined): MatchLine[] {
  const matches: MatchLine[] = [];

  for (const line of lineNumbers ?? []) {
    // The cache can be a beat behind the content it was built from.
    const markdown = lines[line]?.trim();
    if (markdown) matches.push({ line, markdown });
  }

  return matches;
}
