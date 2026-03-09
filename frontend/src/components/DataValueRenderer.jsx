import React from 'react';
import { Card, Table } from 'react-bootstrap';

const DataValueRenderer = ({ value }) => {
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted">N/A</span>;
    }

    // Handle strings that might be JSON
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return renderArray(parsed);
            }
            if (typeof parsed === 'object') {
                return renderObject(parsed);
            }
        } catch (e) {
            // Not JSON, just a string
            return <span>{value}</span>;
        }
    }

    // Handle direct objects/arrays if any
    if (Array.isArray(value)) {
        return renderArray(value);
    }

    if (typeof value === 'object') {
        return renderObject(value);
    }

    return <span>{String(value)}</span>;
};

const renderArray = (arr) => {
    if (arr.length === 0) return <span className="text-muted">None provided</span>;

    // Check if it's Education or Experience data
    const firstItem = arr[0];

    // Education: [{ type: 'Graduation', college: '...', percentage: '...' }]
    if (firstItem && (firstItem.college || firstItem.percentage || firstItem.type)) {
        return (
            <Table size="sm" bordered hover className="mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="bg-light">
                    <tr>
                        <th>Level</th>
                        <th>College/University</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
                    {arr.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.type || 'N/A'}</td>
                            <td>{item.college || 'N/A'}</td>
                            <td>{item.percentage || 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        );
    }

    // Experience: [{ organization: '...', designation: '...', duration: '...', responsibilities: '...' }]
    if (firstItem && (firstItem.organization || firstItem.designation || firstItem.duration)) {
        return (
            <div className="mt-2">
                {arr.map((item, idx) => (
                    <Card key={idx} className="mb-2 bg-light border-0">
                        <Card.Body className="p-2" style={{ fontSize: '0.85rem' }}>
                            <div className="fw-bold text-primary">{item.organization || 'N/A'}</div>
                            <div className="d-flex justify-content-between">
                                <span><strong>Designation:</strong> {item.designation || 'N/A'}</span>
                                <span className="text-muted"><strong>Duration:</strong> {item.duration || 'N/A'}</span>
                            </div>
                            {item.responsibilities && (
                                <div className="mt-1" style={{ fontSize: '0.8rem' }}>
                                    <strong>Responsibilities:</strong> {item.responsibilities}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                ))}
            </div>
        );
    }

    // Default array rendering (for simple lists or unknown objects)
    return (
        <ul className="list-unstyled mb-0" style={{ fontSize: '0.85rem' }}>
            {arr.map((item, idx) => (
                <li key={idx}>
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </li>
            ))}
        </ul>
    );
};

const renderObject = (obj) => {
    // Check if it's an empty object
    if (Object.keys(obj).length === 0) return <span className="text-muted">Empty</span>;

    return (
        <div style={{ fontSize: '0.85rem' }}>
            {Object.entries(obj).map(([k, v]) => (
                <div key={k}>
                    <strong>{k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {String(v)}
                </div>
            ))}
        </div>
    );
};

export default DataValueRenderer;
