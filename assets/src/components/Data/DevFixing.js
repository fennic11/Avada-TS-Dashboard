import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, FormControl, InputLabel, MenuItem, Select,
  Card, CardContent, Typography, Grid, LinearProgress, Box,
  Tabs, Tab, CircularProgress, Stack, useTheme, alpha,
  TableSortLabel, Avatar
} from '@mui/material';
import { getCardsByList } from '../../api/trelloApi';
import memberList from '../../data/members.json';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';


export default function DevFixingDashboard() {
  const theme = useTheme();
  const [cards, setCards] = useState([]);
  const [doneCards, setDoneCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState('Tất cả');
  const [tab, setTab] = useState(0);
  const [orderBy, setOrderBy] = useState('due');
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCardsByList('63c7b1a68e5576001577d65c'); // Main list
        const doneData = await getCardsByList('663ae7d6feac5f2f8d7a1c86'); // Done list

        const mapCards = (cards) =>
          cards.map(card => {
            const appLabel = card.labels.find(label => label.name.includes('App:'));
            return {
              shortUrl: card.shortUrl,
              name: card.name,
              due: card.due,
              app: appLabel ? appLabel.name : 'Không có app',
              idMembers: card.idMembers || []
            };
          });

        const mappedMain = mapCards(data);
        const mappedDone = mapCards(doneData);

        setCards(mappedMain);
        setDoneCards(mappedDone);

      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const memberMap = Object.fromEntries(memberList.map(m => [m.id, m.name]));
  const allMembers = ['Tất cả', ...new Set(memberList.map(m => m.name))];

  const filterCards = (cards) =>
    cards.filter(card => {
      const matchApp = selectedApp === 'Tất cả' || card.app === selectedApp;
      return matchApp;
    });

  const filteredCards = filterCards(cards);
  const filteredDoneCards = filterCards(doneCards);

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

  const handleAppClick = (app) => {
    setSelectedApp(app === selectedApp ? 'Tất cả' : app);
  };

  const renderAppStats = (cardList, title) => {
    const appStats = cardList.reduce((acc, card) => {
      acc[card.app] = (acc[card.app] || 0) + 1;
      return acc;
    }, {});
    const totalCards = cardList.length;
    const top3Apps = Object.entries(appStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([app]) => app);

    return (
      <Box sx={{ 
        mb: 4,
        background: 'white',
        borderRadius: 3,
        p: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
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
            }}
          >
            <PhoneAndroidIcon /> {title}
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
                borderRadius: 2
              }}
            >
              📊 Tổng số: <span style={{ color: theme.palette.primary.main, fontWeight: 600 }}>{totalCards}</span>
            </Typography>
          </Box>
        </Box>
        <Grid container spacing={2}>
          {Object.entries(appStats)
            .sort(([, a], [, b]) => b - a)
            .map(([app, count]) => {
              const percent = totalCards > 0 ? (count / totalCards) * 100 : 0;
              const isTopApp = top3Apps.includes(app);
              const isSelected = selectedApp === app;
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
                      transition: 'all 0.3s ease',
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
                          gap: 1
                        }}
                      >
                        📱 {app}
                        {isSelected && (
                          <Typography
                            component="span"
                            sx={{
                              ml: 1,
                              color: 'primary.main',
                              fontSize: '0.8rem',
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
                        sx={{ mb: 2 }}
                      >
                        {count} cards ({percent.toFixed(1)}%)
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 8,
                          borderRadius: 5,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: isTopApp ? 'error.main' : 'primary.main',
                            borderRadius: 5,
                            transition: 'all 0.3s ease',
                          }
                        }}
                      />
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
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          background: 'white',
          '& .MuiTableCell-root': {
            py: 2,
            px: 3,
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              '& .MuiTableCell-root': {
                fontWeight: 600,
                color: 'primary.main',
                fontSize: '1rem',
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
            {filteredCards.map(card => {
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
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  transform: 'scale(1.01)',
                }
              };

              return (
                <TableRow key={card.shortUrl} sx={rowStyle}>
                  <TableCell>
                    <a
                      href={card.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {card.name}
                    </a>
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
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          🛠️ Dev Fixing Dashboard
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
                fontWeight: 600
              }}
            >
              🔄 Pending: {cards.length}
            </Typography>
          </Box>
          <Box sx={{
            backgroundColor: alpha(theme.palette.success.main, 0.1),
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
                color: theme.palette.success.main,
                fontWeight: 600
              }}
            >
              ✅ Done: {doneCards.length}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Tabs 
        value={tab} 
        onChange={(e, newValue) => setTab(newValue)} 
        sx={{ 
          mb: 4,
          background: 'white',
          borderRadius: 2,
          p: 1,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
            borderRadius: 3,
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            }
          }
        }}
      >
        <Tab 
          icon={<PendingActionsIcon />} 
          label="📋 Pending" 
          iconPosition="start"
        />
        <Tab 
          icon={<CheckCircleIcon />} 
          label="✅ Done" 
          iconPosition="start"
        />
      </Tabs>

      {tab === 0 && (
        <>
          {renderAppStats(filteredCards, '📊 Thống kê theo App')}
          {renderTable(filteredCards)}
        </>
      )}

      {tab === 1 && (
        <>
          {renderAppStats(filteredDoneCards, '✅ Thống kê Done theo App')}
          {renderTable(filteredDoneCards)}
        </>
      )}
    </Box>
  );
}
