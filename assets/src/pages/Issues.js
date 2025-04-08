import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import IssueSummary from '../components/Data/Issues';



const Issues = ({ children }) => {

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
                {/* Header cố định trên cùng */}

                {/* Bố cục Sidebar + Main Content */}
                <Box sx={{padding: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    {/* Main content: Thêm padding để tránh bị tràn */}
                    <IssueSummary />
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default Issues;
