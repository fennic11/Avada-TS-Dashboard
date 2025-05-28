import React from 'react';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Leaderboard from '../components/Leaderboard';



const LeaderboardPage = ({ children }) => {

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>

                <Box sx={{padding: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    <Leaderboard />
                </Box>
        </LocalizationProvider>
    );
};

export default LeaderboardPage;