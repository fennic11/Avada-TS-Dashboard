import { useState } from 'react';
import {
    Tabs, Tab, Box, Typography
} from '@mui/material';
import IssuesKpiSummary from './IssuesKpi';
import BugsKpiSummary from './BugsKpi';

// TabPanel helper component
const TabPanel = ({ children, value, index }) => {
    return (
        value === index && (
            <Box>
                {children}
            </Box>
        )
    );
};

const KpiSummary = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ width: '95%', p: 3 }}>
            <Typography variant="h4" gutterBottom>
                KPI Avada CS Team
            </Typography>

            <Tabs
                value={tab}
                onChange={(e, newValue) => setTab(newValue)}
                sx={{ mb: 3 }}
            >
                <Tab label="📋 Issues" />
                <Tab label="✅ Bugs" />
            </Tabs>

            <TabPanel value={tab} index={0}>
                <IssuesKpiSummary />
            </TabPanel>
            <TabPanel value={tab} index={1}>
                <BugsKpiSummary />
            </TabPanel>
        </Box>
    );
};

export default KpiSummary;
