import { BasesView, QueryController } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import MatrixBaseReactView from './MatrixBaseReactView';
import { VIEW_TYPE_REFERENCE_MATRIX } from '../types';
import { buildMatrix } from '../matrix/buildMatrix';
import { registerLinks } from '../util/RegisterLinks';

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
    registerLinks(this.app, this, this.parentEl, this.app.vault.getRoot().path);
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
    const entryFiles = this.data.groupedData.flatMap((group) =>
      group.entries.map((entry) => entry.file)
    );

    const matrixData = await buildMatrix(
      this.app,
      String(this.config.get('timeAxisFolder')),
      entryFiles
    );

    this.root?.render(createElement(MatrixBaseReactView, {
      matrixData,
      compact: Boolean(this.config.get('compact')),
    }));
  }
}
