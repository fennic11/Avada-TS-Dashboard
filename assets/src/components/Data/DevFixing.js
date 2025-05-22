import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper,
  Card, CardContent, Typography, Grid, LinearProgress, Box, CircularProgress, useTheme, alpha,
  TableSortLabel, Button
} from '@mui/material';
import { getDevFixingCards } from '../../api/trelloApi';
import CardDetailModal from '../CardDetailModal';
import ClearIcon from '@mui/icons-material/Clear';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DevFixingDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState('due');
  const [order, setOrder] = useState('asc');
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedApp, setSelectedApp] = useState('Tất cả');


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

      return {
        id: card.id,
        shortUrl: card.shortUrl,
        name: card.name,
        due: card.due,
        app: appLabel ? appLabel.name : 'Không có app',
        idMembers: card.idMembers || [],
        createDate: createDate
      };
    });
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
    if (selectedApp === 'Tất cả') {
      return cards;
    }
    return cards.filter(card => card.app === selectedApp);
  };

  const filteredCards = filterCards(cards);

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
      
      // console.log(`Cards for ${app}:`, appCards.length);
      
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

      // console.log(`Chart data for ${app}:`, chartData);
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
                <TableCell>Trễ</TableCell>
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
                    <TableCell>{getOverdueDays(card.due) ?? '-'}</TableCell>
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

  return (
    <Box sx={{ 
      width: '100%', 
      p: 4, 
      maxWidth: '1800px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: alpha(theme.palette.background.default, 0.8),
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease-in-out'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
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
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '1.5rem'
        }}>
          Dev Fixing Dashboard
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 2
        }}>
          <Box sx={{
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            px: 2,
            py: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.warning.main,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Pending: {cards.length}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ 
        animation: 'fadeIn 0.3s ease-in-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }}>
        {renderAppStats(cards, 'Thống kê theo App')}
        {renderTable(cards)}
      </Box>
    </Box>
  );
}
