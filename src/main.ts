import { Plugin } from 'obsidian';
import { MatrixBaseView } from './ui/MatrixBaseView';
import { VIEW_TYPE_REFERENCE_MATRIX } from './types'

export default class ReferenceMatrixBasePlugin extends Plugin {
  async onload() {
    this.registerBasesView(VIEW_TYPE_REFERENCE_MATRIX, {
      name: "Reference Matrix",
      icon: "kanban",
      factory: (controller, containerEl) => {
        return new MatrixBaseView(controller, containerEl)
      },
      options: () => {
        return [
          {
            type: 'folder',
            displayName: 'Time axis folder',
            key: 'timeAxisFolder',
            default: '',
            placeholder: 'daily notes'
          },
          {
            type: 'toggle',
            displayName: 'Compact view',
            key: 'compact',
            default: false
          }
        ];
      }
    });
  }
}
