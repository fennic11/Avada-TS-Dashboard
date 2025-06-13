import React from 'react';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SlackNotification from '../components/SlackNotification';



const Slack = ({ children }) => {

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
                {/* Bố cục Sidebar + Main Content */}
                <Box sx={{paddingLeft: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    {/* Main content: Thêm padding để tránh bị tràn */}
                    <SlackNotification />
                </Box>
        </LocalizationProvider>
    );
};

export default Slack;