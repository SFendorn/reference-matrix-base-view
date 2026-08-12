import React from 'react';
import { MatrixCell, MatrixData } from '../types';

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData }> = (props) => {
    // Rows without any cell carry no data at all (not even a time axis file to
    // label them with), so they never reach the DOM.
    const rows = props.matrixData.filter((row) => row.length > 0);

    // The column axis is global: every base file referenced anywhere in the
    // matrix gets exactly one column, in first-appearance order. Cells are
    // placed on that axis by index, so a column lines up across every row even
    // though most rows only fill a few of them.
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

    // Drives the shared grid template that aligns every row.
    const axisStyle = { '--rm-columns': columns.length } as React.CSSProperties;

    return (
        <ul className="reference-matrix" style={axisStyle}>
            <li className="reference-matrix-header">
                <span className="reference-matrix-corner" />
                <ul className="reference-matrix-columns">
                    {columns.map((baseFile) => (
                        <li className="reference-matrix-column" key={baseFile.path}>
                            <a href={baseFile.path} data-href={baseFile.path} className="reference-matrix-column-title internal-link" rel="noopener" target="_blank">{baseFile.basename}</a>
                        </li>
                    ))}
                </ul>
            </li>
            {rows.map((row) => (
                <li className="reference-matrix-row" key={row.first()?.timeAxisFile.path}>
                    <a href={row.first()?.timeAxisFile.path} data-href={row.first()?.timeAxisFile.path} className="reference-matrix-row-title internal-link" rel="noopener" target="_blank">{row.first()?.timeAxisFile.basename}</a>
                    <ul className="reference-matrix-columns">
                        {row.map((item) => (
                            <li
                                className="reference-matrix-cell"
                                key={item.baseFile.path}
                                aria-label={item.baseFile.basename}
                                // Track 1 holds the row title, so the axis starts at 2.
                                style={{ gridColumn: (columnOf.get(item.baseFile.path) ?? 0) + 2 }}
                            >
                                <ul className="reference-matrix-matches">
                                    {item.matches.map((match) => (
                                        <li className="reference-matrix-match" key={match}>{match}</li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
};

export default MatrixBaseReactView;
