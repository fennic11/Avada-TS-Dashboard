import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

// KeyMetricsBoxCharts: Hiển thị 3 box chart đầu tiên (Key Metrics)
// Props: chartsData, averages, setChartFilter, TIME_GROUPS, formatMinutes, CHART_TITLES
const KeyMetricsBoxCharts = ({ chartsData, averages, setChartFilter, TIME_GROUPS, formatMinutes, CHART_TITLES }) => {
    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {Object.entries(chartsData).map(([key, data]) => (
                <Grid item xs={12} md={4} key={`metric-${key}`}>
                    <Paper
                        sx={{
                            p: 3,
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: 3,
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                mb: 2,
                                color: '#1e293b',
                                fontWeight: 600
                            }}
                        >
                            {CHART_TITLES[key]}
                        </Typography>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                color: '#3b82f6',
                                fontWeight: 700,
                                mb: 2
                            }}
                        >
                            {averages[key] != null ? formatMinutes(averages[key]) : "—"}
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: '#64748b',
                                mb: 3
                            }}
                        >
                            Average Resolution Time
                        </Typography>
                        <Box sx={{ height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={data}
                                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                                    barCategoryGap="20%"
                                    barGap={4}
                                >
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis 
                                        allowDecimals={false} 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tickLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <Tooltip
                                        wrapperStyle={{ 
                                            fontSize: 13,
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        labelStyle={{ 
                                            fontWeight: 600,
                                            color: '#1e293b'
                                        }}
                                        formatter={(value) => [`${value} cards`, "Count"]}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(_, index) => {
                                            const group = TIME_GROUPS[index];
                                            setChartFilter({ field: key, range: { min: group.min, max: group.max } });
                                        }}
                                        cursor="pointer"
                                    >
                                        <LabelList
                                            dataKey="count"
                                            position="top"
                                            formatter={(value) => {
                                                const totalCards = data.reduce((sum, item) => sum + item.count, 0);
                                                const percentage = totalCards > 0 ? ((value / totalCards) * 100).toFixed(1) : '0.0';
                                                return `${percentage}%`;
                                            }}
                                            style={{
                                                fill: '#64748b',
                                                fontSize: '12px',
                                                fontWeight: 500
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
};

export default KeyMetricsBoxCharts;