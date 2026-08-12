import React from 'react';
import { MatrixCell, MatrixData } from '../types';

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData }> = (props) => {
    // Rows without any cell carry no data at all (not even a time axis file to
    // label them with), so they never reach the DOM.
    const rows = props.matrixData.filter((row) => row.length > 0);

    // The column axis is global: every base file referenced anywhere in the
    // matrix gets exactly one column, in first-appearance order.
    const columnOf = new Map<string, number>();
    const columns: MatrixCell['baseFile'][] = [];
    for (const row of rows) {
        for (const cell of row) {
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

    // Every row emits a slot for every column — that is what keeps the flex
    // rows aligned, and it gives the connector lines somewhere to live.
    const cellsByColumn = rows.map((row) => {
        const byColumn = new Map<number, MatrixCell>();
        for (const cell of row) {
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
            <div className="reference-matrix-header">
                <div className="reference-matrix-corner" />
                {columns.map((baseFile) => (
                    <div className="reference-matrix-column" key={baseFile.path}>
                        <a href={baseFile.path} data-href={baseFile.path} className="reference-matrix-column-title internal-link" rel="noopener" target="_blank">{baseFile.basename}</a>
                    </div>
                ))}
            </div>
            {rows.map((row, rowIndex) => (
                <div className="reference-matrix-row" key={row.first()?.timeAxisFile.path}>
                    <a href={row.first()?.timeAxisFile.path} data-href={row.first()?.timeAxisFile.path} className="reference-matrix-row-title internal-link" rel="noopener" target="_blank">{row.first()?.timeAxisFile.basename}</a>
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
                                {cell && (
                                    <div className="reference-matrix-cell" title={baseFile.basename}>
                                        {cell.matches.map((match) => (
                                            <div className="reference-matrix-match" key={match}>{match}</div>
                                        ))}
                                    </div>
                                )}
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
