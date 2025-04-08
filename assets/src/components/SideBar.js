import { Box, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BugReportIcon from '@mui/icons-material/BugReport';

const drawerWidth = 240;

const Sidebar = () => {
    return (
        <Box
            sx={{
                width: drawerWidth,
                height: '100vh',
                position: 'fixed', // Cố định sidebar
                top: 64, // Đặt dưới Header
                left: 0,
                backgroundColor: '#f5f5f5',
                borderRight: '1px solid #ddd',
                p: 2,
            }}
        >
            <List>
                <ListItem button>
                    <ListItemIcon><DashboardIcon /></ListItemIcon>
                    <ListItemText primary="Dashboard" />
                </ListItem>

                <ListItem button>
                    <ListItemIcon><BugReportIcon /></ListItemIcon>
                    <ListItemText primary="Reports" />
                </ListItem>
            </List>
        </Box>
    );
};

export default Sidebar;
