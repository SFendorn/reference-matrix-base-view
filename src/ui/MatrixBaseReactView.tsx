import React from 'react';
import { MatrixData } from '../types';

const MatrixBaseReactView: React.FC<{ matrixData: MatrixData }> = (props) => {
    // Rows without any cell carry no data at all (not even a time axis file to
    // label them with), so they never reach the DOM.
    const rows = props.matrixData.filter((row) => row.length > 0);

    return (
        <ul className="reference-matrix">
            {rows.map((row) => (
                <li className="reference-matrix-row" key={row.first()?.timeAxisFile.name}>
                    <a href={row.first()?.timeAxisFile.path} data-href={row.first()?.timeAxisFile.path} className="reference-matrix-row-title internal-link" rel="noopener" target="_blank">{row.first()?.timeAxisFile.basename}</a>
                    <ul className="reference-matrix-columns">
                        {row.map((item) => (
                            <li className="reference-matrix-cell" key={item.timeAxisFile.name + item.baseFile.name}>
                                <a href={item.baseFile.path} data-href={item.baseFile.path} className="reference-matrix-column-title internal-link" rel="noopener" target="_blank">{item.baseFile.basename}</a>
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
