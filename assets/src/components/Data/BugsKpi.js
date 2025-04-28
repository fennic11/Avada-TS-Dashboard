import { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Grid,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Accordion,
    AccordionSummary, AccordionDetails, Card, CardContent, Link,
    Chip, Stack, Divider, useTheme, FormControl, InputLabel, Select, MenuItem, alpha, Button, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { getCardsByList, getListsByBoardId } from '../../api/trelloApi';
import members from '../../data/members.json';

const BOARD_ID = '638d769884c52b05235a2310';
const DEFAULT_LIST_ID = '663ae7d6feac5f2f8d7a1c86';

const BugsKpiSummary = ({ selectedList = DEFAULT_LIST_ID }) => {
    const [memberKPIs, setMemberKPIs] = useState({});
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState([]);
    const [currentList, setCurrentList] = useState(selectedList);
    const theme = useTheme();

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const listsData = await getListsByBoardId(BOARD_ID);
                if (listsData) {
                    setLists(listsData);
                }
            } catch (error) {
                console.error('Error fetching lists:', error);
            }
        };

        fetchLists();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentList) return;

            try {
                setLoading(true);

                const cards = await getCardsByList(currentList);
                if (!cards) return;

                const kpiData = {};

                for (let card of cards) {
                    const memberIds = card.idMembers.filter(id => members.some(m => m.id === id));

                    if (memberIds.length === 1) {
                        const id = memberIds[0];
                        if (!kpiData[id]) {
                            kpiData[id] = {
                                points: 0,
                                cards: [],
                                cardCount: 0
                            };
                        }

                        kpiData[id].points += 15;
                        kpiData[id].cardCount += 1;
                        kpiData[id].cards.push({ ...card, point: 15 });
                    } else if (memberIds.length === 2) {
                        for (let id of memberIds) {
                            if (!kpiData[id]) {
                                kpiData[id] = {
                                    points: 0,
                                    cards: [],
                                    cardCount: 0
                                };
                            }

                            kpiData[id].points += 7.5;
                            kpiData[id].cardCount += 1;
                            kpiData[id].cards.push({ ...card, point: 7.5 });
                        }
                    }
                }

                setMemberKPIs(kpiData);
            } catch (err) {
                console.error(err);
                alert("Đã xảy ra lỗi khi lấy dữ liệu tab Bugs.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentList]);

    const handleListChange = (e) => {
        setCurrentList(e.target.value);
    };

    const getMemberName = (id) => {
        const mem = members.find((m) => m.id === id);
        return mem?.kpiName || mem?.fullName || id;
    };

    const handleExportCards = async () => {
        try {
            const cards = await getCardsByList(currentList);
            if (!cards) return;

            const exportData = Object.entries(memberKPIs).map(([memberId, data]) => {
                const today = new Date();
                const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
                const member = members.find(m => m.id === memberId);
                const memberName = member?.kpiName || member?.fullName || memberId;

                return {
                    date: formattedDate,
                    member: memberName,
                    app: '',
                    issue: 'Issues fu với dev',
                    link: '',
                    level: '',
                    point: data.points
                };
            });

            // Convert to CSV
            const headers = ['Date', 'Member', 'App', 'Issue', 'Link', 'Level', 'Point'];
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => [
                    row.date,
                    `"${row.member}"`,
                    `"${row.app}"`,
                    `"${row.issue}"`,
                    `"${row.link}"`,
                    `"${row.level}"`,
                    row.point
                ].join(','))
            ].join('\n');

            // Create and download file
            const selectedListObj = lists.find(list => list.id === currentList);
            const listName = selectedListObj ? selectedListObj.name.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
            const today = new Date();
            const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Export_KPI_${listName}_${formattedDate.replace(/\//g, '_')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting cards:', error);
            alert('Error exporting cards. Please try again.');
        }
    };

    const handleCopyToClipboard = async () => {
        try {
            const exportData = Object.entries(memberKPIs).map(([memberId, data]) => {
                const today = new Date();
                const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
                const member = members.find(m => m.id === memberId);
                const memberName = member?.kpiName || member?.fullName || memberId;

                return [
                    formattedDate,
                    memberName,
                    '',
                    'Issues fu với dev',
                    '',
                    '',
                    data.points
                ].join('\t');
            }).join('\n');

            await navigator.clipboard.writeText(exportData);
            alert('Data copied to clipboard!');
        } catch (error) {
            console.error('Error copying data:', error);
            alert('Error copying data. Please try again.');
        }
    };

    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 2
            }}>
                <CircularProgress size={60} />
                <Typography variant="h6" color="text.secondary">
                    Đang tải dữ liệu KPI Bugs...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', p: 4 }}>
            <Box sx={{ 
                mb: 4,
                display: 'flex', 
                alignItems: 'center',
                gap: 2
            }}>
                <FormControl 
                    sx={{ 
                        minWidth: 300,
                        '& .MuiInputLabel-root': {
                            color: theme.palette.text.secondary,
                            '&.Mui-focused': {
                                color: theme.palette.primary.main,
                            }
                        }
                    }}
                >
                    <InputLabel>Chọn List</InputLabel>
                    <Select
                        value={currentList}
                        label="Chọn List"
                        onChange={handleListChange}
                        sx={{
                            backgroundColor: 'white',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: alpha(theme.palette.primary.main, 0.2),
                                borderWidth: 2,
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main,
                            },
                            '& .MuiSelect-select': {
                                py: 1.5,
                                px: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }
                        }}
                    >
                        {lists.map((list) => (
                            <MenuItem 
                                key={list.id} 
                                value={list.id}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                                        }
                                    }
                                }}
                            >
                                <AssignmentIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
                                {list.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCards}
                    sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.9),
                        }
                    }}
                >
                    Export Cards
                </Button>
                <Tooltip title="Copy data to clipboard">
                    <Button
                        variant="contained"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopyToClipboard}
                        sx={{
                            backgroundColor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.9),
                            }
                        }}
                    >
                        Copy Data
                    </Button>
                </Tooltip>
            </Box>

            <Grid container spacing={3}>
                {Object.entries(memberKPIs).map(([memberId, data]) => {
                    if (data.cards.length === 0) return null;

                    return (
                        <Grid item xs={12} md={6} key={memberId}>
                            <Card 
                                variant="outlined" 
                                sx={{ 
                                    borderRadius: 3,
                                    boxShadow: 2,
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4
                                    }
                                }}
                            >
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <PersonIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                {getMemberName(memberId)}
                                            </Typography>
                                        </Box>
                                        
                                        <Divider />
                                        
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                            <Chip
                                                icon={<AssignmentIcon />}
                                                label={`Tổng card: ${data.cardCount}`}
                                                color="primary"
                                                variant="outlined"
                                                sx={{ borderRadius: 2 }}
                                            />
                                            <Chip
                                                icon={<EmojiEventsIcon />}
                                                label={`Tổng KPI: ${data.points}`}
                                                color="success"
                                                variant="outlined"
                                                sx={{ borderRadius: 2 }}
                                            />
                                        </Box>

                                        <Accordion 
                                            sx={{ 
                                                borderRadius: 2,
                                                '&:before': { display: 'none' }
                                            }}
                                        >
                                            <AccordionSummary 
                                                expandIcon={<ExpandMoreIcon />}
                                                sx={{ 
                                                    borderRadius: 2,
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.action.hover
                                                    }
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 500 }}>
                                                    Chi tiết ({data.cards.length} card)
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <TableContainer 
                                                    component={Paper} 
                                                    sx={{ 
                                                        borderRadius: 2,
                                                        boxShadow: 1
                                                    }}
                                                >
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>Tên Card</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>Điểm</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {data.cards.map((card) => (
                                                                <TableRow 
                                                                    key={card.id}
                                                                    sx={{
                                                                        '&:hover': {
                                                                            backgroundColor: theme.palette.action.hover
                                                                        }
                                                                    }}
                                                                >
                                                                    <TableCell>
                                                                        <Link
                                                                            href={card.shortUrl}
                                                                            target="_blank"
                                                                            rel="noopener"
                                                                            sx={{
                                                                                textDecoration: 'none',
                                                                                color: theme.palette.primary.main,
                                                                                '&:hover': {
                                                                                    textDecoration: 'underline'
                                                                                }
                                                                            }}
                                                                        >
                                                                            {card.name}
                                                                        </Link>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip 
                                                                            label={card.point} 
                                                                            size="small"
                                                                            color="primary"
                                                                            variant="outlined"
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </AccordionDetails>
                                        </Accordion>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default BugsKpiSummary;
