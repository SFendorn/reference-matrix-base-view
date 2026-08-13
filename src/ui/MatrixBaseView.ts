import { BasesView, QueryController, TFile, TFolder } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MatrixBaseReactView from './MatrixBaseReactView';
import { MatrixCell, MatrixData } from '../types';
import { hookUpLinks } from '../util/PatchLinks';

export const VIEW_TYPE_REFERENCE_MATRIX = 'reference-matrix-view';

export class MatrixBaseView extends BasesView {
  readonly type = VIEW_TYPE_REFERENCE_MATRIX;
  parentEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | undefined = undefined;

  constructor(controller: QueryController, parentEl: HTMLElement) {
    super(controller);
    this.parentEl = parentEl;
    this.containerEl = parentEl.createDiv('refernce-matrix-view-container');
  }

  public onload(): void {
    this.root = createRoot(this.containerEl);
    // Once only: registerDomEvent stacks listeners, and these delegate from parentEl.
    hookUpLinks(this.app, this, this.parentEl, this.app.vault.getRoot().path);
  }

  public onunload(): void {
    this.root?.unmount();
  }

  // onDataUpdated is called by Obsidian whenever there is a configuration
  // or data change in the vault which may affect your view. It is declared to
  // return void, so the async work is kicked off rather than awaited here.
  public onDataUpdated(): void {
    void this.rebuild();
  }

  private async rebuild(): Promise<void> {
    const matrixData: MatrixData = [];
    const timeAxisFiles = await this.getNotesFromFolder(
      String(this.config.get('timeAxisFolder'))
    );

    // Keyed by path, so a file listed in several groups yields one column, and
    // insertion order fixes the column order across every row.
    const timeAxisPaths = new Set(timeAxisFiles.map((file) => file.path));
    const baseFiles = new Map<string, TFile>();
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (!timeAxisPaths.has(entry.file.path)) {
          baseFiles.set(entry.file.path, entry.file);
        }
      }
    }

    // Build matrix
    for (const timeAxisFile of timeAxisFiles) {
      const content = await this.app.vault.read(timeAxisFile);
      const cells: MatrixCell[] = [];

      for (const baseFile of baseFiles.values()) {
        const matches = this.getReferencesInContent(content, baseFile);

        if (matches.length > 0) {
          cells.push({ baseFile, matches });
        }
      }
      matrixData.push({ timeAxisFile, cells });
    }

    this.root?.render(createElement(MatrixBaseReactView, { matrixData: matrixData, compact: Boolean(this.config.get('compact')) }));
  }

  private async getNotesFromFolder(folderPath: string): Promise<TFile[]> {
    if (!folderPath) return [];

    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !(folder instanceof TFolder)) return [];

    const notes: TFile[] = [];
    const traverse = (f: TFolder) => {
      f.children.forEach((file) => {
        if (file instanceof TFile && file.extension === 'md') {
          notes.push(file);
        } else if (file instanceof TFolder) {
          traverse(file);
        }
      });
    };

    traverse(folder);
    return notes.sort((a, b) => a.name.localeCompare(b.name));
  }

  private getReferencesInContent(content: string, targetFile: TFile): string[] {
    const matches: string[] = [];
    const lines = content.split('\n');
    const fileBaseName = targetFile.basename;
    const filePath = targetFile.path;

    lines.forEach((line, lineNumber) => {
      // Check for wikilink format [[filename]]
      const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
      let match;

      while ((match = wikiLinkPattern.exec(line)) !== null) {
        const linkedName = match[1]?.split('|')[0]?.trim();
        if (
          linkedName === fileBaseName ||
          linkedName === filePath ||
          linkedName?.endsWith(fileBaseName)
        ) {
          matches.push(this.SanitizeWikiLine(line.trim()));
        }
      }

      // Check for markdown link format [text](path)
      const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      while ((match = mdLinkPattern.exec(line)) !== null) {
        const linkedPath = match[2];
        if (linkedPath?.includes(fileBaseName) || linkedPath === filePath) {
          matches.push(line.trim());
        }
      }
    });

    return [...new Set(matches)];
  }

  private SanitizeWikiLine(line: string): string {
    const wikiLinkPattern = /\[\[([^|\]]+)\]\]/g;
    const wikiLinkPatternAlias = /\[\[[^|\]]+\|([^|\]]+)\]\]/g;
    return line.replaceAll(wikiLinkPattern, '$1').replaceAll(wikiLinkPatternAlias, '$1').replace(/^-\s*/, "");
  }
}
