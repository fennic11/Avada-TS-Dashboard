import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper,
  Card, CardContent, Typography, Grid, LinearProgress, Box, CircularProgress, useTheme, alpha,
  TableSortLabel, Button, TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { getDevFixingCards } from '../../api/trelloApi';
import CardDetailModal from '../CardDetailModal';
import ClearIcon from '@mui/icons-material/Clear';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import FilterListIcon from '@mui/icons-material/FilterList';
import appData from '../../data/app.json';

export default function DevFixingDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState('due');
  const [order, setOrder] = useState('asc');
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedApp, setSelectedApp] = useState('Tất cả');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Map app name to product_team
  const appToTeam = {};
  const teamSet = new Set();
  // Chuẩn hóa app_name về chữ thường, trim khi tạo appToTeam
  appData.forEach(app => {
    appToTeam[app.app_name.toLowerCase().trim()] = app.product_team;
    if (app.product_team) teamSet.add(app.product_team);
  });
  const allTeams = ['Tất cả', ...Array.from(teamSet)];

  const [selectedTeam, setSelectedTeam] = useState('Tất cả');

  const processCards = (cards) => {
    return cards.map(card => {
      const appLabel = card.labels.find(label => label.name.includes('App:'));
      const createAction = card.actions?.find(action => action.type === 'createCard');
      let createDate = createAction?.date ? new Date(createAction.date) : null;
      
      // If no create date is available, set it to 2 days before due date
      if (!createDate && card.due) {
        const dueDate = new Date(card.due);
        createDate = new Date(dueDate.getTime() - (2 * 24 * 60 * 60 * 1000)); // Subtract 2 days
      }

      // Extract Slack links from description
      const slackLink = extractSlackLink(card.desc || '');

      // Chuẩn hóa tên app về chữ thường, trim để so sánh với app.json
      let appKey = '';
      if (appLabel) {
        appKey = appLabel.name.replace('App:', '').trim().toLowerCase();
      } else if (card.name) {
        appKey = card.name.trim().toLowerCase();
      }
      // Gán productTeam cho card
      const productTeam = appToTeam[appKey] || null;

      return {
        id: card.id,
        shortUrl: card.shortUrl,
        name: card.name,
        due: card.due,
        app: appLabel ? appLabel.name : 'Không có app',
        idMembers: card.idMembers || [],
        createDate: createDate,
        slackLink: slackLink,
        appKey: appKey,
        productTeam: productTeam
      };
    });
  };

  // Function to extract Slack links from description
  const extractSlackLink = (description) => {
    if (!description) return null;
    
    // Decode URL first to handle %5D and other encoded characters
    let decodedDescription = description;
    try {
      decodedDescription = decodeURIComponent(description);

    } catch (e) {
      console.log('Failed to decode URL, using original');
    }
    
    // Regex để tìm link Slack với nhiều format khác nhau
    // Bắt được cả: slack.com, app.slack.com, và các subdomain như avadaio.slack.com
    // Cũng xử lý cả format markdown [text](url)
    const slackRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?slack\.com\/[^\s\n\)\]%]+/g;
    const matches = decodedDescription.match(slackRegex);
    
    
    if (matches && matches.length > 0) {
      // Clean up the URL by removing any trailing characters
      let cleanUrl = matches[0];
      // Remove trailing characters that might be part of markdown or encoding
      cleanUrl = cleanUrl.replace(/[\)\]%].*$/, '');
      return cleanUrl;
    }
    
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch pending data only
      const pendingData = await getDevFixingCards('63c7b1a68e5576001577d65c');
      // Process cards simply
      const mappedPendingCards = processCards(pendingData);
      setCards(mappedPendingCards);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const getOverdueLevel = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    if (due >= now) return null;
    const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, 10);
  };

  const getOverdueDays = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    if (due >= now) return null;
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  const getCardStatus = (dueDate) => {
    if (!dueDate) return 'no-due';
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    if (due < now) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không có';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortCards = (cards) => {
    return [...cards].sort((a, b) => {
      if (orderBy === 'due') {
        const dateA = a.due ? new Date(a.due) : new Date('9999-12-31');
        const dateB = b.due ? new Date(b.due) : new Date('9999-12-31');
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  };

  const handleRowClick = async (card) => {
    try {
      // Ensure we have the full card data
      const fullCardData = {
        ...card,
        id: card.id || card.shortUrl.split('/').pop(), // Extract ID from shortUrl if not available
        shortUrl: card.shortUrl,
        name: card.name,
        desc: card.desc || '',
        idList: card.idList,
        due: card.due,
        idMembers: card.idMembers || [],
        labels: card.labels || []
      };
      
      setSelectedCard(fullCardData);
      setModalOpen(true);
    } catch (error) {
      console.error('Error handling row click:', error);
    }
  };

  const handleAppClick = (app) => {
    setSelectedApp(app === selectedApp ? 'Tất cả' : app);
  };

  const filterCards = (cards) => {
    let filtered = cards;

    // Filter by app
    if (selectedApp !== 'Tất cả') {
      filtered = filtered.filter(card => card.app === selectedApp);
    }

    // Filter by team product (dùng productTeam đã gán khi processCards)
    if (selectedTeam !== 'Tất cả') {
      filtered = filtered.filter(card => card.productTeam === selectedTeam);
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(card => {
        if (!card.createDate) return false;
        
        const createDate = new Date(card.createDate);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null; // Set to end of day

        const isAfterStart = !start || createDate >= start;
        const isBeforeEnd = !end || createDate <= end;

        return isAfterStart && isBeforeEnd;
      });
    }

    return filtered;
  };

  const filteredCards = filterCards(cards);

  // Tính số lượng card theo productTeam
  const teamStats = cards.reduce((acc, card) => {
    if (!card.productTeam) return acc;
    acc[card.productTeam] = (acc[card.productTeam] || 0) + 1;
    return acc;
  }, {});
  const teamChartData = Object.entries(teamStats).map(([team, count]) => ({ team, count }));
 
  // Tính số app unique cho mỗi team
  const teamAppStats = cards.reduce((acc, card) => {
    if (!card.productTeam || !card.app) return acc;
    if (!acc[card.productTeam]) {
      acc[card.productTeam] = { cardCount: 0, apps: new Set() };
    }
    acc[card.productTeam].cardCount += 1;
    acc[card.productTeam].apps.add(card.app);
    return acc;
  }, {});
 
  // Chuyển đổi thành array với thông tin card và app count
  const teamChartDataWithApps = Object.entries(teamAppStats).map(([team, data]) => ({
    team,
    count: data.cardCount,
    appCount: data.apps.size
  }));

  const renderAppStats = (cardList, title) => {
    const appStats = cardList.reduce((acc, card) => {
      acc[card.app] = (acc[card.app] || 0) + 1;
      return acc;
    }, {});
    const totalCards = cardList.length;
    const top3Apps = Object.entries(appStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([app]) => app);

    const filteredAppStats = selectedApp === 'Tất cả' 
      ? appStats 
      : { [selectedApp]: appStats[selectedApp] || 0 };

    const getChartData = (app) => {
      const appCards = cardList.filter(card => card.app === app && card.createDate);
      
      const dateMap = new Map();
      appCards.forEach(card => {
        if (card.createDate) {
          const date = card.createDate.toISOString().split('T')[0];
          dateMap.set(date, (dateMap.get(date) || 0) + 1);
        }
      });

      const chartData = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      return chartData;
    };

    return (
      <Box sx={{ 
        mb: 4,
        background: 'white',
        borderRadius: 3,
        p: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '1.1rem'
            }}
          >
            {title}
            {selectedApp !== 'Tất cả' && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<ClearIcon />}
                onClick={() => setSelectedApp('Tất cả')}
                sx={{
                  ml: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 2,
                  py: 0.5,
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
              >
                Xem tất cả
              </Button>
            )}
          </Typography>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                px: 2,
                py: 1,
                borderRadius: 2,
                fontSize: '0.85rem'
              }}
            >
              Tổng số: <span style={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                {selectedApp === 'Tất cả' ? totalCards : filteredCards.length}
              </span>
            </Typography>
          </Box>
        </Box>
        <Grid container spacing={2}>
          {Object.entries(filteredAppStats)
            .sort(([, a], [, b]) => b - a)
            .map(([app, count]) => {
              const percent = totalCards > 0 ? (count / totalCards) * 100 : 0;
              const isTopApp = top3Apps.includes(app);
              const isSelected = selectedApp === app;
              const chartData = getChartData(app);

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={app}>
                  <Card
                    variant="outlined"
                    onClick={() => handleAppClick(app)}
                    sx={{
                      borderRadius: 2,
                      boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.05)',
                      p: 2,
                      borderColor: isTopApp ? 'error.main' : 'grey.200',
                      backgroundColor: isTopApp ? alpha(theme.palette.error.main, 0.05) : 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${theme.palette.primary.main}` : undefined,
                      transform: isSelected ? 'translateY(-4px)' : 'none',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        transform: 'translateY(-4px)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{ 
                          color: isTopApp ? 'error.main' : 'text.primary',
                          fontWeight: 600,
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontSize: '0.9rem'
                        }}
                      >
                        {app}
                        {isSelected && (
                          <Typography
                            component="span"
                            sx={{
                              ml: 1,
                              color: 'primary.main',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            Đã chọn
                          </Typography>
                        )}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{ 
                          mb: 2,
                          fontSize: '0.8rem'
                        }}
                      >
                        {count} cards ({percent.toFixed(1)}%)
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 6,
                          borderRadius: 5,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: isTopApp ? 'error.main' : 'primary.main',
                            borderRadius: 5,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          }
                        }}
                      />
                      
                      {/* Chart */}
                      <Box sx={{ height: 120, mt: 2, width: '100%' }}>
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={chartData} 
                              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={isTopApp ? theme.palette.error.main : theme.palette.primary.main} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={isTopApp ? theme.palette.error.main : theme.palette.primary.main} stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={alpha(theme.palette.primary.main, 0.1)}
                                vertical={false}
                              />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                                tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                minTickGap={20}
                                axisLine={{ stroke: alpha(theme.palette.primary.main, 0.2) }}
                                tickLine={{ stroke: alpha(theme.palette.primary.main, 0.2) }}
                              />
                              <YAxis 
                                tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                                allowDecimals={false}
                                domain={[0, 'auto']}
                                axisLine={{ stroke: alpha(theme.palette.primary.main, 0.2) }}
                                tickLine={{ stroke: alpha(theme.palette.primary.main, 0.2) }}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: theme.palette.background.paper,
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                  borderRadius: 8,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                formatter={(value) => [`${value} cards`, 'Số lượng']}
                                labelFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke={isTopApp ? theme.palette.error.main : theme.palette.primary.main}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                activeDot={{
                                  r: 4,
                                  strokeWidth: 2,
                                  fill: isTopApp ? theme.palette.error.main : theme.palette.primary.main,
                                  stroke: theme.palette.background.paper
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'text.secondary',
                            fontSize: '0.8rem'
                          }}>
                            Không có dữ liệu
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      </Box>
    );
  };

  const renderTable = (cardList) => {
    const sortedCards = sortCards(cardList);
    const filteredCards = selectedApp === 'Tất cả' 
      ? sortedCards 
      : sortedCards.filter(card => card.app === selectedApp);
    
    return (
      <>
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            background: 'white',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'tableFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes tableFadeIn': {
              '0%': { 
                opacity: 0,
                transform: 'translateY(20px)',
                filter: 'blur(5px)'
              },
              '100%': { 
                opacity: 1,
                transform: 'translateY(0)',
                filter: 'blur(0)'
              }
            },
            '& .MuiTableCell-root': {
              py: 2,
              px: 3,
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                '& .MuiTableCell-root': {
                  fontWeight: 600,
                  color: 'primary.main',
                  fontSize: '1rem',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }
              }}>
                <TableCell>Card</TableCell>
                <TableCell>App</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'due'}
                    direction={orderBy === 'due' ? order : 'asc'}
                    onClick={() => handleRequestSort('due')}
                    sx={{
                      color: 'primary.main',
                      '&.MuiTableSortLabel-active': {
                        color: 'primary.main',
                      },
                      '&:hover': {
                        color: 'primary.main',
                      }
                    }}
                  >
                    Due
                  </TableSortLabel>
                </TableCell>
                <TableCell>Create Date</TableCell>
                <TableCell>Trễ</TableCell>
                <TableCell>Slack Link</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCards.map((card, index) => {
                const overdueLevel = getOverdueLevel(card.due);
                const status = getCardStatus(card.due);
                const rowStyle = {
                  ...(overdueLevel !== null && {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.05 + overdueLevel * 0.02)} 0%, ${alpha(theme.palette.error.main, 0.02)} 100%)`,
                  }),
                  color:
                    status === 'overdue' ? theme.palette.error.main :
                    status === 'soon' ? theme.palette.warning.main :
                    'inherit',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: `rowFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s`,
                  '@keyframes rowFadeIn': {
                    '0%': { 
                      opacity: 0,
                      transform: 'translateX(-20px)'
                    },
                    '100%': { 
                      opacity: 1,
                      transform: 'translateX(0)'
                    }
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    transform: 'scale(1.01)',
                    cursor: 'pointer'
                  }
                };

                return (
                  <TableRow 
                    key={card.shortUrl} 
                    sx={rowStyle}
                    onClick={() => handleRowClick(card)}
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          color: 'inherit',
                          textDecoration: 'none',
                          fontWeight: 500,
                          '&:hover': {
                            textDecoration: 'underline',
                          }
                        }}
                      >
                        {card.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{card.app}</TableCell>
                    <TableCell>{formatDate(card.due)}</TableCell>
                    <TableCell>{formatDate(card.createDate)}</TableCell>
                    <TableCell>{getOverdueDays(card.due) ?? '-'}</TableCell>
                    <TableCell>{card.slackLink ? (
                      <a 
                        href={card.slackLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: theme.palette.primary.main,
                          textDecoration: 'none',
                          fontWeight: 500,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          transition: 'all 0.2s ease',
                          display: 'inline-block'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.2);
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = alpha(theme.palette.primary.main, 0.1);
                          e.target.style.textDecoration = 'none';
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Mở Slack
                      </a>
                    ) : (
                      <span style={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                        Không có
                      </span>
                    )}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedCard && (
          <CardDetailModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedCard(null);
            }}
            cardId={selectedCard.id}
          />
        )}
      </>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          background: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, color: 'primary.main' }}>
          Đang tải dữ liệu...
        </Typography>
      </Box>
    );
  }

  // Màu sắc tương phản cho từng team
  const teamColors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#7b1fa2', '#388e3c'];

  return (
    <Box sx={{ 
      width: '100%', 
      p: 4, 
      maxWidth: '1800px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: (theme) => alpha(theme.palette.background.default, 0.8),
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease-in-out'
    }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          mb: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          p: 3,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.1)'
          }
        }}
      >
        {/* Box team bên trái */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          flex: 1,
          minWidth: 0
        }}>
          {teamChartDataWithApps
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((entry, index) => (
              <Box
                key={entry.team}
                sx={{
                  minWidth: 90,
                  maxWidth: 120,
                  p: 1.5,
                  borderRadius: 3,
                  background: alpha(teamColors[index % teamColors.length], 0.08),
                  border: `2px solid ${alpha(teamColors[index % teamColors.length], 0.25)}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(teamColors[index % teamColors.length], 0.15)}`,
                    borderColor: teamColors[index % teamColors.length],
                    background: alpha(teamColors[index % teamColors.length], 0.18),
                  },
                  ...(selectedTeam === entry.team && {
                    borderColor: teamColors[index % teamColors.length],
                    background: alpha(teamColors[index % teamColors.length], 0.22),
                  })
                }}
                onClick={() => setSelectedTeam(selectedTeam === entry.team ? 'Tất cả' : entry.team)}
              >
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: teamColors[index % teamColors.length],
                  mb: 0.5
                }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: teamColors[index % teamColors.length], fontSize: '0.9rem', textAlign: 'center' }}>
                  {entry.team}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#222', mt: 0.3, fontSize: '1.1rem' }}>
                  {entry.count}/{entry.appCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, textAlign: 'center', fontSize: '0.7rem' }}>
                  cards/apps
                </Typography>
              </Box>
          ))}
        </Box>

        {/* Filter + tiêu đề bên phải */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
          minWidth: 260
        }}>
          <Typography variant="h4" sx={{
            fontWeight: 700,
            color: 'primary.main',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: '1.5rem',
            mb: 1
          }}>
            Dev Fixing Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                p: 0,
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                minWidth: 180,
                mr: 2,
              }}
            >
              <FormControl
                size="small"
                fullWidth
                sx={{
                  background: (theme) => alpha(theme.palette.background.paper, 0.7),
                  borderRadius: 2,
                  '.MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    background: 'transparent',
                    px: 1.5,
                    py: 0.5,
                    minHeight: 40,
                    transition: 'all 0.2s',
                    boxShadow: 'none',
                    '& fieldset': {
                      borderColor: alpha(theme.palette.primary.main, 0.15),
                    },
                    '&:hover fieldset': {
                      borderColor: alpha(theme.palette.primary.main, 0.35),
                    },
                  },
                  '.MuiInputLabel-root': {
                    fontWeight: 500,
                    color: alpha('#1976d2', 0.7),
                    fontSize: '0.95rem',
                    letterSpacing: 0.1,
                    top: '-4px',
                  }
                }}
              >
                <InputLabel id="product-team-label">Team Product</InputLabel>
                <Select
                  labelId="product-team-label"
                  value={selectedTeam}
                  label="Team Product"
                  onChange={e => setSelectedTeam(e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        borderRadius: 2,
                        mt: 0.5,
                        boxShadow: '0 4px 24px rgba(25,118,210,0.08)'
                      }
                    }
                  }}
                >
                  {allTeams.map(team => (
                    <MenuItem
                      key={team}
                      value={team}
                      sx={theme => ({
                        fontWeight: team === selectedTeam ? 700 : 500,
                        background: team === selectedTeam ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                        borderRadius: 2,
                        px: 2,
                        py: 1.1,
                        my: 0.2,
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.12),
                        },
                      })}
                    >
                      {team}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setShowDateFilter(!showDateFilter)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                borderColor: alpha(theme.palette.primary.main, 0.5),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05)
                }
              }}
            >
              Lọc theo ngày
            </Button>
          </Box>
        </Box>
      </Box>

      {showDateFilter && (
        <Box sx={{ 
          mb: 3,
          p: 2,
          background: 'white',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <TextField
            type="date"
            label="Từ ngày"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            type="date"
            label="Đến ngày"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            sx={{
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Xóa bộ lọc
          </Button>
        </Box>
      )}

      <Box sx={{ 
        animation: 'fadeIn 0.3s ease-in-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }}>
        {renderAppStats(filterCards(cards), 'Thống kê theo App')}
        {renderTable(filterCards(cards))}
      </Box>
    </Box>
  );
}
