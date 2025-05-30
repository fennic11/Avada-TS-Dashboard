import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Avatar, Card, CardContent, Paper, Divider, Badge, Chip } from '@mui/material';
import { getLeaderboard } from '../api/leaderboardApi';
import { getResolutionTimes } from '../api/cardsApi';
import members from '../data/members.json';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart } from 'recharts';

// Custom tooltip để format AVG đẹp hơn
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="caption">{label}</Typography>
        {payload.map((entry, idx) => (
          <Box key={idx} sx={{ color: entry.color, fontSize: 13 }}>
            {entry.name === 'AVG Resolution Time'
              ? `${entry.name}: ${entry.value.toFixed(1)}`
              : `${entry.name}: ${entry.value}`}
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

// Dữ liệu mẫu cho biểu đồ nếu không có dữ liệu thực tế
const testData = [
  { date: '2024-06-01', cards: 3, avg: 5.2 },
  { date: '2024-06-02', cards: 2, avg: 4.1 },
  { date: '2024-06-03', cards: 4, avg: 6.0 },
];

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [resolutionTimes, setResolutionTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const tsMembers = members.filter(member => member.role === 'TS');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
        const today = currentDate.toISOString().split('T')[0];

        const data = await getLeaderboard({ month, year });
        setLeaderboardData(data);

        const resTimes = await getResolutionTimes(firstDay, today);
        setResolutionTimes(resTimes);
      } catch (error) {
        console.error('Error fetching leaderboard or resolution times:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Hàm chuẩn hóa dữ liệu cho biểu đồ từng member
  const getChartDataForMember = (memberId) => {
    const memberData = resolutionTimes.filter(r => r.memberId === memberId);
    const grouped = {};
    memberData.forEach(item => {
      const date = item.date?.slice(0, 10);
      if (!grouped[date]) grouped[date] = { count: 0, total: 0 };
      grouped[date].count += 1;
      grouped[date].total += item.resolutionTime || 0;
    });
    const chartData = Object.entries(grouped).map(([date, { count, total }]) => ({
      date,
      cards: count,
      avg: count ? (total / count) : 0
    }));
    if (chartData.length === 0) {
      console.log('No chart data for member', memberId, '- using testData');
      return testData;
    }
    return chartData;
  };

  // Hàm chuẩn hóa dữ liệu cho biểu đồ từng member theo ngày createdAt
  const getChartDataByCreatedAt = (memberId) => {
    // Lọc resolutionTimes theo memberId nằm trong mảng members và có trường createdAt
    const memberData = resolutionTimes.filter(
      r => Array.isArray(r.members) && r.members.includes(memberId) && r.createdAt
    );
    const grouped = {};
    memberData.forEach(item => {
      const date = item.createdAt?.slice(0, 10);
      if (!date) return;
      if (!grouped[date]) grouped[date] = { count: 0, total: 0 };
      grouped[date].count += 1;
      grouped[date].total += item.resolutionTime || 0;
    });
    const chartData = Object.entries(grouped).map(([date, { count, total }]) => ({
      date,
      cards: count,
      avg: count ? (total / count) : 0
    }));
    if (chartData.length === 0) {
      return testData;
    }
    return chartData;
  };

  // Hàm tính tổng số card, AVG resolution time (giờ), số lượng và % card có resolution time > 4h
  const getTotalCardsAndAvg = (memberId) => {
    const memberData = resolutionTimes.filter(
      r => Array.isArray(r.members) && r.members.includes(memberId) && r.createdAt
    );
    const totalCards = memberData.length;
    const totalResolution = memberData.reduce((sum, item) => sum + (item.resolutionTime || 0), 0);
    // Quy đổi phút sang giờ
    const avgResolution = totalCards ? (totalResolution / totalCards) / 60 : 0;
    // Số lượng card có resolution time > 4h (240 phút)
    const over4hCount = memberData.filter(item => (item.resolutionTime || 0) > 240).length;
    const over4hPercent = totalCards ? (over4hCount / totalCards) * 100 : 0;
    return { totalCards, avgResolution, over4hCount, over4hPercent };
  };

  const sortedMembers = tsMembers.map(member => {
    const memberPoints = leaderboardData?.points?.find(p => p.memberId === member.id)?.points || 0;
    const memberResolution = resolutionTimes.find(r => r.memberId === member.id)?.resolutionTime || null;
    return { ...member, points: memberPoints, resolutionTime: memberResolution };
  }).sort((a, b) => b.points - a.points);

  if (loading) return <Typography>Loading...</Typography>;
  if (!sortedMembers.length) return <Typography>No data</Typography>;

  const top1 = sortedMembers[0];
  const others = sortedMembers.slice(1);

  const top1Stats = getTotalCardsAndAvg(top1.id);

  return (
    <Grid container spacing={4}>
      {/* Left: Top 1 */}
      <Grid item xs={12} md={4}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 4 }}>
          <Avatar src={top1.avatarUrl} sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold">{top1.fullName}</Typography>
          <Typography color="text.secondary">{top1.kpiName}</Typography>
          <Typography variant="h3" color="primary" fontWeight="bold" sx={{ mt: 2 }}>{top1.points}</Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
            <Chip
              label={`Cards: ${top1Stats.totalCards}`}
              color="primary"
              size="small"
              sx={{ fontWeight: 600, fontSize: 15 }}
            />
            <Chip
              label={`AVG: ${top1Stats.avgResolution.toFixed(1)}h`}
              color="secondary"
              size="small"
              sx={{ fontWeight: 600, fontSize: 15 }}
            />
            <Chip
              label={`>{'4h'}: ${top1Stats.over4hCount} (${top1Stats.over4hPercent.toFixed(1)}%)`}
              color="error"
              size="small"
              sx={{ fontWeight: 600, fontSize: 15 }}
            />
          </Box>
          {top1.resolutionTime && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Resolution Time: {top1.resolutionTime}
            </Typography>
          )}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Cards by Created Date</Typography>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={getChartDataByCreatedAt(top1.id)}>
                <XAxis dataKey="date" hide />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={() => 'Cards'} />
                <Line type="monotone" dataKey="cards" stroke="#1976d2" name="Cards" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>AVG Resolution Time by Created Date</Typography>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={getChartDataByCreatedAt(top1.id)}>
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={() => 'AVG Resolution Time'} />
                <Line type="monotone" dataKey="avg" stroke="#e91e63" name="AVG Resolution Time" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">Top 1 this month!</Typography>
        </Paper>
      </Grid>

      {/* Right: Leaderboard */}
      <Grid item xs={12} md={8}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Leader Board</Typography>
        {others.map((member, idx) => {
          const memberStats = getTotalCardsAndAvg(member.id);
          return (
            <Card key={member.id} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={member.avatarUrl} sx={{ width: 50, height: 50, mr: 2 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight="bold">{idx + 2}. {member.fullName}</Typography>
                  <Typography color="text.secondary">{member.kpiName}</Typography>
                  {member.resolutionTime && (
                    <Typography color="text.secondary" fontSize={13}>
                      Resolution Time: {member.resolutionTime}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-start' }}>
                    <Chip
                      label={`Cards: ${memberStats.totalCards}`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 600, fontSize: 15 }}
                    />
                    <Chip
                      label={`AVG: ${memberStats.avgResolution.toFixed(1)}h`}
                      color="secondary"
                      size="small"
                      sx={{ fontWeight: 600, fontSize: 15 }}
                    />
                    <Chip
                      label={`>{'4h'}: ${memberStats.over4hCount} (${memberStats.over4hPercent.toFixed(1)}%)`}
                      color="error"
                      size="small"
                      sx={{ fontWeight: 600, fontSize: 15 }}
                    />
                  </Box>
                </Box>
                <Typography variant="h6" color="primary" fontWeight="bold">{member.points}</Typography>
              </CardContent>
            </Card>
          );
        })}
      </Grid>
    </Grid>
  );
};

export default Leaderboard;