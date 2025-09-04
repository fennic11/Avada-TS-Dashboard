import React from 'react';
import { Table, Spin, Alert } from 'antd';

// Format phút sang giờ/ngày
function formatMinutes(mins) {
    if (!mins || isNaN(mins)) return '—';
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
    const days = Math.floor(mins / 1440);
    const hours = ((mins % 1440) / 60).toFixed(1);
    return hours > 0 ? `${days} ngày ${hours} h` : `${days} ngày`;
}

const columns = [
    {
        title: 'Card Name',
        dataIndex: 'cardName',
        key: 'cardName',
    },
    {
        title: 'Resolution Time',
        dataIndex: 'resolutionTime',
        key: 'resolutionTime',
        render: (v) => formatMinutes(Number(v)),
        sorter: (a, b) => {
            const aTime = Number(a.resolutionTime) || 0;
            const bTime = Number(b.resolutionTime) || 0;
            return aTime - bTime;
        },
        sortDirections: ['ascend', 'descend'],
        defaultSortOrder: 'ascend',
    },
    {
        title: 'First Action Time',
        dataIndex: 'firstActionTime',
        key: 'firstActionTime',
        render: (v) => formatMinutes(Number(v)),
        sorter: (a, b) => {
            const aTime = Number(a.firstActionTime) || 0;
            const bTime = Number(b.firstActionTime) || 0;
            return aTime - bTime;
        },
        sortDirections: ['ascend', 'descend'],
    },
    {
        title: 'Resolution Time Dev',
        dataIndex: 'resolutionTimeDev',
        key: 'resolutionTimeDev',
        render: (v) => formatMinutes(Number(v)),
        sorter: (a, b) => {
            const aTime = Number(a.resolutionTimeDev) || 0;
            const bTime = Number(b.resolutionTimeDev) || 0;
            return aTime - bTime;
        },
        sortDirections: ['ascend', 'descend'],
    },
];

const TableResolutionTime = ({ 
    filteredCards = [], 
    loading = false, 
    error = '' 
}) => {
    return (
        <>
            {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
            <Spin spinning={loading} tip="Đang tải...">
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px 0 rgba(30,41,59,0.06)', padding: 16 }}>
                    <Table
                        columns={columns}
                        dataSource={filteredCards.map(card => ({ ...card, key: card.cardId }))}
                        pagination={{ pageSize: 20 }}
                        locale={{ emptyText: 'Không có dữ liệu' }}
                        style={{ width: '100%' }}
                    />
                </div>
            </Spin>
        </>
    );
};

export default TableResolutionTime;
