import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, useTheme } from '@mui/material';
import CardsDetail from './Data/CardsDetail';
import ActionsDetail from './Data/ActionsDetail';

const PerformanceTS = () => {
  const [tab, setTab] = useState('cards');
  const theme = useTheme();

    return (
    <Box
      sx={{
        minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)', 
        py: { xs: 1, sm: 2, md: 4 },
        px: { xs: 0, sm: 1, md: 2 },
                display: 'flex',
                flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
      }}
    >
                {/* Header */}
      <Box sx={{ mb: 2, px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          sx={{
            color: '#1976d2',
            fontWeight: 900,
                        letterSpacing: 2, 
            textShadow: '0 2px 12px #b6c2d9',
            fontSize: { xs: 24, sm: 30, md: 36 },
            textAlign: 'left',
            mb: 1,
          }}
        >
        Performance TS
        </Typography>
        <Box sx={{ height: 3, width: 60, background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)', borderRadius: 2 }} />
      </Box>
      {/* Tabs horizontal */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="standard"
          sx={{
            borderRadius: 4,
            minHeight: 48,
            '& .MuiTabs-flexContainer': {
              borderRadius: 4,
              overflow: 'hidden',
            },
            '& .MuiTab-root': {
                        fontWeight: 700, 
              fontSize: 17,
              borderRadius: 4,
              transition: 'background 0.2s, color 0.2s',
              minHeight: 48,
              color: '#64748b',
              textTransform: 'none',
              px: 3,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                background: 'linear-gradient(90deg, #e3f2fd 0%, #e0e7ef 100%)',
                boxShadow: '0 2px 8px 0 #b6c2d933',
              },
              '&:hover': {
                background: 'rgba(25, 118, 210, 0.07)',
                color: theme.palette.primary.main,
              },
            },
            '& .MuiTabs-indicator': {
              height: 4,
                                borderRadius: 2,
              background: theme.palette.primary.main,
            },
          }}
        >
          <Tab label={<Typography sx={{ fontWeight: 700, fontSize: 17 }}>Cards Detail</Typography>} value="cards" />
          <Tab label={<Typography sx={{ fontWeight: 700, fontSize: 17 }}>Actions Detail</Typography>} value="actions" />
        </Tabs>
                                            </Box>
      {/* Content */}
      <Box
                                    sx={{ 
                                flex: 1,
          width: '100%',
          maxWidth: '100%',
          p: { xs: 2, sm: 3, md: 4 },
          minHeight: 320,
        }}
      >
        {tab === 'cards' && <CardsDetail />}
        {tab === 'actions' && <ActionsDetail />}
                                                    </Box>
                                                </Box>
    );
};

export default PerformanceTS;
