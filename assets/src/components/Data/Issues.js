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
  Chip
} from '@mui/material';
import members from '../../data/members.json';

const Issues = () => {
  const [selectedMember, setSelectedMember] = useState('');
  const [tsMembers, setTsMembers] = useState([]);

  useEffect(() => {
    // Filter members with TS and TS-lead roles
    const filteredMembers = members.filter(member => 
      member.role === 'TS' || member.role === 'TS-lead'
    );
    setTsMembers(filteredMembers);
  }, []);

  const handleMemberChange = (event) => {
    setSelectedMember(event.target.value);
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1800px', margin: '0 auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Member Filter
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Select Member</InputLabel>
          <Select
            value={selectedMember}
            onChange={handleMemberChange}
            label="Select Member"
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
                    sx={{ width: 24, height: 24 }}
                  >
                    {member.initials}
                  </Avatar>
                  <Box>
                    <Typography>{member.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.role}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Selected Member Info */}
      {selectedMember && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Avatar 
                src={tsMembers.find(m => m.id === selectedMember)?.avatarUrl}
                alt={tsMembers.find(m => m.id === selectedMember)?.fullName}
                sx={{ width: 56, height: 56 }}
              >
                {tsMembers.find(m => m.id === selectedMember)?.initials}
              </Avatar>
            </Grid>
            <Grid item>
              <Typography variant="h6">
                {tsMembers.find(m => m.id === selectedMember)?.fullName}
              </Typography>
              <Chip 
                label={tsMembers.find(m => m.id === selectedMember)?.role}
                color="primary"
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default Issues;