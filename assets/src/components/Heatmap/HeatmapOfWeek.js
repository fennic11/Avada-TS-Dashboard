import React from 'react';
import { Card, Typography, Tooltip, Row, Col } from 'antd';
import { format } from 'date-fns';

const { Title, Text } = Typography;

// Helper: Weekday labels (bắt đầu từ Monday)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper: Get weekday index (0=Sun, 1=Mon, ..., 6=Sat)
function getWeekdayIdx(date) {
    const d = new Date(date);
    return d.getDay();
}
// Helper: Get hour (0-23)
function getHour(date) {
    return new Date(date).getHours();
}
// Helper: Lấy index weekday (0=Mon, 6=Sun) từ Date
function getWeekdayIdxMondayFirst(date) {
    // JS getDay: 0=Sun, 1=Mon,...,6=Sat => 0=Mon, ..., 6=Sun
    const jsIdx = new Date(date).getDay();
    return [1,2,3,4,5,6,0].indexOf(jsIdx);
}
// Chuyển đổi heatmap để render: luôn bắt đầu từ Monday
function reorderHeatmap(heatmap) {
    // heatmap: 0=Sun, 1=Mon, ..., 6=Sat
    // Trả về: [Mon, Tue, ..., Sun]
    return [1,2,3,4,5,6,0].map(idx => heatmap[idx]);
}
// Tạo heatmap: 7 ngày x 24 giờ, mỗi ô là { total, count }
function getResolutionTimeHeatmap(cards, field = 'resolutionTime') {
    // 0=Sun, 1=Mon, ..., 6=Sat
    const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ total: 0, count: 0 })));
    cards.forEach(card => {
        const value = Number(card[field]);
        if (isNaN(value) || value <= 0) return;
        const date = card.createdAt;
        const weekday = getWeekdayIdx(date);
        const hour = getHour(date);
        heatmap[weekday][hour].total += value;
        heatmap[weekday][hour].count += 1;
    });
    return heatmap;
}

const HeatmapOfWeek = ({ cards, field = 'resolutionTime', onCellClick, heatmapFilter }) => {
    // Xử lý dữ liệu heatmap
    const heatmap = reorderHeatmap(getResolutionTimeHeatmap(cards, field));
    // Tìm max trung bình để scale màu
    let maxAvg = 0;
    heatmap.forEach(row => row.forEach(cell => {
        if (cell.count > 0) {
            const avg = cell.total / cell.count;
            if (avg > maxAvg) maxAvg = avg;
        }
    }));
    // Hàm tính màu theo avg
    function getCellColor(avg) {
        if (!avg) return '#f1f5f9'; // gray-100
        const hours = avg / 60;
        if (hours < 1) {
            // Xanh lá cây tươi
            return '#4ade80'; // green-400
        } else if (hours < 4) {
            // Xanh nước biển tươi
            const percent = (hours - 1) / 3;
            // Interpolate giữa #38bdf8 (blue-400) và #1d4ed8 (blue-700)
            const r = Math.round(56 + (29 - 56) * percent);
            const g = Math.round(189 + (78 - 189) * percent);
            const b = Math.round(248 + (216 - 248) * percent);
            return `rgb(${r},${g},${b})`;
        } else if (hours < 8) {
            // Vàng tươi
            const percent = (hours - 4) / 4;
            // #fde047 (yellow-300) -> #fbbf24 (yellow-400)
            const r = Math.round(253 + (251 - 253) * percent);
            const g = Math.round(224 + (191 - 224) * percent);
            const b = Math.round(71 + (36 - 71) * percent);
            return `rgb(${r},${g},${b})`;
        } else {
            // Đỏ tươi
            const percent = Math.min((hours - 8) / 8, 1);
            // #f87171 (red-400) -> #b91c1c (red-800)
            const r = Math.round(248 + (185 - 248) * percent);
            const g = Math.round(113 + (28 - 113) * percent);
            const b = Math.round(113 + (28 - 113) * percent);
            return `rgb(${r},${g},${b})`;
        }
    }
    return (
        <Card
            style={{
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: 32,
                overflowX: 'auto'
            }}
        >
            <Title level={4} style={{ marginBottom: 16, color: '#1e293b', textAlign: 'left' }}>
                Heatmap of Week
            </Title>
            
            {/* Chú thích màu heatmap */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        width: 28, 
                        height: 20, 
                        borderRadius: 6, 
                        background: '#bbf7d0', 
                        border: '1.5px solid #cbd5e1' 
                    }} />
                    <Text style={{ fontSize: 14, color: '#334155' }}>&lt; 1h</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        width: 28, 
                        height: 20, 
                        borderRadius: 6, 
                        background: '#bae6fd', 
                        border: '1.5px solid #cbd5e1' 
                    }} />
                    <Text style={{ fontSize: 14, color: '#334155' }}>1-4h</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        width: 28, 
                        height: 20, 
                        borderRadius: 6, 
                        background: '#fde68a', 
                        border: '1.5px solid #cbd5e1' 
                    }} />
                    <Text style={{ fontSize: 14, color: '#334155' }}>4-8h</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        width: 28, 
                        height: 20, 
                        borderRadius: 6, 
                        background: '#fca5a5', 
                        border: '1.5px solid #cbd5e1' 
                    }} />
                    <Text style={{ fontSize: 14, color: '#334155' }}>&gt; 8h</Text>
                </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Header row: 0h-23h */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 48 }} />
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} style={{ 
                            width: 48, 
                            textAlign: 'center', 
                            fontSize: 14, 
                            color: '#64748b',
                            fontWeight: 500
                        }}>
                            {h}h
                        </div>
                    ))}
                </div>
                
                {/* Rows: Mon-Sun */}
                {heatmap.map((row, i) => {
                    // Tính avg của cả ngày
                    const total = row.reduce((sum, cell) => sum + cell.total, 0);
                    const count = row.reduce((sum, cell) => sum + cell.count, 0);
                    const avgDay = count > 0 ? total / count : 0;
                    const avgDayHour = avgDay / 60;
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ 
                                width: 48, 
                                textAlign: 'right', 
                                fontWeight: 600, 
                                color: '#64748b', 
                                fontSize: 14 
                            }}>
                                {WEEKDAYS[i]}
                            </div>
                            {row.map((cell, h) => {
                                const avg = cell.count > 0 ? cell.total / cell.count : 0;
                                const avgHour = avg / 60;
                                const isActive = heatmapFilter && heatmapFilter.weekday === i && heatmapFilter.hour === h;
                                return (
                                    <Tooltip 
                                        key={h} 
                                        title={cell.count > 0 ? `${avgHour.toFixed(1)}h\n${cell.count} cards` : 'No data'}
                                        placement="top"
                                    >
                                        <div
                                            style={{
                                                width: 48, 
                                                height: 48, 
                                                borderRadius: 8,
                                                background: getCellColor(avg),
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                fontSize: 12, 
                                                fontWeight: 700,
                                                color: '#fff',
                                                cursor: cell.count > 0 ? 'pointer' : 'default',
                                                border: isActive ? '3px solid #6366f1' : '1.5px solid #cbd5e1',
                                                boxShadow: isActive ? '0 0 0 2px #6366f155' : 'none',
                                                transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (cell.count > 0) {
                                                    e.currentTarget.style.border = '3px solid #6366f1';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px 0 #6366f133';
                                                    e.currentTarget.style.transform = 'scale(1.08)';
                                                    e.currentTarget.style.zIndex = 2;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.border = '1.5px solid #cbd5e1';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.zIndex = 1;
                                                }
                                            }}
                                            onClick={() => cell.count > 0 && onCellClick && onCellClick({ weekday: i, hour: h })}
                                        >
                                            {cell.count > 0 ? (avgHour < 1 ? `${Math.round(avg)}p` : `${avgHour.toFixed(1)}h`) : ''}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default HeatmapOfWeek;
