import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    CircularProgress,
    Stack,
    Chip,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { getCardsByList, getListsByBoardId } from '../api/trelloApi';
import CardDetailModal from './CardDetailModal';

const BaSummary = () => {
    const [selectedList, setSelectedList] = useState('');
    const [selectedApp, setSelectedApp] = useState('');
    const [lists, setLists] = useState([]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Generate color based on string
    const generateColor = (str) => {
        const colors = [
            '#2563eb', // Blue
            '#16a34a', // Green
            '#dc2626', // Red
            '#9333ea', // Purple
            '#ea580c', // Orange
            '#0891b2', // Cyan
            '#4f46e5', // Indigo
            '#db2777', // Pink
            '#059669', // Emerald
            '#7c3aed', // Violet
            '#ca8a04', // Yellow
            '#be123c', // Rose
            '#0d9488', // Teal
        ];
        
        // Get a consistent index for the same string
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    };

    // Get unique app labels from cards
    const getAppLabels = () => {
        const appLabels = new Set();
        cards.forEach(card => {
            card.labels?.forEach(label => {
                if (label.name.startsWith('App')) {
                    appLabels.add(label.name);
                }
            });
        });
        return Array.from(appLabels).sort();
    };

    // Filter cards based on selected app
    const filteredCards = selectedApp
        ? cards.filter(card => 
            card.labels?.some(label => label.name === selectedApp)
          )
        : cards;

    // Handle app selection change
    const handleAppChange = (event) => {
        setSelectedApp(event.target.value);
    };

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const fetchedLists = await getListsByBoardId();
                if (fetchedLists) {
                    setLists(fetchedLists);
                    // Find and set the "Done" list as default
                    const doneList = fetchedLists.find(list => list.name.toLowerCase() === 'done');
                    if (doneList) {
                        setSelectedList(doneList.id);
                        // Fetch cards for the Done list
                        try {
                            const fetchedCards = await getCardsByList(doneList.id);
                            setCards(fetchedCards);
                        } catch (err) {
                            console.error('Error fetching initial cards:', err);
                        }
                    }
                } else {
                    setError('Failed to fetch lists');
                    setSnackbar({
                        open: true,
                        message: 'Failed to fetch lists from the board',
                        severity: 'error'
                    });
                }
            } catch (err) {
                console.error('Error fetching lists:', err);
                setError('Failed to fetch lists');
                setSnackbar({
                    open: true,
                    message: 'Failed to fetch lists from the board',
                    severity: 'error'
                });
            }
        };

        fetchLists();
    }, []);

    const handleListChange = async (event) => {
        const listId = event.target.value;
        setSelectedList(listId);
        
        if (!listId) {
            setCards([]);
            return;
        }

        setLoading(true);
        try {
            const fetchedCards = await getCardsByList(listId);
            setCards(fetchedCards);
            setError(null);
        } catch (err) {
            console.error('Error fetching cards:', err);
            setError('Failed to fetch cards');
            setSnackbar({
                open: true,
                message: 'Failed to fetch cards from the selected list',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (cardId) => {
        setSelectedCardId(cardId);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
            >
                <Typography 
                    variant="h5" 
                    gutterBottom
                    sx={{ 
                        color: '#1e293b',
                        fontWeight: 600,
                        mb: 3
                    }}
                >
                    BA Summary
                </Typography>

                {/* Filters Section */}
                <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    mb: 4,
                    flexWrap: 'wrap'
                }}>
                    {/* List Selection */}
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel id="list-select-label">Select List</InputLabel>
                        <Select
                            labelId="list-select-label"
                            id="list-select"
                            value={selectedList}
                            label="Select List"
                            onChange={handleListChange}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.24)'
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {lists.map(list => (
                                <MenuItem key={list.id} value={list.id}>
                                    {list.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* App Selection */}
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel id="app-select-label">Select App</InputLabel>
                        <Select
                            labelId="app-select-label"
                            id="app-select"
                            value={selectedApp}
                            label="Select App"
                            onChange={handleAppChange}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.12)'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(0, 0, 0, 0.24)'
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>All Apps</em>
                            </MenuItem>
                            {getAppLabels().map(appLabel => (
                                <MenuItem key={appLabel} value={appLabel}>
                                    {appLabel}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Cards Display */}
                {loading ? (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 200 
                    }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : filteredCards.length > 0 ? (
                    <TableContainer component={Paper} elevation={0}>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell 
                                        sx={{ 
                                            width: '80px',
                                            fontWeight: 600,
                                            backgroundColor: '#f8fafc',
                                            color: '#475569'
                                        }}
                                    >
                                        STT
                                    </TableCell>
                                    <TableCell 
                                        sx={{ 
                                            fontWeight: 600,
                                            backgroundColor: '#f8fafc',
                                            color: '#475569'
                                        }}
                                    >
                                        Card Name
                                    </TableCell>
                                    <TableCell 
                                        sx={{ 
                                            fontWeight: 600,
                                            backgroundColor: '#f8fafc',
                                            color: '#475569'
                                        }}
                                    >
                                        App Label
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCards.map((card, index) => (
                                    <TableRow
                                        key={card.id}
                                        onClick={() => handleRowClick(card.id)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: 'rgba(0, 0, 0, 0.02)'
                                            }
                                        }}
                                    >
                                        <TableCell 
                                            sx={{ 
                                                color: '#64748b',
                                                fontWeight: 500
                                            }}
                                        >
                                            {index + 1}
                                        </TableCell>
                                        <TableCell 
                                            component="th" 
                                            scope="row"
                                            sx={{ 
                                                color: '#1e293b',
                                                fontWeight: 500
                                            }}
                                        >
                                            {card.name}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                {card.labels
                                                    ?.filter(label => label.name.startsWith('App'))
                                                    .map(label => (
                                                        <Chip
                                                            key={label.id}
                                                            label={label.name}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: generateColor(label.name),
                                                                color: '#ffffff',
                                                                fontWeight: 500,
                                                                fontSize: '0.75rem',
                                                                '&:hover': {
                                                                    opacity: 0.9
                                                                }
                                                            }}
                                                        />
                                                    ))
                                                }
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">
                        No cards found for the selected filters
                    </Alert>
                )}

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                        severity={snackbar.severity}
                        variant="filled"
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                {/* Card Detail Modal */}
                <CardDetailModal
                    open={Boolean(selectedCardId)}
                    onClose={() => setSelectedCardId(null)}
                    cardId={selectedCardId}
                />
            </Paper>
        </Box>
    );
};

export default BaSummary;
