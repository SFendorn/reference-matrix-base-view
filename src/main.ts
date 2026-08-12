import { Plugin, MarkdownRenderer, MarkdownRenderChild } from 'obsidian';
import { App, BasesView, QueryController, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MatrixBaseReactView from './ui/MatrixBaseReactView';
import { MatrixCell, PluginSettings, MatrixData } from './types';
import { hookUpLinks } from './util/PatchLinks';

const DEFAULT_SETTINGS: PluginSettings = {
  timeAxisFolder: '',
};

const VIEW_TYPE_REFERENCE_MATRIX = 'reference-matrix-view';

export default class ReferenceMatrixBasePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ReferenceMatrixSettingTab(this.app, this));

    this.registerBasesView(VIEW_TYPE_REFERENCE_MATRIX, {
      name: "Reference Matrix",
      icon: "lucide-grid-3x3",
      factory: (controller, containerEl) => {
        return new MatrixBaseView(controller, containerEl, this.settings)
      }
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ReferenceMatrixSettingTab extends PluginSettingTab {
  plugin: ReferenceMatrixBasePlugin;

  constructor(app: App, plugin: ReferenceMatrixBasePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Reference Matrix Settings' });

    new Setting(containerEl)
      .setName('Time Axis Folder')
      .setDesc('Select the folder whose notes will appear on the vertical axis')
      .addText((text) => {
        text
          .setPlaceholder('e.g., Daily Notes')
          .setValue(this.plugin.settings.timeAxisFolder)
          .onChange(async (value) => {
            this.plugin.settings.timeAxisFolder = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

class MatrixBaseView extends BasesView {
  readonly type = VIEW_TYPE_REFERENCE_MATRIX;
  parentEl: HTMLElement;
  containerEl: HTMLElement;
  root: Root | undefined = undefined;
  settings: PluginSettings;

  constructor(controller: QueryController, parentEl: HTMLElement, settings: PluginSettings) {
    super(controller);
    this.parentEl = parentEl;
    this.containerEl = parentEl.createDiv('refernce-matrix-view-container');
    this.settings = settings;
  }

  public onload(): void {
    this.root = createRoot(this.containerEl);
  }

  public onunload(): void {
    this.root?.unmount();
  }

  // onDataUpdated is called by Obsidian whenever there is a configuration
  // or data change in the vault which may affect your view.
  async onDataUpdated() {
    var matrixData: MatrixData = [];
    const timeAxisFiles = await this.getNotesFromFolder(
      this.settings.timeAxisFolder
    );

    var baseFiles: TFile[] = [];
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (!timeAxisFiles.includes(entry.file))
        {
          baseFiles.push(entry.file);
        }
      }
    }

    // Build matrix
    for (const timeAxisFile of timeAxisFiles) {
      const content = await this.app.vault.read(timeAxisFile);
      var matrixCells: MatrixCell[] = [];

      for (const baseFile of baseFiles) {
        const matches = this.getReferencesInContent(content, baseFile);

        if (matches.length > 0) {
          this.app.renderContext
          matrixCells.push({
            timeAxisFile: timeAxisFile,
            link: baseFile.path, 
            baseFile: baseFile,
            matches,
          });
        }
      }
      matrixData.push(matrixCells);
    }

    this.root?.render(createElement(MatrixBaseReactView, { matrixData: matrixData }));
    hookUpLinks(this.app, this, this.parentEl, this.app.vault.getRoot().path);
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

  private getReferencesInContent(content: string, targetFile: TFile): ReferenceMatch[] {
    const matches: ReferenceMatch[] = [];
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
          matches.push(this.SanitizeLine(line.trim()));
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

  private SanitizeLine(line: string): string {
      const wikiLinkPattern = /\[\[([^|\]]+)\]\]/g;
      const wikiLinkPatternAlias = /\[\[[^|\]]+\|([^|\]]+)\]\]/g;
      return line.replaceAll(wikiLinkPattern, '$1').replaceAll(wikiLinkPatternAlias, '$1').replace(/^-\s*/, "");
  }
}
