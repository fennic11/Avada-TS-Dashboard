import React from 'react';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ResolutionTimeList from '../components/Data/RevolutionTime';



const RevolutionTime = ({ children }) => {

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>

                {/* Bố cục Sidebar + Main Content */}
                <Box sx={{padding: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    {/* Main content: Thêm padding để tránh bị tràn */}
                    <ResolutionTimeList />
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default RevolutionTime;