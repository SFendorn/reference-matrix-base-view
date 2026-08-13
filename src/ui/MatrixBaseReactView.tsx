import React from 'react';
import { MatrixCell, MatrixData, MatrixRow } from '../types';

// Compact mode flattens each column into one stack, so a cell has to carry the
// row it came from to keep its own title.
interface StackedCell {
    cell: MatrixCell;
    timeAxisFile: MatrixRow['timeAxisFile'];
}

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData, compact: boolean }> = (props) => {
    // Rows without any cell have nothing to show, so they never reach the DOM.
    const rows = props.matrixData.filter((row) => row.cells.length > 0);

    // The column axis is global and shared by both modes: every base file
    // referenced anywhere in the matrix gets exactly one column, in
    // first-appearance order.
    const columnOf = new Map<string, number>();
    const columns: MatrixCell['baseFile'][] = [];
    for (const row of rows) {
        for (const cell of row.cells) {
            if (!columnOf.has(cell.baseFile.path)) {
                columnOf.set(cell.baseFile.path, columns.length);
                columns.push(cell.baseFile);
            }
        }
    }

    // No data at all: render nothing rather than an empty frame.
    if (columns.length === 0) {
        return null;
    }

    // In compact mode a cell names its own time axis note, since there is no row
    // header to carry that.
    const renderCell = (cell: MatrixCell, timeAxisFile?: MatrixRow['timeAxisFile']) => (
        <div className="reference-matrix-cell" title={cell.baseFile.basename}>
            {timeAxisFile && (
                <a href={timeAxisFile.path} data-href={timeAxisFile.path} className="reference-matrix-cell-title internal-link" rel="noopener" target="_blank">{timeAxisFile.basename}</a>
            )}
            {cell.matches.map((match) => (
                <div className="reference-matrix-match" key={match}>{match}</div>
            ))}
        </div>
    );

    const header = (
        <div className="reference-matrix-header">
            {!props.compact && <div className="reference-matrix-corner" />}
            {columns.map((baseFile) => (
                <div className="reference-matrix-column" key={baseFile.path}>
                    <a href={baseFile.path} data-href={baseFile.path} className="reference-matrix-column-title internal-link" rel="noopener" target="_blank">{baseFile.basename}</a>
                </div>
            ))}
        </div>
    );

    // ── Compact: no row axis. Each column is one stack of its filled cells, in
    // time axis order, with no empty slots to align against.
    if (props.compact) {
        const cellsOfColumn = columns.map(() => [] as StackedCell[]);
        for (const row of rows) {
            for (const cell of row.cells) {
                cellsOfColumn[columnOf.get(cell.baseFile.path) ?? 0]?.push({ cell, timeAxisFile: row.timeAxisFile });
            }
        }

        return (
            <div className="reference-matrix is-compact">
                {header}
                <div className="reference-matrix-row">
                    {columns.map((baseFile, columnIndex) => (
                        <div className="reference-matrix-slot" key={baseFile.path}>
                            {/* A lead before every cell draws the line from under the
                                column header and through each gap; the stack simply
                                ends after the last cell. */}
                            {(cellsOfColumn[columnIndex] ?? []).map((stacked) => (
                                <React.Fragment key={stacked.timeAxisFile.path}>
                                    <div className="reference-matrix-lead is-linked" />
                                    {renderCell(stacked.cell, stacked.timeAxisFile)}
                                </React.Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Sparse: one row per time axis note. Every row emits a slot for every
    // column — that is what keeps the flex rows aligned, and it gives the
    // connector lines somewhere to live.
    const cellsByColumn = rows.map((row) => {
        const byColumn = new Map<number, MatrixCell>();
        for (const cell of row.cells) {
            byColumn.set(columnOf.get(cell.baseFile.path) ?? 0, cell);
        }
        return byColumn;
    });

    // A column's line starts under the column header and stops at the column's
    // bottommost filled cell, so it never dangles past the last reference. Every
    // column holds at least one cell by construction, so -1 here would mean "no
    // items" and yields no line at all.
    const lastFilled = columns.map(() => -1);
    cellsByColumn.forEach((byColumn, rowIndex) => {
        for (const columnIndex of byColumn.keys()) {
            lastFilled[columnIndex] = rowIndex;
        }
    });

    return (
        <div className="reference-matrix">
            {header}
            {rows.map((row, rowIndex) => (
                <div className="reference-matrix-row" key={row.timeAxisFile.path}>
                    <a href={row.timeAxisFile.path} data-href={row.timeAxisFile.path} className="reference-matrix-row-title internal-link" rel="noopener" target="_blank">{row.timeAxisFile.basename}</a>
                    {columns.map((baseFile, columnIndex) => {
                        const cell = cellsByColumn[rowIndex]?.get(columnIndex);
                        const last = lastFilled[columnIndex] ?? -1;

                        // The line runs from under the column header down to the
                        // column's last reference, so every slot above that row
                        // gets a line where its cell is not: over the cell, under
                        // it, or straight through when the slot is empty. The
                        // last reference keeps only the half above it.
                        const above = rowIndex <= last;
                        const below = rowIndex < last;

                        return (
                            <div className="reference-matrix-slot" key={baseFile.path}>
                                <div className={above ? 'reference-matrix-lead is-linked' : 'reference-matrix-lead'} />
                                {cell && renderCell(cell)}
                                <div className={below ? 'reference-matrix-trail is-linked' : 'reference-matrix-trail'} />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default MatrixBaseReactView;
