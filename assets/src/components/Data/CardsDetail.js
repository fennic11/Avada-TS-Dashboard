import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, TextField, Paper, FormControl, InputLabel, Select, MenuItem, Chip, Tooltip, Fade } from '@mui/material';
import dayjs from 'dayjs';
import members from '../../data/members.json';
import lists from '../../data/listsId.json';
import appData from '../../data/app.json';
import { getCardsByBoardForPerformanceTS } from '../../api/trelloApi';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { calculateResolutionTime } from '../../utils/resolutionTime';
import CardDetailModal from '../CardDetailModal';

const shiftLabels = [
    { label: 'Ca 1', hours: [0,1,2,3] },
    { label: 'Ca 2', hours: [4,5,6,7] },
    { label: 'Ca 3', hours: [8,9,10,11] },
    { label: 'Ca 4', hours: [12,13,14,15] },
    { label: 'Ca 5', hours: [16,17,18,19] }, // gộp 5.1 và 5.2
    { label: 'Ca 6', hours: [20,21,22,23] },
];

function getShift(dateString) {
    if (!dateString) return null;
    const hour = dayjs(dateString).hour();
    if (hour >= 0 && hour < 4) return 'Ca 1';
    if (hour >= 4 && hour < 8) return 'Ca 2';
    if (hour >= 8 && hour < 12) return 'Ca 3';
    if (hour >= 12 && hour < 16) return 'Ca 4';
    if (hour >= 16 && hour < 18) return 'Ca 5.1';
    if (hour >= 18 && hour < 20) return 'Ca 5.2';
    if (hour >= 20 && hour < 24) return 'Ca 6';
    return null;
}

const CardsDetail = () => {
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
    const [selectedTS, setSelectedTS] = useState('');
    const [selectedList, setSelectedList] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedShift, setSelectedShift] = useState('');
    const [selectedRemovalTS, setSelectedRemovalTS] = useState('');
    const [resolutionTimes, setResolutionTimes] = useState({});
    const [selectedCardDetail, setSelectedCardDetail] = useState(null);
    const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState('');
    const [heatmapFilter, setHeatmapFilter] = useState(null);
    const [createdCardsHeatmapFilter, setCreatedCardsHeatmapFilter] = useState(null);
    const [heatmapFilterTS1, setHeatmapFilterTS1] = useState(null);
    const [createdCardsHeatmapFilterTS1, setCreatedCardsHeatmapFilterTS1] = useState(null);
    const [heatmapFilterTS2, setHeatmapFilterTS2] = useState(null);
    const [createdCardsHeatmapFilterTS2, setCreatedCardsHeatmapFilterTS2] = useState(null);

    // Filter TS and TS-lead members
    const tsMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead'
    );

    // Get list name by ID
    const getListName = (listId) => {
        const list = lists.find(l => l.id === listId);
        return list ? list.name : 'Unknown List';
    };

    // Get count of cards by list ID
    const getCardCountByList = (listId) => {
        return filteredByHeatmap.filter(card => card.idList === listId).length;
    };

    // Status list IDs
    const STATUS_LISTS = {
        DEV_PENDING: '63c7b1a68e5576001577d65c', // Waiting to fix (from dev)
        TS_PENDING: '66262386cb856f894f7cdca2', // New Issues
        WAITING_PERMISSION: '63c7d18b4fe38a004885aadf', // Update workflow required or Waiting for access
        WAITING_CONFIRMATION: '63f489b961f3a274163459a2', // Waiting for Customer's Confirmation
        TS_DONE: '66d7d254bdad4fb0a354495a', // Done
        DEV_DONE: '663ae7d6feac5f2f8d7a1c86' // Fix done from dev
    };

    // Status box component
    const StatusBox = ({ title, count, color, listId }) => (
        <Paper elevation={0} sx={{ 
            p: 2, 
            borderRadius: 2, 
            background: 'white', 
            boxShadow: '0 1px 4px 0 #e0e7ef',
            border: `1px solid ${color}`,
            minWidth: 200,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
            },
            ...(selectedList === listId && {
                background: `${color}10`,
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
            })
        }}
        onClick={() => {
            setSelectedList(listId === selectedList ? '' : listId);
        }}>
            <Typography variant="h6" sx={{ color: color, fontWeight: 700, mb: 1 }}>{title}</Typography>
            <Typography variant="h4" sx={{ color: color, fontWeight: 800 }}>{count}</Typography>
        </Paper>
    );

    // Calculate self-removal count for each TS member
    const getSelfRemovalData = (cards) => {
        const removalCounts = {};
        
        cards.forEach(card => {
            if (Array.isArray(card.actions)) {
                card.actions.forEach(action => {
                    if (action.type === 'removeMemberFromCard') {
                        const memberId = action.member.id;
                        const memberName = tsMembers.find(m => m.id === memberId)?.fullName;
                        
                        if (memberName) {
                            removalCounts[memberName] = (removalCounts[memberName] || 0) + 1;
                        }
                    }
                });
            }
        });

        return Object.entries(removalCounts).map(([name, count]) => ({
            name,
            value: count
        })).sort((a, b) => b.value - a.value);
    };

    // Get cards where TS removed themselves
    const getSelfRemovedCards = (tsName, cards) => {
        return cards.filter(card => {
            if (Array.isArray(card.actions)) {
                return card.actions.some(action => 
                    action.type === 'removeMemberFromCard' && 
                    action.member.fullName === tsName
                );
            }
            return false;
        });
    };

    // Filter cards by selected TS member
    const filteredByTS = selectedTS
        ? cards.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(selectedTS))
        : cards;

    // Filter by list if selected
    const filteredByList = selectedList
        ? filteredByTS.filter(card => card.idList === selectedList)
        : filteredByTS;

    // Filter by shift if selected
    const filteredByShift = selectedShift
        ? filteredByList.filter(card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(a => a.type === 'createCard');
                if (createAction && createAction.date) {
                    const shift = getShift(createAction.date);
                    // Map Ca 5.1 and Ca 5.2 to Ca 5 for filtering
                    if (selectedShift === 'Ca 5') {
                        return shift === 'Ca 5.1' || shift === 'Ca 5.2';
                    }
                    return shift === selectedShift;
                }
            }
            return false;
        })
        : filteredByList;

    // Filter by self-removal if selected
    const filteredCards = selectedRemovalTS
        ? getSelfRemovedCards(selectedRemovalTS, filteredByShift)
        : filteredByShift;

    // Filter by app if selected
    const filteredByApp = selectedApp
        ? filteredCards.filter(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            return appLabels.some(label => label.name === selectedApp);
        })
        : filteredCards;

    // Filter by heatmap hour if selected (Completed Cards)
    const filteredByCompletedHeatmap = heatmapFilter !== null
        ? filteredByApp.filter(card => {
            if (Array.isArray(card.actions) && card.dueComplete) {
                const completeAction = [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.old?.dueComplete === false &&
                    action.data?.card?.dueComplete === true && 
                    action.date
                );
                
                // Fallback: if no old.dueComplete found, look for any updateCard with dueComplete: true
                const fallbackAction = !completeAction ? [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.card?.dueComplete === true && 
                    action.date
                ) : null;
                
                const finalAction = completeAction || fallbackAction;
                
                if (finalAction && finalAction.date) {
                    const hour = dayjs(finalAction.date).hour();
                    return hour === heatmapFilter;
                }
            }
            return false;
        })
        : filteredByApp;

    // Filter by created cards heatmap hour if selected
    const filteredByCreatedHeatmap = createdCardsHeatmapFilter !== null
        ? filteredByCompletedHeatmap.filter(card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(action => action.type === 'createCard');
                if (createAction && createAction.date) {
                    const hour = dayjs(createAction.date).hour();
                    return hour === createdCardsHeatmapFilter;
                }
            }
            return false;
        })
        : filteredByCompletedHeatmap;

    // Filter by TS1 completed cards heatmap hour if selected
    const filteredByTS1CompletedHeatmap = heatmapFilterTS1 !== null
        ? filteredByCreatedHeatmap.filter(card => {
            // Check if card belongs to TS1
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            const belongsToTS1 = appLabels.some(label => {
                const app = appData.find(a => a.label_trello === label.name);
                return app && app.group_ts === 'TS1';
            });
            
            if (belongsToTS1 && Array.isArray(card.actions) && card.dueComplete) {
                const completeAction = [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.old?.dueComplete === false &&
                    action.data?.card?.dueComplete === true && 
                    action.date
                );
                
                // Fallback: if no old.dueComplete found, look for any updateCard with dueComplete: true
                const fallbackAction = !completeAction ? [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.card?.dueComplete === true && 
                    action.date
                ) : null;
                
                const finalAction = completeAction || fallbackAction;
                
                if (finalAction && finalAction.date) {
                    const hour = dayjs(finalAction.date).hour();
                    return hour === heatmapFilterTS1;
                }
            }
            return false;
        })
        : filteredByCreatedHeatmap;

    // Filter by TS1 created cards heatmap hour if selected
    const filteredByTS1CreatedHeatmap = createdCardsHeatmapFilterTS1 !== null
        ? filteredByTS1CompletedHeatmap.filter(card => {
            // Check if card belongs to TS1
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            const belongsToTS1 = appLabels.some(label => {
                const app = appData.find(a => a.label_trello === label.name);
                return app && app.group_ts === 'TS1';
            });
            
            if (belongsToTS1 && Array.isArray(card.actions)) {
                const createAction = card.actions.find(action => action.type === 'createCard');
                if (createAction && createAction.date) {
                    const hour = dayjs(createAction.date).hour();
                    return hour === createdCardsHeatmapFilterTS1;
                }
            }
            return false;
        })
        : filteredByTS1CompletedHeatmap;

    // Filter by TS2 completed cards heatmap hour if selected
    const filteredByTS2CompletedHeatmap = heatmapFilterTS2 !== null
        ? filteredByTS1CreatedHeatmap.filter(card => {
            // Check if card belongs to TS2
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            const belongsToTS2 = appLabels.some(label => {
                const app = appData.find(a => a.label_trello === label.name);
                return app && app.group_ts === 'TS2';
            });
            
            if (belongsToTS2 && Array.isArray(card.actions) && card.dueComplete) {
                const completeAction = [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.old?.dueComplete === false &&
                    action.data?.card?.dueComplete === true && 
                    action.date
                );
                
                // Fallback: if no old.dueComplete found, look for any updateCard with dueComplete: true
                const fallbackAction = !completeAction ? [...card.actions].reverse().find(action => 
                    action.type === 'updateCard' && 
                    action.data?.card?.dueComplete === true && 
                    action.date
                ) : null;
                
                const finalAction = completeAction || fallbackAction;
                
                if (finalAction && finalAction.date) {
                    const hour = dayjs(finalAction.date).hour();
                    return hour === heatmapFilterTS2;
                }
            }
            return false;
        })
        : filteredByTS1CreatedHeatmap;

    // Filter by TS2 created cards heatmap hour if selected
    const filteredByTS2CreatedHeatmap = createdCardsHeatmapFilterTS2 !== null
        ? filteredByTS2CompletedHeatmap.filter(card => {
            // Check if card belongs to TS2
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            const belongsToTS2 = appLabels.some(label => {
                const app = appData.find(a => a.label_trello === label.name);
                return app && app.group_ts === 'TS2';
            });
            
            if (belongsToTS2 && Array.isArray(card.actions)) {
                const createAction = card.actions.find(action => action.type === 'createCard');
                if (createAction && createAction.date) {
                    const hour = dayjs(createAction.date).hour();
                    return hour === createdCardsHeatmapFilterTS2;
                }
            }
            return false;
        })
        : filteredByTS2CompletedHeatmap;

    // Final filtered data
    const filteredByHeatmap = filteredByTS2CreatedHeatmap;

    // Pie chart data: number of cards per TS (from filteredCards)
    const pieData = tsMembers
        .map(ts => {
            const count = filteredByHeatmap.filter(card => Array.isArray(card.idMembers) && card.idMembers.includes(ts.id)).length;
            return { name: ts.fullName, value: count };
        })
        .filter(d => d.value > 0);

    // Bar chart data: number of cards per 4-hour shift (from filteredCards)
    const shiftMap = Object.fromEntries(shiftLabels.map(label => [label.label, 0]));
    filteredByHeatmap.forEach(card => {
        if (Array.isArray(card.actions)) {
            const createAction = card.actions.find(a => a.type === 'createCard');
            if (createAction && createAction.date) {
                const shift = getShift(createAction.date);
                // Map Ca 5.1 and Ca 5.2 to Ca 5 for the chart
                if (shift === 'Ca 5.1' || shift === 'Ca 5.2') {
                    shiftMap['Ca 5']++;
                } else if (shift && shiftMap.hasOwnProperty(shift)) {
                    shiftMap[shift]++;
                }
            }
        }
    });
    const barData = shiftLabels.map(label => ({ shift: label.label, count: shiftMap[label.label] }));

    // Hàm lấy dữ liệu Issues theo App cho TS1
    const getIssuesByAppTS1Data = () => {
        const ts1Apps = appData.filter(app => app.group_ts === 'TS1');
        const appMap = {};
        
        // Khởi tạo tất cả app TS1 với count = 0
        ts1Apps.forEach(app => {
            appMap[app.app_name] = 0;
        });
        
        // Đếm cards cho từng app
        filteredByHeatmap.forEach(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            appLabels.forEach(label => {
                const app = appData.find(a => a.label_trello === label.name);
                if (app && app.group_ts === 'TS1') {
                    appMap[app.app_name] = (appMap[app.app_name] || 0) + 1;
                }
            });
        });
        
        return Object.entries(appMap)
            .map(([app, count]) => ({ app, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Hàm lấy dữ liệu Issues theo App cho TS2
    const getIssuesByAppTS2Data = () => {
        const ts2Apps = appData.filter(app => app.group_ts === 'TS2');
        const appMap = {};
        
        // Khởi tạo tất cả app TS2 với count = 0
        ts2Apps.forEach(app => {
            appMap[app.app_name] = 0;
        });
        
        // Đếm cards cho từng app
        filteredByHeatmap.forEach(card => {
            const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
            appLabels.forEach(label => {
                const app = appData.find(a => a.label_trello === label.name);
                if (app && app.group_ts === 'TS2') {
                    appMap[app.app_name] = (appMap[app.app_name] || 0) + 1;
                }
            });
        });
        
        return Object.entries(appMap)
            .map(([app, count]) => ({ app, count }))
            .sort((a, b) => b.count - a.count);
    };

    const pieColors = [
        '#1976d2', '#42a5f5', '#66bb6a', '#ffa726', '#d32f2f', '#7e57c2', '#26a69a', '#fbc02d', '#8d6e63', '#ec407a',
        '#ab47bc', '#26c6da', '#9ccc65', '#ff7043', '#5c6bc0', '#cfd8dc', '#789262', '#bdbdbd', '#ffb300', '#8e24aa'
    ];

    // Sort cards by create date (oldest first)
    const sortedCards = [...filteredByHeatmap].sort((a, b) => {
        const getCreateDate = card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(act => act.type === 'createCard');
                if (createAction && createAction.date) return dayjs(createAction.date).valueOf();
            }
            return null;
        };
        const aDate = getCreateDate(a);
        const bDate = getCreateDate(b);
        if (aDate === null && bDate === null) return 0;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return aDate - bDate;
    });

    // Add function to calculate resolution time for a card
    const calculateCardResolutionTime = async (card) => {
        if (!card.dueComplete || !Array.isArray(card.actions)) return null;
        
        const timing = calculateResolutionTime(card.actions);
        if (timing) {
            setResolutionTimes(prev => ({
                ...prev,
                [card.id]: timing
            }));
        }
        return timing;
    };

    // Modify useEffect to calculate resolution times for completed cards
    useEffect(() => {
        const fetchCards = async () => {
            setLoading(true);
            setError(null);
            try {
                const since = dayjs(selectedDate).startOf('day').toISOString();
                const before = dayjs(selectedDate).endOf('day').toISOString();
                const data = await getCardsByBoardForPerformanceTS(since, before);
                console.log(data[0]);
                setCards(data || []);

                // Calculate resolution times for completed cards
                const completedCards = data.filter(card => card.dueComplete);
                for (const card of completedCards) {
                    await calculateCardResolutionTime(card);
                }
            } catch (err) {
                setError(err.message || 'Error fetching cards');
            } finally {
                setLoading(false);
            }
        };
        fetchCards();
    }, [selectedDate, selectedTS]);

    // Function to get completed cards heatmap data by team
    const getCompletedCardsHeatmapByTeam = (team) => {
        const heatmap = Array.from({ length: 24 }, () => ({ count: 0, cards: [] }));
        const cardsToProcess = filteredByApp;
        cardsToProcess.forEach(card => {
            if (card.dueComplete) {
                // Check if card belongs to the specified team
                const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
                const belongsToTeam = appLabels.some(label => {
                    const app = appData.find(a => a.label_trello === label.name);
                    return app && app.group_ts === team;
                });
                
                if (belongsToTeam) {
                    let completeDate = null;
                    if (Array.isArray(card.actions)) {
                        const completeAction = [...card.actions].reverse().find(action =>
                            action.type === 'updateCard' &&
                            action.data?.card?.dueComplete === true &&
                            action.date
                        );
                        if (completeAction) {
                            completeDate = completeAction.date;
                        }
                    }
                    if (!completeDate) {
                        completeDate = card.dateCompleted || card.due || null;
                    }
                    if (completeDate) {
                        const hour = dayjs(completeDate).hour();
                        heatmap[hour].count += 1;
                        heatmap[hour].cards.push({
                            id: card.id,
                            name: card.name,
                            completedAt: completeDate,
                            memberNames: Array.isArray(card.idMembers)
                                ? card.idMembers.map(id => {
                                    const m = tsMembers.find(mem => mem.id === id);
                                    return m ? m.fullName : null;
                                }).filter(Boolean)
                                : []
                        });
                    }
                }
            }
        });
        return heatmap;
    };

    // Function to get cell color based on count (Green for Completed Cards)
    const getHeatmapCellColor = (count) => {
        if (count === 0) return '#f1f5f9'; // gray-100
        if (count <= 2) return '#bbf7d0'; // green-200
        if (count <= 5) return '#86efac'; // green-300
        if (count <= 10) return '#4ade80'; // green-400
        if (count <= 15) return '#22c55e'; // green-500
        if (count <= 20) return '#16a34a'; // green-600
        return '#15803d'; // green-700
    };

    // Function to get cell color based on count (Red for Created Cards)
    const getCreatedCardsCellColor = (count) => {
        if (count === 0) return '#f1f5f9'; // gray-100
        if (count <= 2) return '#fecaca'; // red-200
        if (count <= 5) return '#fca5a5'; // red-300
        if (count <= 10) return '#f87171'; // red-400
        if (count <= 15) return '#ef4444'; // red-500
        if (count <= 20) return '#dc2626'; // red-600
        return '#b91c1c'; // red-700
    };



    // Function to get created cards heatmap data by team
    const getCreatedCardsHeatmapByTeam = (team) => {
        const heatmap = Array.from({ length: 24 }, () => ({ count: 0, cards: [] }));
        const cardsToProcess = filteredByApp;
        cardsToProcess.forEach(card => {
            if (Array.isArray(card.actions)) {
                const createAction = card.actions.find(action => action.type === 'createCard');
                if (createAction && createAction.date) {
                    // Check if card belongs to the specified team
                    const appLabels = (card.labels || []).filter(l => l.name.startsWith('App:'));
                    const belongsToTeam = appLabels.some(label => {
                        const app = appData.find(a => a.label_trello === label.name);
                        return app && app.group_ts === team;
                    });
                    
                    if (belongsToTeam) {
                        const hour = dayjs(createAction.date).hour();
                        heatmap[hour].count += 1;
                        heatmap[hour].cards.push({
                            id: card.id,
                            name: card.name,
                            createdAt: createAction.date,
                            memberNames: Array.isArray(card.idMembers)
                                ? card.idMembers.map(id => {
                                    const m = tsMembers.find(mem => mem.id === id);
                                    return m ? m.fullName : null;
                                }).filter(Boolean)
                                : []
                        });
                    }
                }
            }
        });
        return heatmap;
    };

    // Created Cards Heatmap Component for TS1
    const CreatedCardsHeatmapTS1 = () => {
        const heatmapData = getCreatedCardsHeatmapByTeam('TS1');
        const totalCreatedCards = heatmapData.reduce((sum, h) => sum + h.count, 0);
        return (
            <Paper elevation={2} sx={{ 
                p: { xs: 2, md: 5 },
                borderRadius: 3, 
                background: 'white', 
                boxShadow: '0 6px 32px 0 #b6c2d955',
                width: '100%',
                mb: 4,
                overflow: 'hidden'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    borderBottom: '2px solid #e3e8ee',
                    pb: 2
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: '#1976d2'
                    }}>Created Cards Heatmap - TS1 - {dayjs(selectedDate).format('DD/MM/YYYY')} ({totalCreatedCards} total)</Typography>
                    {createdCardsHeatmapFilterTS1 && (
                        <Chip
                            label={`Filter: ${createdCardsHeatmapFilterTS1}h (${heatmapData[createdCardsHeatmapFilterTS1].count} cards)`}
                            onDelete={() => setCreatedCardsHeatmapFilterTS1(null)}
                            color="primary"
                            size="small"
                            sx={{ 
                                fontWeight: 600, 
                                fontSize: 14,
                                '& .MuiChip-deleteIcon': {
                                    color: 'white',
                                    '&:hover': {
                                        color: '#e3e8ee'
                                    }
                                }
                            }}
                        />
                    )}
                </Box>
                {/* Color legend */}
                <Paper elevation={1} sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)', 
                    border: '1px solid #e3e8ee',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <Typography variant="subtitle2" sx={{ 
                        fontWeight: 700, 
                        color: '#1976d2', 
                        mb: 2.5,
                        fontSize: 15,
                        textAlign: 'center',
                        letterSpacing: 0.5
                    }}>
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 1.5, sm: 2.5 }, 
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f1f5f9', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>0</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#fecaca', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>1-2</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#fca5a5', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>3-5</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f87171', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>6-10</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#ef4444', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>11-15</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#dc2626', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>16-20</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#b91c1c', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>{'>'}20</Typography>
                        </Box>
                    </Box>
                </Paper>
                {/* Heatmap grid theo ca trực */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    maxWidth: 1900,
                    margin: '0 auto',
                    minHeight: 300
                }}>
                    {shiftLabels.map((shift, idx) => {
                        // Calculate total cards for this shift
                        const shiftTotal = shift.hours.reduce((sum, hour) => sum + heatmapData[hour].count, 0);
                        
                        return (
                            <Box key={shift.label} sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 60, textAlign: 'right', pr: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: '#1976d2', fontSize: 15 }}>{shift.label}</Typography>
                                </Box>
                                {shift.hours.map(hour => {
                                    const hourData = heatmapData[hour];
                                    return (
                                        <Tooltip 
                                            key={hour}
                                            title={
                                                hourData.count > 0 ? (
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                                                            {hour}h: {hourData.count} created cards
                                                        </Typography>
                                                        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                            {hourData.cards.slice(0, 5).map(card => (
                                                                <Box key={card.id} sx={{ fontSize: 12, mb: 0.5 }}>
                                                                    • {card.name}
                                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', ml: 1 }}>
                                                                        by {card.memberNames.join(', ')}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                            {hourData.cards.length > 5 && (
                                                                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                                                    ... and {hourData.cards.length - 5} more
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ) : `No cards created at ${hour}h`
                                            }
                                            arrow
                                            slotProps={{ 
                                                tooltip: { 
                                                    sx: { 
                                                        fontSize: 14, 
                                                        px: 2, 
                                                        py: 1,
                                                        maxWidth: 300,
                                                        backgroundColor: 'rgba(0,0,0,0.9)',
                                                        color: 'white'
                                                    } 
                                                } 
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    borderRadius: 2,
                                                    background: getCreatedCardsCellColor(hourData.count),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 32,
                                                    fontWeight: 800,
                                                    color: hourData.count > 0 ? '#fff' : '#64748b',
                                                    cursor: hourData.count > 0 ? 'pointer' : 'default',
                                                    border: createdCardsHeatmapFilterTS1 === hour ? '3px solid #6366f1' : '2.5px solid #cbd5e1',
                                                    boxShadow: createdCardsHeatmapFilterTS1 === hour ? '0 0 0 2px #6366f155' : 'none',
                                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                                    flex: 1,
                                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                                    '&:hover': hourData.count > 0 ? {
                                                        border: '3px solid #6366f1',
                                                        boxShadow: '0 2px 8px 0 #6366f133',
                                                        transform: 'scale(1.09)',
                                                        zIndex: 2,
                                                    } : {},
                                                }}
                                                onClick={() => {
                                                    if (hourData.count > 0) {
                                                        setCreatedCardsHeatmapFilterTS1(createdCardsHeatmapFilterTS1 === hour ? null : hour);
                                                    }
                                                }}
                                            >
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                                                        {hour}h
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                                        {hourData.count}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                                {/* Total box for this shift */}
                                <Box sx={{ 
                                    aspectRatio: '1',
                                    borderRadius: 2,
                                    background: getCreatedCardsCellColor(shiftTotal),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    fontWeight: 800,
                                    color: shiftTotal > 0 ? '#fff' : '#64748b',
                                    cursor: 'default',
                                    border: '2.5px solid #cbd5e1',
                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                    flex: 1,
                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                    ml: 2
                                }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
                                            Total
                                        </Typography>
                                        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                            {shiftTotal}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    // Completed Cards Heatmap Component for TS1
    const CompletedCardsHeatmapTS1 = () => {
        const heatmapData = getCompletedCardsHeatmapByTeam('TS1');
        const totalCompletedCards = heatmapData.reduce((sum, h) => sum + h.count, 0);
        return (
            <Paper elevation={2} sx={{ 
                p: { xs: 2, md: 5 },
                borderRadius: 3, 
                background: 'white', 
                boxShadow: '0 6px 32px 0 #b6c2d955',
                width: '100%',
                mb: 4,
                overflow: 'hidden'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    borderBottom: '2px solid #e3e8ee',
                    pb: 2
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: '#1976d2'
                    }}>Completed Cards Heatmap - TS1 - {dayjs(selectedDate).format('DD/MM/YYYY')} ({totalCompletedCards} total)</Typography>
                    {heatmapFilterTS1 && (
                        <Chip
                            label={`Filter: ${heatmapFilterTS1}h (${heatmapData[heatmapFilterTS1].count} cards)`}
                            onDelete={() => setHeatmapFilterTS1(null)}
                            color="primary"
                            size="small"
                            sx={{ 
                                fontWeight: 600, 
                                fontSize: 14,
                                '& .MuiChip-deleteIcon': {
                                    color: 'white',
                                    '&:hover': {
                                        color: '#e3e8ee'
                                    }
                                }
                            }}
                        />
                    )}
                </Box>
                {/* Color legend */}
                <Paper elevation={1} sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)', 
                    border: '1px solid #e3e8ee',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <Typography variant="subtitle2" sx={{ 
                        fontWeight: 700, 
                        color: '#1976d2', 
                        mb: 2.5,
                        fontSize: 15,
                        textAlign: 'center',
                        letterSpacing: 0.5
                    }}>
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 1.5, sm: 2.5 }, 
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f1f5f9', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>0</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#bbf7d0', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>1-2</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#86efac', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>3-5</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#4ade80', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>6-10</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#22c55e', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>11-15</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#16a34a', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>16-20</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#15803d', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>{'>'}20</Typography>
                        </Box>
                    </Box>
                </Paper>
                {/* Heatmap grid theo ca trực */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    maxWidth: 1900,
                    margin: '0 auto',
                    minHeight: 300
                }}>
                    {shiftLabels.map((shift, idx) => {
                        // Calculate total cards for this shift
                        const shiftTotal = shift.hours.reduce((sum, hour) => sum + heatmapData[hour].count, 0);
                        
                        return (
                            <Box key={shift.label} sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 60, textAlign: 'right', pr: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: '#1976d2', fontSize: 15 }}>{shift.label}</Typography>
                                </Box>
                                {shift.hours.map(hour => {
                                    const hourData = heatmapData[hour];
                                    return (
                                        <Tooltip 
                                            key={hour}
                                            title={
                                                hourData.count > 0 ? (
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                                                            {hour}h: {hourData.count} completed cards
                                                        </Typography>
                                                        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                            {hourData.cards.slice(0, 5).map(card => (
                                                                <Box key={card.id} sx={{ fontSize: 12, mb: 0.5 }}>
                                                                    • {card.name}
                                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', ml: 1 }}>
                                                                        by {card.memberNames.join(', ')}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                            {hourData.cards.length > 5 && (
                                                                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                                                    ... and {hourData.cards.length - 5} more
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ) : `No cards completed at ${hour}h`
                                            }
                                            arrow
                                            slotProps={{ 
                                                tooltip: { 
                                                    sx: { 
                                                        fontSize: 14, 
                                                        px: 2, 
                                                        py: 1,
                                                        maxWidth: 300,
                                                        backgroundColor: 'rgba(0,0,0,0.9)',
                                                        color: 'white'
                                                    } 
                                                } 
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    borderRadius: 2,
                                                    background: getHeatmapCellColor(hourData.count),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 32,
                                                    fontWeight: 800,
                                                    color: hourData.count > 0 ? '#fff' : '#64748b',
                                                    cursor: hourData.count > 0 ? 'pointer' : 'default',
                                                    border: heatmapFilterTS1 === hour ? '3px solid #6366f1' : '2.5px solid #cbd5e1',
                                                    boxShadow: heatmapFilterTS1 === hour ? '0 0 0 2px #6366f155' : 'none',
                                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                                    flex: 1,
                                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                                    '&:hover': hourData.count > 0 ? {
                                                        border: '3px solid #6366f1',
                                                        boxShadow: '0 2px 8px 0 #6366f133',
                                                        transform: 'scale(1.09)',
                                                        zIndex: 2,
                                                    } : {},
                                                }}
                                                onClick={() => {
                                                    if (hourData.count > 0) {
                                                        setHeatmapFilterTS1(heatmapFilterTS1 === hour ? null : hour);
                                                    }
                                                }}
                                            >
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                                                        {hour}h
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                                        {hourData.count}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                                {/* Total box for this shift */}
                                <Box sx={{ 
                                    aspectRatio: '1',
                                    borderRadius: 2,
                                    background: getHeatmapCellColor(shiftTotal),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    fontWeight: 800,
                                    color: shiftTotal > 0 ? '#fff' : '#64748b',
                                    cursor: 'default',
                                    border: '2.5px solid #cbd5e1',
                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                    flex: 1,
                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                    ml: 2
                                }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
                                            Total
                                        </Typography>
                                        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                            {shiftTotal}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    // Created Cards Heatmap Component for TS2
    const CreatedCardsHeatmapTS2 = () => {
        const heatmapData = getCreatedCardsHeatmapByTeam('TS2');
        const totalCreatedCards = heatmapData.reduce((sum, h) => sum + h.count, 0);
        return (
            <Paper elevation={2} sx={{ 
                p: { xs: 2, md: 5 },
                borderRadius: 3, 
                background: 'white', 
                boxShadow: '0 6px 32px 0 #b6c2d955',
                width: '100%',
                mb: 4,
                overflow: 'hidden'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    borderBottom: '2px solid #e3e8ee',
                    pb: 2
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: '#ff9800'
                    }}>Created Cards Heatmap - TS2 - {dayjs(selectedDate).format('DD/MM/YYYY')} ({totalCreatedCards} total)</Typography>
                    {createdCardsHeatmapFilterTS2 && (
                        <Chip
                            label={`Filter: ${createdCardsHeatmapFilterTS2}h (${heatmapData[createdCardsHeatmapFilterTS2].count} cards)`}
                            onDelete={() => setCreatedCardsHeatmapFilterTS2(null)}
                            color="warning"
                            size="small"
                            sx={{ 
                                fontWeight: 600, 
                                fontSize: 14,
                                '& .MuiChip-deleteIcon': {
                                    color: 'white',
                                    '&:hover': {
                                        color: '#e3e8ee'
                                    }
                                }
                            }}
                        />
                    )}
                </Box>
                {/* Color legend */}
                <Paper elevation={1} sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)', 
                    border: '1px solid #e3e8ee',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <Typography variant="subtitle2" sx={{ 
                        fontWeight: 700, 
                        color: '#ff9800', 
                        mb: 2.5,
                        fontSize: 15,
                        textAlign: 'center',
                        letterSpacing: 0.5
                    }}>
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 1.5, sm: 2.5 }, 
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f1f5f9', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>0</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#fecaca', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>1-2</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#fca5a5', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>3-5</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f87171', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>6-10</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#ef4444', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>11-15</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#dc2626', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>16-20</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#b91c1c', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>{'>'}20</Typography>
                        </Box>
                    </Box>
                </Paper>
                {/* Heatmap grid theo ca trực */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    maxWidth: 1900,
                    margin: '0 auto',
                    minHeight: 300
                }}>
                    {shiftLabels.map((shift, idx) => {
                        // Calculate total cards for this shift
                        const shiftTotal = shift.hours.reduce((sum, hour) => sum + heatmapData[hour].count, 0);
                        
                        return (
                            <Box key={shift.label} sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 60, textAlign: 'right', pr: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: '#ff9800', fontSize: 15 }}>{shift.label}</Typography>
                                </Box>
                                {shift.hours.map(hour => {
                                    const hourData = heatmapData[hour];
                                    return (
                                        <Tooltip 
                                            key={hour}
                                            title={
                                                hourData.count > 0 ? (
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                                                            {hour}h: {hourData.count} created cards
                                                        </Typography>
                                                        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                            {hourData.cards.slice(0, 5).map(card => (
                                                                <Box key={card.id} sx={{ fontSize: 12, mb: 0.5 }}>
                                                                    • {card.name}
                                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', ml: 1 }}>
                                                                        by {card.memberNames.join(', ')}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                            {hourData.cards.length > 5 && (
                                                                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                                                    ... and {hourData.cards.length - 5} more
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ) : `No cards created at ${hour}h`
                                            }
                                            arrow
                                            slotProps={{ 
                                                tooltip: { 
                                                    sx: { 
                                                        fontSize: 14, 
                                                        px: 2, 
                                                        py: 1,
                                                        maxWidth: 300,
                                                        backgroundColor: 'rgba(0,0,0,0.9)',
                                                        color: 'white'
                                                    } 
                                                } 
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    borderRadius: 2,
                                                    background: getCreatedCardsCellColor(hourData.count),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 32,
                                                    fontWeight: 800,
                                                    color: hourData.count > 0 ? '#fff' : '#64748b',
                                                    cursor: hourData.count > 0 ? 'pointer' : 'default',
                                                    border: createdCardsHeatmapFilterTS2 === hour ? '3px solid #6366f1' : '2.5px solid #cbd5e1',
                                                    boxShadow: createdCardsHeatmapFilterTS2 === hour ? '0 0 0 2px #6366f155' : 'none',
                                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                                    flex: 1,
                                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                                    '&:hover': hourData.count > 0 ? {
                                                        border: '3px solid #6366f1',
                                                        boxShadow: '0 2px 8px 0 #6366f133',
                                                        transform: 'scale(1.09)',
                                                        zIndex: 2,
                                                    } : {},
                                                }}
                                                onClick={() => {
                                                    if (hourData.count > 0) {
                                                        setCreatedCardsHeatmapFilterTS2(createdCardsHeatmapFilterTS2 === hour ? null : hour);
                                                    }
                                                }}
                                            >
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                                                        {hour}h
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                                        {hourData.count}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                                {/* Total box for this shift */}
                                <Box sx={{ 
                                    aspectRatio: '1',
                                    borderRadius: 2,
                                    background: getCreatedCardsCellColor(shiftTotal),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    fontWeight: 800,
                                    color: shiftTotal > 0 ? '#fff' : '#64748b',
                                    cursor: 'default',
                                    border: '2.5px solid #cbd5e1',
                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                    flex: 1,
                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                    ml: 2
                                }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
                                            Total
                                        </Typography>
                                        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                            {shiftTotal}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    // Completed Cards Heatmap Component for TS2
    const CompletedCardsHeatmapTS2 = () => {
        const heatmapData = getCompletedCardsHeatmapByTeam('TS2');
        const totalCompletedCards = heatmapData.reduce((sum, h) => sum + h.count, 0);
        return (
            <Paper elevation={2} sx={{ 
                p: { xs: 2, md: 5 },
                borderRadius: 3, 
                background: 'white', 
                boxShadow: '0 6px 32px 0 #b6c2d955',
                width: '100%',
                mb: 4,
                overflow: 'hidden'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    borderBottom: '2px solid #e3e8ee',
                    pb: 2
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: '#ff9800'
                    }}>Completed Cards Heatmap - TS2 - {dayjs(selectedDate).format('DD/MM/YYYY')} ({totalCompletedCards} total)</Typography>
                    {heatmapFilterTS2 && (
                        <Chip
                            label={`Filter: ${heatmapFilterTS2}h (${heatmapData[heatmapFilterTS2].count} cards)`}
                            onDelete={() => setHeatmapFilterTS2(null)}
                            color="warning"
                            size="small"
                            sx={{ 
                                fontWeight: 600, 
                                fontSize: 14,
                                '& .MuiChip-deleteIcon': {
                                    color: 'white',
                                    '&:hover': {
                                        color: '#e3e8ee'
                                    }
                                }
                            }}
                        />
                    )}
                </Box>
                {/* Color legend */}
                <Paper elevation={1} sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)', 
                    border: '1px solid #e3e8ee',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <Typography variant="subtitle2" sx={{ 
                        fontWeight: 700, 
                        color: '#ff9800', 
                        mb: 2.5,
                        fontSize: 15,
                        textAlign: 'center',
                        letterSpacing: 0.5
                    }}>
                    </Typography>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 1.5, sm: 2.5 }, 
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#f1f5f9', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>0</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#bbf7d0', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>1-2</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#86efac', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>3-5</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#4ade80', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>6-10</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#22c55e', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>11-15</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#16a34a', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>16-20</Typography>
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            px: 2, 
                            py: 1, 
                            borderRadius: 2.5, 
                            background: 'rgba(255,255,255,0.9)', 
                            border: '1px solid #e3e8ee',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }
                        }}>
                            <Box sx={{ 
                                width: 26, 
                                height: 20, 
                                borderRadius: 1.5, 
                                background: '#15803d', 
                                border: '2px solid #cbd5e1', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                            }} />
                            <Typography sx={{ 
                                fontSize: { xs: 13, sm: 14 }, 
                                color: '#334155', 
                                fontWeight: 600 
                            }}>{'>'}20</Typography>
                        </Box>
                    </Box>
                </Paper>
                {/* Heatmap grid theo ca trực */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    maxWidth: 1900,
                    margin: '0 auto',
                    minHeight: 300
                }}>
                    {shiftLabels.map((shift, idx) => {
                        // Calculate total cards for this shift
                        const shiftTotal = shift.hours.reduce((sum, hour) => sum + heatmapData[hour].count, 0);
                        
                        return (
                            <Box key={shift.label} sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 60, textAlign: 'right', pr: 1 }}>
                                    <Typography sx={{ fontWeight: 700, color: '#ff9800', fontSize: 15 }}>{shift.label}</Typography>
                                </Box>
                                {shift.hours.map(hour => {
                                    const hourData = heatmapData[hour];
                                    return (
                                        <Tooltip 
                                            key={hour}
                                            title={
                                                hourData.count > 0 ? (
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                                                            {hour}h: {hourData.count} completed cards
                                                        </Typography>
                                                        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                                            {hourData.cards.slice(0, 5).map(card => (
                                                                <Box key={card.id} sx={{ fontSize: 12, mb: 0.5 }}>
                                                                    • {card.name}
                                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8', ml: 1 }}>
                                                                        by {card.memberNames.join(', ')}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                            {hourData.cards.length > 5 && (
                                                                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                                                                    ... and {hourData.cards.length - 5} more
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ) : `No cards completed at ${hour}h`
                                            }
                                            arrow
                                            slotProps={{ 
                                                tooltip: { 
                                                    sx: { 
                                                        fontSize: 14, 
                                                        px: 2, 
                                                        py: 1,
                                                        maxWidth: 300,
                                                        backgroundColor: 'rgba(0,0,0,0.9)',
                                                        color: 'white'
                                                    } 
                                                } 
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    aspectRatio: '1',
                                                    borderRadius: 2,
                                                    background: getHeatmapCellColor(hourData.count),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 32,
                                                    fontWeight: 800,
                                                    color: hourData.count > 0 ? '#fff' : '#64748b',
                                                    cursor: hourData.count > 0 ? 'pointer' : 'default',
                                                    border: heatmapFilterTS2 === hour ? '3px solid #6366f1' : '2.5px solid #cbd5e1',
                                                    boxShadow: heatmapFilterTS2 === hour ? '0 0 0 2px #6366f155' : 'none',
                                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                                    flex: 1,
                                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                                    '&:hover': hourData.count > 0 ? {
                                                        border: '3px solid #6366f1',
                                                        boxShadow: '0 2px 8px 0 #6366f133',
                                                        transform: 'scale(1.09)',
                                                        zIndex: 2,
                                                    } : {},
                                                }}
                                                onClick={() => {
                                                    if (hourData.count > 0) {
                                                        setHeatmapFilterTS2(heatmapFilterTS2 === hour ? null : hour);
                                                    }
                                                }}
                                            >
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                                                        {hour}h
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                                        {hourData.count}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                                {/* Total box for this shift */}
                                <Box sx={{ 
                                    aspectRatio: '1',
                                    borderRadius: 2,
                                    background: getHeatmapCellColor(shiftTotal),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    fontWeight: 800,
                                    color: shiftTotal > 0 ? '#fff' : '#64748b',
                                    cursor: 'default',
                                    border: '2.5px solid #cbd5e1',
                                    transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                                    minWidth: { xs: 50, sm: 60, md: 70 },
                                    minHeight: { xs: 40, sm: 45, md: 50 },
                                    flex: 1,
                                    maxWidth: { xs: 60, sm: 70, md: 80 },
                                    ml: 2
                                }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
                                            Total
                                        </Typography>
                                        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                                            {shiftTotal}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    return (
        <>
            <Fade in={true} timeout={600}>
                <Box sx={{ 
                    p: { xs: 2, sm: 3, md: 4 }, 
                    width: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxWidth: '100vw',
                    overflow: 'hidden'
                }}>
                    {/* Filters Section */}
                    <Paper elevation={0} sx={{ 
                        p: { xs: 2, md: 4 }, 
                        borderRadius: 3, 
                        background: 'rgba(255,255,255,0.85)', 
                        border: '1.5px solid #e3e8ee', 
                        boxShadow: '0 2px 8px 0 #e0e7ef'
                    }}>
                        <Typography variant="h6" sx={{ 
                            fontWeight: 700, 
                            mb: 3, 
                            color: '#1976d2', 
                            letterSpacing: 1,
                            borderBottom: '2px solid #e3e8ee',
                            pb: 2
                        }}>Filters</Typography>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField
                                    label="Date"
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    fullWidth
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        background: 'white',
                                        borderRadius: 2,
                                        '& .MuiOutlinedInput-root': {
                                            fontSize: 16,
                                            fontWeight: 500,
                                            background: 'white',
                                            borderRadius: 2,
                                            '& fieldset': { borderColor: '#e3e8ee' },
                                            '&:hover fieldset': { borderColor: '#1976d2' },
                                            '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#1976d2',
                                            fontWeight: 600,
                                            fontSize: 15,
                                            '&.Mui-focused': { color: '#1565c0' }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small" sx={{
                                    background: 'white',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: 16,
                                        fontWeight: 500,
                                        background: 'white',
                                        borderRadius: 2,
                                        '& fieldset': { borderColor: '#e3e8ee' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                        '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#1976d2',
                                        fontWeight: 600,
                                        fontSize: 15,
                                        '&.Mui-focused': { color: '#1565c0' }
                                    }
                                }}>
                                    <InputLabel>Shift</InputLabel>
                                    <Select
                                        value={selectedShift}
                                        onChange={e => setSelectedShift(e.target.value)}
                                        label="Shift"
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 24px 0 #b6c2d933',
                                                    mt: 1
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>All</em>
                                        </MenuItem>
                                        {shiftLabels.map(shift => (
                                            <MenuItem key={shift.label} value={shift.label} sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                py: 1.2,
                                                px: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 500,
                                                backgroundColor: selectedShift === shift.label ? '#e3f2fd' : 'inherit',
                                                '&:hover': {
                                                    backgroundColor: '#e3e8ee'
                                                }
                                            }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1976d2', lineHeight: 1 }}>{shift.label}</Typography>
                                                    <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                                                        {shift.hours[0]}h-{shift.hours[shift.hours.length-1]}h
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small" sx={{
                                    background: 'white',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: 16,
                                        fontWeight: 500,
                                        background: 'white',
                                        borderRadius: 2,
                                        '& fieldset': { borderColor: '#e3e8ee' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                        '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#1976d2',
                                        fontWeight: 600,
                                        fontSize: 15,
                                        '&.Mui-focused': { color: '#1565c0' }
                                    }
                                }}>
                                    <InputLabel>App</InputLabel>
                                    <Select
                                        value={selectedApp}
                                        onChange={e => setSelectedApp(e.target.value)}
                                        label="App"
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 24px 0 #b6c2d933',
                                                    mt: 1
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>All</em>
                                        </MenuItem>
                                        {appData.map(app => (
                                            <MenuItem key={app.label_trello} value={app.label_trello} sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                py: 1.2,
                                                px: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 500,
                                                backgroundColor: selectedApp === app.label_trello ? '#e3f2fd' : 'inherit',
                                                '&:hover': {
                                                    backgroundColor: '#e3e8ee'
                                                }
                                            }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1976d2', lineHeight: 1 }}>{app.app_name}</Typography>
                                                    <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{app.group_ts}</Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth size="small" sx={{
                                    background: 'white',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: 16,
                                        fontWeight: 500,
                                        background: 'white',
                                        borderRadius: 2,
                                        '& fieldset': { borderColor: '#e3e8ee' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                        '&.Mui-focused fieldset': { borderColor: '#1976d2', borderWidth: 2 }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: '#1976d2',
                                        fontWeight: 600,
                                        fontSize: 15,
                                        '&.Mui-focused': { color: '#1565c0' }
                                    }
                                }}>
                                    <InputLabel>TS</InputLabel>
                                    <Select
                                        value={selectedTS}
                                        onChange={e => setSelectedTS(e.target.value)}
                                        label="TS"
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 24px 0 #b6c2d933',
                                                    mt: 1
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>All</em>
                                        </MenuItem>
                                        {tsMembers.map(member => (
                                            <MenuItem key={member.id} value={member.id} sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                py: 1.2,
                                                px: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 500,
                                                backgroundColor: selectedTS === member.id ? '#e3f2fd' : 'inherit',
                                                '&:hover': {
                                                    backgroundColor: '#e3e8ee'
                                                }
                                            }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1976d2', lineHeight: 1 }}>{member.fullName}</Typography>
                                                    <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{member.role}</Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        {/* Active filter chips */}
                        {(selectedTS || selectedShift || selectedList || selectedApp || heatmapFilter !== null || createdCardsHeatmapFilter !== null || heatmapFilterTS1 !== null || createdCardsHeatmapFilterTS1 !== null || heatmapFilterTS2 !== null || createdCardsHeatmapFilterTS2 !== null) && (
                            <Box sx={{
                                mt: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap'
                            }}>
                                {selectedTS && (
                                    <Chip
                                        label={`TS: ${tsMembers.find(m => m.id === selectedTS)?.fullName || selectedTS}`}
                                        onDelete={() => setSelectedTS('')}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {selectedShift && (
                                    <Chip
                                        label={`Ca: ${selectedShift}`}
                                        onDelete={() => setSelectedShift('')}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {selectedList && (
                                    <Chip
                                        label={`Status: ${getListName(selectedList)}`}
                                        onDelete={() => setSelectedList('')}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {selectedApp && (
                                    <Chip
                                        label={`App: ${appData.find(a => a.label_trello === selectedApp)?.app_name || selectedApp}`}
                                        onDelete={() => setSelectedApp('')}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {heatmapFilter !== null && (
                                    <Chip
                                        label={`Completed at ${heatmapFilter}h`}
                                        onDelete={() => setHeatmapFilter(null)}
                                        color="secondary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {createdCardsHeatmapFilter !== null && (
                                    <Chip
                                        label={`Created at ${createdCardsHeatmapFilter}h`}
                                        onDelete={() => setCreatedCardsHeatmapFilter(null)}
                                        color="error"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {heatmapFilterTS1 !== null && (
                                    <Chip
                                        label={`TS1 Completed at ${heatmapFilterTS1}h`}
                                        onDelete={() => setHeatmapFilterTS1(null)}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {createdCardsHeatmapFilterTS1 !== null && (
                                    <Chip
                                        label={`TS1 Created at ${createdCardsHeatmapFilterTS1}h`}
                                        onDelete={() => setCreatedCardsHeatmapFilterTS1(null)}
                                        color="primary"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {heatmapFilterTS2 !== null && (
                                    <Chip
                                        label={`TS2 Completed at ${heatmapFilterTS2}h`}
                                        onDelete={() => setHeatmapFilterTS2(null)}
                                        color="warning"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                                {createdCardsHeatmapFilterTS2 !== null && (
                                    <Chip
                                        label={`TS2 Created at ${createdCardsHeatmapFilterTS2}h`}
                                        onDelete={() => setCreatedCardsHeatmapFilterTS2(null)}
                                        color="warning"
                                        size="small"
                                        sx={{ 
                                            fontWeight: 600, 
                                            fontSize: 14,
                                            '& .MuiChip-deleteIcon': {
                                                color: 'white',
                                                '&:hover': {
                                                    color: '#e3e8ee'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                        )}
                    </Paper>

                    {loading ? (
                        <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <svg width="80" height="80" viewBox="0 0 40 40" stroke="#1976d2">
                                    <g fill="none" fillRule="evenodd">
                                        <g transform="translate(2 2)" strokeWidth="3">
                                            <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                            <path d="M36 18c0-9.94-8.06-18-18-18">
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="rotate"
                                                    from="0 18 18"
                                                    to="360 18 18"
                                                    dur="1s"
                                                    repeatCount="indefinite" />
                                            </path>
                                        </g>
                                    </g>
                                </svg>
                                <Typography sx={{ mt: 2, color: '#1976d2', fontWeight: 700, fontSize: 20 }}>Loading data...</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            {/* Status Boxes */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: 3, 
                                maxWidth: 1200,
                                margin: '0 auto',
                                width: '100%'
                            }}>
                                {/* Total Cards Box */}
                                <Fade in={true} timeout={600}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'center',
                                        mb: 1
                                    }}>
                                        <Paper elevation={0} sx={{ 
                                            p: 3, 
                                            borderRadius: 2, 
                                            background: 'white', 
                                            boxShadow: '0 1px 4px 0 #e0e7ef',
                                            border: '1px solid #1976d2',
                                            minWidth: 200,
                                            textAlign: 'center',
                                            width: 'fit-content',
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': {
                                                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.1)',
                                                transform: 'translateY(-2px)'
                                            }
                                        }}>
                                            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 700, mb: 1 }}>Total Cards</Typography>
                                            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 800 }}>{filteredByHeatmap.length}</Typography>
                                        </Paper>
                                    </Box>
                                </Fade>
                                {/* First Row */}
                                <Box sx={{ 
                                    display: 'flex', 
                                    gap: 3,
                                    justifyContent: 'center',
                                    '& > *': { flex: 1 }
                                }}>
                                    {[0,1,2].map(i => (
                                        <Fade in={true} timeout={600} style={{ transitionDelay: `${i*100}ms` }} key={i}>
                                            <div>
                                                {i === 0 && <StatusBox title="Dev Pending" count={getCardCountByList(STATUS_LISTS.DEV_PENDING)} color="#f44336" listId={STATUS_LISTS.DEV_PENDING} />}
                                                {i === 1 && <StatusBox title="TS Pending" count={getCardCountByList(STATUS_LISTS.TS_PENDING)} color="#ff9800" listId={STATUS_LISTS.TS_PENDING} />}
                                                {i === 2 && <StatusBox title="Waiting Permission" count={getCardCountByList(STATUS_LISTS.WAITING_PERMISSION)} color="#9c27b0" listId={STATUS_LISTS.WAITING_PERMISSION} />}
                                            </div>
                                        </Fade>
                                    ))}
                                </Box>
                                {/* Second Row */}
                                <Box sx={{ 
                                    display: 'flex', 
                                    gap: 3,
                                    justifyContent: 'center',
                                    '& > *': { flex: 1 }
                                }}>
                                    {[0,1,2].map(i => (
                                        <Fade in={true} timeout={600} style={{ transitionDelay: `${(i+3)*100}ms` }} key={i}>
                                            <div>
                                                {i === 0 && <StatusBox title="Waiting Confirmation" count={getCardCountByList(STATUS_LISTS.WAITING_CONFIRMATION)} color="#2196f3" listId={STATUS_LISTS.WAITING_CONFIRMATION} />}
                                                {i === 1 && <StatusBox title="TS Done" count={getCardCountByList(STATUS_LISTS.TS_DONE)} color="#4caf50" listId={STATUS_LISTS.TS_DONE} />}
                                                {i === 2 && <StatusBox title="Dev Done" count={getCardCountByList(STATUS_LISTS.DEV_DONE)} color="#009688" listId={STATUS_LISTS.DEV_DONE} />}
                                            </div>
                                        </Fade>
                                    ))}
                                </Box>
                            </Box>

                            {/* Charts Section */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', lg: 'row' }, 
                                gap: 4, 
                                maxWidth: 1400,
                                margin: '0 auto',
                                width: '100%'
                            }}>
                                {/* Pie Chart */}
                                <Fade in={true} timeout={700}>
                                    <Paper elevation={0} sx={{ 
                                        p: 3, 
                                        borderRadius: 2, 
                                        background: 'white', 
                                        boxShadow: '0 1px 4px 0 #e0e7ef', 
                                        flex: 1,
                                        minWidth: 0
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            mb: 3, 
                                            color: '#1976d2',
                                            borderBottom: '2px solid #e3e8ee',
                                            pb: 2
                                        }}>Cards per TS</Typography>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={110}
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                >
                                                    {pieData.map((entry, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Fade>

                                {/* Bar Chart */}
                                <Fade in={true} timeout={800}>
                                    <Paper elevation={0} sx={{ 
                                        p: 3, 
                                        borderRadius: 2, 
                                        background: 'white', 
                                        boxShadow: '0 1px 4px 0 #e0e7ef', 
                                        flex: 1,
                                        minWidth: 0
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            mb: 3, 
                                            color: '#1976d2',
                                            borderBottom: '2px solid #e3e8ee',
                                            pb: 2
                                        }}>Cards per Shift</Typography>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <BarChart 
                                                data={barData} 
                                                margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                                onClick={state => {
                                                    if (state && state.activeLabel) {
                                                        setSelectedShift(state.activeLabel === selectedShift ? '' : state.activeLabel);
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="shift" />
                                                <YAxis allowDecimals={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#1976d2" name="Cards" radius={[4, 4, 0, 0]} cursor="pointer">
                                                    {barData.map((entry, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={entry.shift === selectedShift ? '#1565c0' : '#1976d2'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Fade>
                            </Box>

                            {/* Issues by App Charts */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', lg: 'row' }, 
                                gap: 4, 
                                maxWidth: 1400,
                                margin: '0 auto',
                                width: '100%',
                                mb: 4
                            }}>
                                {/* TS1 Apps Chart */}
                                <Fade in={true} timeout={900}>
                                    <Paper elevation={0} sx={{ 
                                        p: 3, 
                                        borderRadius: 2, 
                                        background: 'white', 
                                        boxShadow: '0 1px 4px 0 #e0e7ef', 
                                        flex: 1,
                                        minWidth: 0
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            mb: 3, 
                                            color: '#1976d2',
                                            borderBottom: '2px solid #e3e8ee',
                                            pb: 2
                                        }}>
                                            Issues by App - TS1 ({getIssuesByAppTS1Data().reduce((sum, item) => sum + item.count, 0)} total)
                                        </Typography>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <BarChart 
                                                data={getIssuesByAppTS1Data()} 
                                                margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                                layout="horizontal"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="app" 
                                                    interval={0} 
                                                    angle={-20} 
                                                    textAnchor="end" 
                                                    height={80}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis allowDecimals={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#1976d2" name="Issues" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Fade>

                                {/* TS2 Apps Chart */}
                                <Fade in={true} timeout={1000}>
                                    <Paper elevation={0} sx={{ 
                                        p: 3, 
                                        borderRadius: 2, 
                                        background: 'white', 
                                        boxShadow: '0 1px 4px 0 #e0e7ef', 
                                        flex: 1,
                                        minWidth: 0
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            mb: 3, 
                                            color: '#1976d2',
                                            borderBottom: '2px solid #e3e8ee',
                                            pb: 2
                                        }}>
                                            Issues by App - TS2 ({getIssuesByAppTS2Data().reduce((sum, item) => sum + item.count, 0)} total)
                                        </Typography>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <BarChart 
                                                data={getIssuesByAppTS2Data()} 
                                                margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                                layout="horizontal"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="app" 
                                                    interval={0} 
                                                    angle={-20} 
                                                    textAnchor="end" 
                                                    height={80}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis allowDecimals={false} />
                                                <RechartsTooltip />
                                                <Bar dataKey="count" fill="#ff9800" name="Issues" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Fade>
                            </Box>

                            {/* Self Removal Chart */}
                            <Fade in={true} timeout={1100}>
                                <Paper elevation={0} sx={{ 
                                    p: 3, 
                                    borderRadius: 2, 
                                    background: 'white', 
                                    boxShadow: '0 1px 4px 0 #e0e7ef', 
                                    maxWidth: 1400, 
                                    margin: '0 auto',
                                    width: '100%'
                                }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        mb: 3,
                                        borderBottom: '2px solid #e3e8ee',
                                        pb: 2
                                    }}>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 700, 
                                            color: '#1976d2'
                                        }}>Self Removal Count</Typography>
                                        {selectedRemovalTS && (
                                            <Chip
                                                label={`Selected: ${selectedRemovalTS}`}
                                                onDelete={() => setSelectedRemovalTS('')}
                                                color="primary"
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 600, 
                                                    fontSize: 14,
                                                    '& .MuiChip-deleteIcon': {
                                                        color: 'white',
                                                        '&:hover': {
                                                            color: '#e3e8ee'
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart
                                            data={getSelfRemovalData(filteredByShift)}
                                            margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                                            layout="vertical"
                                            onClick={state => {
                                                if (state && state.activeLabel) {
                                                    setSelectedRemovalTS(state.activeLabel === selectedRemovalTS ? '' : state.activeLabel);
                                                }
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis 
                                                type="category" 
                                                dataKey="name" 
                                                width={150}
                                                tick={{ fontSize: 14 }}
                                            />
                                            <RechartsTooltip />
                                            <Bar 
                                                dataKey="value" 
                                                fill="#ff9800" 
                                                name="Self Removals"
                                                radius={[0, 4, 4, 0]}
                                                cursor="pointer"
                                            >
                                                {getSelfRemovalData(filteredByShift).map((entry, idx) => (
                                                    <Cell 
                                                        key={`cell-${idx}`} 
                                                        fill={entry.name === selectedRemovalTS ? '#1565c0' : 
                                                            entry.value > 5 ? '#f44336' : 
                                                            entry.value > 2 ? '#ff9800' : '#4caf50'} 
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Fade>

                            {/* Heatmaps Section - TS1 */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', xl: 'row' }, 
                                gap: 4, 
                                width: '100%',
                                overflow: 'hidden',
                                mb: 4
                            }}>
                                {/* Created Cards Heatmap - TS1 */}
                                <Fade in={true} timeout={1200}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <CreatedCardsHeatmapTS1 />
                                    </Box>
                                </Fade>

                                {/* Completed Cards Heatmap - TS1 */}
                                <Fade in={true} timeout={1300}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <CompletedCardsHeatmapTS1 />
                                    </Box>
                                </Fade>
                            </Box>

                            {/* Heatmaps Section - TS2 */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', xl: 'row' }, 
                                gap: 4, 
                                width: '100%',
                                overflow: 'hidden'
                            }}>
                                {/* Created Cards Heatmap - TS2 */}
                                <Fade in={true} timeout={1400}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <CreatedCardsHeatmapTS2 />
                                    </Box>
                                </Fade>

                                {/* Completed Cards Heatmap - TS2 */}
                                <Fade in={true} timeout={1500}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <CompletedCardsHeatmapTS2 />
                                    </Box>
                                </Fade>
                            </Box>

                            {/* Card Grid Section - Hiển thị dưới bảng */}
                            <Box sx={{ mt: 5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>
                                    Card Grid View (Preview)
                                </Typography>
                                <Grid container spacing={3}>
                                    {sortedCards.map(card => {
                                        let createDate = '';
                                        let moveToDoingDate = '';
                                        let dueCompleteDate = '';
                                        let completedBy = '';
                                        let resolutionTime = null;
                                        let memberNames = [];
                                        if (Array.isArray(card.actions)) {
                                            const createAction = card.actions.find(a => a.type === 'createCard');
                                            if (createAction && createAction.date) {
                                                createDate = dayjs(createAction.date).format('HH:mm DD/MM');
                                            }
                                            const moveToDoingAction = card.actions.find(a =>
                                                a.type === 'updateCard' &&
                                                a.data?.listAfter?.name === 'Doing (Inshift)'
                                            );
                                            if (moveToDoingAction && moveToDoingAction.date) {
                                                moveToDoingDate = dayjs(moveToDoingAction.date).format('HH:mm DD/MM');
                                            }
                                            const dueCompleteAction = [...card.actions].reverse().find(a =>
                                                a.type === 'updateCard' && 
                                                a.data?.old?.dueComplete === false &&
                                                a.data?.card?.dueComplete === true && 
                                                a.date
                                            );
                                            
                                            // Fallback: if no old.dueComplete found, look for any updateCard with dueComplete: true
                                            const fallbackAction = !dueCompleteAction ? [...card.actions].reverse().find(a =>
                                                a.type === 'updateCard' && a.data?.card?.dueComplete === true && a.date
                                            ) : null;
                                            
                                            const finalAction = dueCompleteAction || fallbackAction;
                                            
                                            if (finalAction && finalAction.date) {
                                                dueCompleteDate = dayjs(finalAction.date).format('HH:mm DD/MM');
                                                completedBy = finalAction.memberCreator?.fullName || 'Unknown';
                                            }
                                        }
                                        if (card.dueComplete) {
                                            resolutionTime = resolutionTimes[card.id];
                                        }
                                        if (Array.isArray(card.idMembers)) {
                                            memberNames = card.idMembers.map(id => {
                                                const m = tsMembers.find(mem => mem.id === id);
                                                return m ? m.fullName : null;
                                            }).filter(Boolean);
                                        }
                                        // Chọn màu border theo trạng thái
                                        let borderColor = '#e3e8ee';
                                        if (card.dueComplete) borderColor = '#4caf50';
                                        else if (getListName(card.idList).toLowerCase().includes('pending')) borderColor = '#ff9800';
                                        else if (getListName(card.idList).toLowerCase().includes('done')) borderColor = '#1976d2';
                                        // Badge màu cho resolution
                                        let resBg = resolutionTime ? (resolutionTime.resolutionTime > 120 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)') : '#f3f4f6';
                                        let resColor = resolutionTime ? (resolutionTime.resolutionTime > 120 ? '#ef4444' : '#22c55e') : '#64748b';
                                        return (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
                                                <Paper
                                                    sx={{
                                                        p: 2.5,
                                                        borderRadius: 4,
                                                        boxShadow: '0 2px 12px 0 #e0e7ef',
                                                        border: `2.5px solid ${borderColor}`,
                                                        transition: 'all 0.18s',
                                                        height: '100%',
                                                        '&:hover': {
                                                            boxShadow: '0 8px 32px 0 #b6c2d9',
                                                            transform: 'translateY(-4px) scale(1.03)',
                                                            borderColor: '#1976d2',
                                                            cursor: 'pointer'
                                                        },
                                                        display: 'flex', flexDirection: 'column', gap: 1.2
                                                    }}
                                                    onClick={() => { setSelectedCardDetail(card); setIsCardDetailModalOpen(true); }}
                                                >
                                                    <Typography variant="h6" noWrap title={card.name} sx={{ fontWeight: 800, color: '#1976d2', mb: 0.5, fontSize: 19, letterSpacing: 0.2 }}>
                                                        {card.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Box component="span" sx={{ fontSize: 13, color: '#64748b', fontWeight: 600, mr: 0.5 }}>TS:</Box>
                                                        {memberNames.length > 0 ? memberNames.map((name, idx) => (
                                                            <Box key={name} component="span" sx={{
                                                                display: 'inline-flex', alignItems: 'center', px: 1, py: 0.2, borderRadius: 2, fontSize: 13, fontWeight: 600,
                                                                background: '#e3e8ee', color: '#1976d2', mr: 0.5
                                                            }}>
                                                                <span style={{ fontSize: 15, marginRight: 3 }}>👤</span>{name}
                                                            </Box>
                                                        )) : <span style={{ color: '#bdbdbd', fontWeight: 500 }}>-</span>}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                                                        <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Status:</Box>
                                                        <Box sx={{ fontSize: 13, color: '#1976d2', fontWeight: 700 }}>{getListName(card.idList)}</Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Create:</Box>
                                                        <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{createDate || '-'}</Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Moved to Doing:</Box>
                                                        <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{moveToDoingDate || '-'}</Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                        <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Due Complete:</Box>
                                                        <Box sx={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{dueCompleteDate || '-'}</Box>
                                                    </Box>
                                                    {completedBy && (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                            <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Completed by:</Box>
                                                            <Box sx={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{completedBy}</Box>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                        <Box sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Resolution:</Box>
                                                        <Box sx={{
                                                            px: 1.5, py: 0.5, borderRadius: '16px', fontSize: 13, fontWeight: 700,
                                                            background: resBg, color: resColor, minWidth: 60, textAlign: 'center',
                                                            letterSpacing: 0.2
                                                        }}>
                                                            {resolutionTime ? `${Math.floor(resolutionTime.resolutionTime / 60)}h ${resolutionTime.resolutionTime % 60}m` : '-'}
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                    {sortedCards.length === 0 && (
                                        <Grid item xs={12}>
                                            <Paper sx={{ p: 4, textAlign: 'center', color: '#64748b', fontSize: 16, fontWeight: 500 }}>
                                                No cards found
                                            </Paper>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        </>
                    )}
                </Box>
            </Fade>
            <CardDetailModal
                open={isCardDetailModalOpen}
                onClose={() => setIsCardDetailModalOpen(false)}
                cardId={selectedCardDetail?.id}
            />
        </>
    );
};

export default CardsDetail;