import React from 'react';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PerformanceTS from '../components/PerformanceTS';


const PerformanceTSPage = () => {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>

                {/* Bố cục Sidebar + Main Content */}
                <Box sx={{paddingLeft: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    {/* Main content: Thêm padding để tránh bị tràn */}
                    <PerformanceTS />
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default PerformanceTSPage;