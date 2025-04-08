import React from 'react';
import {
    Box,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import GetAppIcon from '@mui/icons-material/GetApp';

const FilterBar = ({ filters = {}, onChange }) => {
    const handleChange = (field, value) => {
        onChange({ ...filters, [field]: value });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                p: 2,
                border: '1px solid #ccc',
                borderRadius: 2,
                backgroundColor: '#f9f9f9',
            }}
        >
            {/* Start Date */}
            <DatePicker
                label="Ngày bắt đầu"
                value={filters.startDate || null}
                onChange={(newValue) => handleChange('startDate', newValue)}
                renderInput={(params) => <TextField {...params} />}
            />

            {/* End Date */}
            <DatePicker
                label="Ngày kết thúc"
                value={filters.endDate || null}
                onChange={(newValue) => handleChange('endDate', newValue)}
                renderInput={(params) => <TextField {...params} />}
            />

            {/* Select TS Name */}
            <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="ts-name-label">Tên TS</InputLabel>
                <Select
                    labelId="ts-name-label"
                    value={filters.tsName || ''}
                    label="Tên TS"
                    onChange={(e) => handleChange('tsName', e.target.value)}
                >
                    <MenuItem value="">
                        <em>Tất cả</em>
                    </MenuItem>
                    <MenuItem value="TS01">TS01</MenuItem>
                    <MenuItem value="TS02">TS02</MenuItem>
                    <MenuItem value="TS03">TS03</MenuItem>
                </Select>
            </FormControl>

            {/* Select App Name */}
            <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="app-name-label">Tên App</InputLabel>
                <Select
                    labelId="app-name-label"
                    value={filters.appName || ''}
                    label="Tên App"
                    onChange={(e) => handleChange('appName', e.target.value)}
                >
                    <MenuItem value="">
                        <em>Tất cả</em>
                    </MenuItem>
                    <MenuItem value="App A">App A</MenuItem>
                    <MenuItem value="App B">App B</MenuItem>
                    <MenuItem value="App C">App C</MenuItem>
                </Select>
            </FormControl>

            <Button variant="contained" endIcon={<GetAppIcon />}>
                Get Data
            </Button>
        </Box>
    );
};

export default FilterBar;
