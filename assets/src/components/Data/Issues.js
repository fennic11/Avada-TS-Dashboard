import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  TextField,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button
} from '@mui/material';
import members from '../../data/members.json';
import { getCardsByBoardWithDateFilter } from '../../api/trelloApi';

const Issues = () => {
  const [selectedMember, setSelectedMember] = useState('');
  const [tsMembers, setTsMembers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to get date string in YYYY-MM-DD format
  const getFormattedDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Function to set default dates (last 7 days)
  const setDefaultDates = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    setEndDate(getFormattedDate(today));
    setStartDate(getFormattedDate(lastWeek));
  };

  useEffect(() => {
    // Filter members with TS and TS-lead roles
    const filteredMembers = members.filter(member => 
      member.role === 'TS' || member.role === 'TS-lead'
    );
    setTsMembers(filteredMembers);

    // Set default dates and fetch initial data
    setDefaultDates();
  }, []);

  const handleGetData = async () => {
    if (!startDate && !endDate) {
      alert('Please select at least one date');
      return;
    }

    setLoading(true);
    try {
      const cards = await getCardsByBoardWithDateFilter(startDate, endDate);
      if (cards) {
        // Filter cards by selected member if any
        const filteredCards = selectedMember 
          ? cards.filter(card => card.idMembers && card.idMembers.includes(selectedMember))
          : cards;
        setFilteredCards(filteredCards);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
    setLoading(false);
  };

  // Effect to fetch data when dates are set
  useEffect(() => {
    if (startDate && endDate) {
      handleGetData();
    }
  }, [startDate, endDate]);

  // Effect to filter cards when member selection changes
  useEffect(() => {
    if (filteredCards.length > 0) {
      const filteredByMember = selectedMember 
        ? filteredCards.filter(card => card.idMembers && card.idMembers.includes(selectedMember))
        : filteredCards;
      setFilteredCards(filteredByMember);
    }
  }, [selectedMember]);

  const handleMemberChange = (event) => {
    setSelectedMember(event.target.value);
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1800px', margin: '0 auto' }}>
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          mb: 3,
          borderRadius: 2,
          background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            color: '#1a237e',
            mb: 3
          }}
        >
          Filters
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel 
                sx={{ 
                  color: '#1a237e',
                  '&.Mui-focused': {
                    color: '#1a237e'
                  }
                }}
              >
                Select Member
              </InputLabel>
              <Select
                value={selectedMember}
                onChange={handleMemberChange}
                label="Select Member"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1a237e',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1a237e',
                  }
                }}
              >
                <MenuItem value="">
                  <em>All Members</em>
                </MenuItem>
                {tsMembers.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        src={member.avatarUrl} 
                        alt={member.fullName}
                        sx={{ 
                          width: 32, 
                          height: 32,
                          border: '2px solid #e0e0e0'
                        }}
                      >
                        {member.initials}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 500 }}>{member.fullName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.role}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: { 
                  color: '#1a237e',
                  '&.Mui-focused': {
                    color: '#1a237e'
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#1a237e',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1a237e',
                  }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                sx: { 
                  color: '#1a237e',
                  '&.Mui-focused': {
                    color: '#1a237e'
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#1a237e',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1a237e',
                  }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleGetData}
              disabled={loading}
              sx={{
                height: '56px',
                backgroundColor: '#1a237e',
                '&:hover': {
                  backgroundColor: '#283593'
                }
              }}
            >
              {loading ? 'Loading...' : 'Get Data'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Selected Member Info */}
      {selectedMember && (
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 2,
            background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Avatar 
                src={tsMembers.find(m => m.id === selectedMember)?.avatarUrl}
                alt={tsMembers.find(m => m.id === selectedMember)?.fullName}
                sx={{ 
                  width: 64, 
                  height: 64,
                  border: '3px solid #1a237e'
                }}
              >
                {tsMembers.find(m => m.id === selectedMember)?.initials}
              </Avatar>
            </Grid>
            <Grid item>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: '#1a237e',
                  mb: 1
                }}
              >
                {tsMembers.find(m => m.id === selectedMember)?.fullName}
              </Typography>
              <Chip 
                label={tsMembers.find(m => m.id === selectedMember)?.role}
                color="primary"
                size="small"
                sx={{ 
                  fontWeight: 500,
                  backgroundColor: '#1a237e',
                  '&:hover': {
                    backgroundColor: '#283593'
                  }
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Cards List */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 3,
          borderRadius: 2,
          background: 'linear-gradient(to right, #ffffff, #f8f9fa)'
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            color: '#1a237e',
            mb: 3
          }}
        >
          Cards
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        {loading ? (
          <Typography>Loading...</Typography>
        ) : filteredCards.length > 0 ? (
          <List>
            {filteredCards.map((card) => (
              <Card key={card.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        {card.name}
                      </Typography>
                    </Grid>
                    {card.desc && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          {card.desc}
                        </Typography>
                      </Grid>
                    )}
                    {card.due && (
                      <Grid item xs={12}>
                        <Chip 
                          label={`Due: ${new Date(card.due).toLocaleDateString()}`}
                          color={card.dueComplete ? "success" : "warning"}
                          size="small"
                        />
                      </Grid>
                    )}
                    {card.labels && card.labels.length > 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {card.labels.map((label) => (
                            <Chip
                              key={label.id}
                              label={label.name}
                              size="small"
                              sx={{ 
                                backgroundColor: label.color,
                                color: 'white'
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </List>
        ) : (
          <Typography>No cards found</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Issues;