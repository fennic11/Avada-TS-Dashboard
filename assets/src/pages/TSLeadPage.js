import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import TSLeadSummary from '../components/Data/TSLeadSummary';



const TSLead = ({ children }) => {

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>

                {/* Bố cục Sidebar + Main Content */}
                <Box sx={{paddingLeft: '2rem' }}> {/* Thêm margin-top bằng chiều cao Header */}
                    {/* Main content: Thêm padding để tránh bị tràn */}
                    <TSLeadSummary />
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default TSLead;
