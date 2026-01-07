import React, { useState, useEffect } from 'react';
import { getKpiTsTeam } from '../api/workShiftApi';
import { getCardsByList } from '../api/trelloApi';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import members from '../data/members.json';
import rateKpi from '../data/rateKpi.json';
import listsId from '../data/listsId.json';
import ModalKPIDetail from './Data/ModalKPIDetail';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Button
} from '@mui/material';

const { shiftRate, issueRate } = rateKpi;

const AllKpiTsTeam = () => {
    const [kpiTsTeam, setKpiTsTeam] = useState([]);
    const [issueCards, setIssueCards] = useState({ fixDoneCards: [], doneCards: [] });
    const [selectedDate, setSelectedDate] = useState(dayjs('2025-12-01')); // Default to match original hardcoded context, or use dayjs() for current month
    const [loading, setLoading] = useState(true);
    const [tsMembersKpi, setTsMembersKpi] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedKpiData, setSelectedKpiData] = useState(null);

    const handleOpenModal = (kpiData) => {
        setSelectedKpiData(kpiData);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedKpiData(null);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Calculate dates based on selectedDate
                // start: Last day of previous month
                const startDate = selectedDate.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
                // end: Last day of selected month
                const endDate = selectedDate.endOf('month').format('YYYY-MM-DD');

                // Fetch shift data
                const kpiData = await getKpiTsTeam(startDate, endDate);
                const cleanedData = kpiData.filter(item => item && Object.keys(item).length > 0);
                setKpiTsTeam(cleanedData);

                // Get list IDs for "Fix done from dev" and "Done"


                const month = selectedDate.month() + 1; // 0-indexed
                const year = selectedDate.year();
                const doneListName = `Done-T${month}-${year}`;

                // Check if selected month is current month
                const isCurrentMonth = selectedDate.isSame(dayjs(), 'month');
                const devDoneListName = isCurrentMonth ? 'Fix done from dev' : `FixDoneFromDev-T${month}-${year}`;

                const fixDoneList = listsId.find(list => list.name === devDoneListName);

                const doneLists = listsId.filter(list => list.name === doneListName);

                // Fetch cards from both lists separately
                const fixDoneCards = [];
                const doneCards = [];

                if (fixDoneList) {
                    const cards = await getCardsByList(fixDoneList.id);
                    if (cards) fixDoneCards.push(...cards);
                }

                // Fetch cards from both Done lists
                for (const doneList of doneLists) {
                    const cards = await getCardsByList(doneList.id);
                    if (cards) doneCards.push(...cards);
                }

                setIssueCards({ fixDoneCards, doneCards });
            } catch (error) {
                console.error('Error fetching data:', error);
                setKpiTsTeam([]);
                setIssueCards({ fixDoneCards: [], doneCards: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate]);

    // Calculate KPI for TS members
    useEffect(() => {
        if (kpiTsTeam.length === 0 && (!issueCards?.fixDoneCards || !issueCards?.doneCards)) return;

        // Filter TS members from members.json
        const tsMembers = members.filter(member => member.role === 'TS' || member.role === 'ts-lead');

        const calculatedKpi = tsMembers.map(member => {
            // Calculate shift KPI
            const memberShifts = kpiTsTeam.filter(shift => {
                const shiftEmail = shift.Email || shift.email;
                const isMatch = shiftEmail && member.email &&
                    shiftEmail.toLowerCase() === member.email.toLowerCase();
                return isMatch;
            });

            let shiftKpi = 0;
            let totalShifts = 0;
            const shiftDetails = [];

            memberShifts.forEach(shift => {
                const shiftName = shift.Shift || shift.shift || shift.shift_name || shift.shiftName || shift.Shift_Name;
                const rate = shiftRate[shiftName];

                if (rate) {
                    shiftKpi += rate;
                    totalShifts += 1;
                    shiftDetails.push({
                        date: shift.Date || shift.date || shift.Date_Time || shift.dateTime,
                        shiftName: shiftName,
                        rate: rate,
                        totalRate: rate
                    });
                }
            });

            // Calculate bug KPI from "Fix done from dev" list
            const memberBugCards = (issueCards?.fixDoneCards || []).filter(card => {
                return card.idMembers && card.idMembers.includes(member.id);
            });

            let bugKpi = 0;
            let totalBugs = 0;
            const bugCardDetails = [];

            memberBugCards.forEach(card => {
                if (card.idMembers) {
                    // Get all members in this card (both TS and CS)
                    const allMembersInCard = card.idMembers.filter(memberId => {
                        const cardMember = members.find(m => m.id === memberId);
                        return cardMember; // Include all members (TS and CS)
                    });

                    // Only calculate KPI if current member is in this card
                    if (allMembersInCard.includes(member.id)) {
                        const totalMemberCount = allMembersInCard.length;

                        // Check if card has "Bug: level 3" tag
                        const hasBugLevel3Tag = card.labels && card.labels.some(label =>
                            label.name === 'Bug: level 3'
                        );

                        if (hasBugLevel3Tag) {
                            // Bug: level 3 tag gets 30 points, split based on member count
                            if (totalMemberCount === 1) {
                                bugKpi += 30;
                                totalBugs += 1;

                                bugCardDetails.push({
                                    cardName: card.name,
                                    cardUrl: card.shortUrl,
                                    memberCount: totalMemberCount,
                                    points: 30,
                                    members: allMembersInCard.map(memberId => {
                                        const member = members.find(m => m.id === memberId);
                                        return member ? member.fullName : memberId;
                                    })
                                });
                            } else if (totalMemberCount === 2) {
                                bugKpi += 15;
                                totalBugs += 1;

                                bugCardDetails.push({
                                    cardName: card.name,
                                    cardUrl: card.shortUrl,
                                    memberCount: totalMemberCount,
                                    points: 15,
                                    members: allMembersInCard.map(memberId => {
                                        const member = members.find(m => m.id === memberId);
                                        return member ? member.fullName : memberId;
                                    })
                                });
                            }
                        } else {
                            // Original logic for cards without Bug: level 3 tag
                            // Apply BugsKpi.js logic: 1 member = 20 points, 2 members = 10 points each
                            if (totalMemberCount === 1) {
                                bugKpi += 20;
                                totalBugs += 1;

                                bugCardDetails.push({
                                    cardName: card.name,
                                    cardUrl: card.shortUrl,
                                    memberCount: totalMemberCount,
                                    points: 20,
                                    members: allMembersInCard.map(memberId => {
                                        const member = members.find(m => m.id === memberId);
                                        return member ? member.fullName : memberId;
                                    })
                                });
                            } else if (totalMemberCount === 2) {
                                bugKpi += 10;
                                totalBugs += 1;

                                bugCardDetails.push({
                                    cardName: card.name,
                                    cardUrl: card.shortUrl,
                                    memberCount: totalMemberCount,
                                    points: 10,
                                    members: allMembersInCard.map(memberId => {
                                        const member = members.find(m => m.id === memberId);
                                        return member ? member.fullName : memberId;
                                    })
                                });
                            }
                        }
                        // 3+ members = no points (following BugsKpi.js logic)
                    }
                }
            });

            // Calculate issue KPI from "Done" list
            const memberIssueCards = (issueCards?.doneCards || []).filter(card => {
                return card.idMembers && card.idMembers.includes(member.id);
            });

            let issueKpi = 0;
            let totalIssues = 0;
            const issueCardDetails = [];

            memberIssueCards.forEach(card => {
                if (card.labels && card.labels.length > 0 && card.idMembers) {
                    let cardTotalRate = 0;
                    const cardLabels = [];

                    card.labels.forEach(label => {
                        const rate = issueRate[label.name];
                        if (rate) {
                            issueKpi += rate;
                            totalIssues += 1;
                            cardTotalRate += rate;
                            cardLabels.push({
                                name: label.name,
                                rate: rate
                            });
                        }
                    });

                    if (cardTotalRate > 0) {
                        issueCardDetails.push({
                            cardName: card.name,
                            cardUrl: card.shortUrl,
                            labels: cardLabels,
                            totalRate: cardTotalRate
                        });
                    }
                }
            });

            const totalKpi = shiftKpi + bugKpi + issueKpi;

            return {
                member: member,
                shiftKpi: shiftKpi,
                bugKpi: bugKpi,
                issueKpi: issueKpi,
                totalKpi: totalKpi,
                totalShifts: totalShifts,
                totalBugs: totalBugs,
                totalIssues: totalIssues,
                shiftDetails: shiftDetails,
                bugCardDetails: bugCardDetails,
                issueCardDetails: issueCardDetails
            };
        });

        // Sort by total KPI descending
        calculatedKpi.sort((a, b) => b.totalKpi - a.totalKpi);
        setTsMembersKpi(calculatedKpi);
    }, [kpiTsTeam, issueCards]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 4,
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            backgroundAttachment: 'fixed'
        }}>
            <Box sx={{
                maxWidth: '1400px',
                mx: 'auto',
                backgroundColor: 'white',
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                <Box sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    p: 4,
                    textAlign: 'center'
                }}>
                    <Typography
                        variant="h3"
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            mb: 1
                        }}
                    >
                        KPI TS Team
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mt: 3,
                        mb: 2,
                        gap: 2
                    }}>
                        <Paper elevation={0} sx={{
                            p: '4px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                        }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                                <DatePicker
                                    views={['year', 'month']}
                                    label="Chọn tháng báo cáo"
                                    value={selectedDate}
                                    onChange={(newValue) => setSelectedDate(newValue)}
                                    slotProps={{
                                        textField: {
                                            variant: 'outlined',
                                            size: 'small',
                                            sx: {
                                                width: 220,
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'white',
                                                    borderRadius: '8px',
                                                    '& fieldset': { border: 'none' },
                                                    '&:hover fieldset': { border: 'none' },
                                                    '&.Mui-focused fieldset': { border: 'none' },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: 'rgba(0,0,0,0.6)',
                                                    backgroundColor: 'white',
                                                    padding: '0 8px',
                                                    borderRadius: '4px',
                                                    '&.Mui-focused': { color: '#667eea' }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </LocalizationProvider>
                        </Paper>
                    </Box>

                    <Typography
                        variant="h5"
                        sx={{
                            color: 'white',
                            fontWeight: 600,
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            letterSpacing: '0.5px',
                            textTransform: 'capitalize'
                        }}
                    >
                        {selectedDate.locale('vi').format('MMMM, YYYY')}
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            color: 'rgba(255,255,255,0.8)',
                            mt: 0.5,
                            fontWeight: 400
                        }}
                    >
                        (Ca trực thực tế + Issues)
                    </Typography>
                </Box>

                <Box sx={{ p: 4 }}>
                    {/* KPI Table */}
                    <Paper sx={{
                        width: '100%',
                        overflow: 'hidden',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <TableContainer>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1
                                    }}>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            backgroundColor: 'transparent'
                                        }}>
                                            STT
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            backgroundColor: 'transparent'
                                        }}>
                                            Tên
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            textAlign: 'center',
                                            backgroundColor: 'transparent'
                                        }}>
                                            KPI ca trực
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            textAlign: 'center',
                                            backgroundColor: 'transparent'
                                        }}>
                                            KPI bugs
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            textAlign: 'center',
                                            backgroundColor: 'transparent'
                                        }}>
                                            KPI issues
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            textAlign: 'center',
                                            backgroundColor: 'transparent'
                                        }}>
                                            Tổng KPI
                                        </TableCell>
                                        <TableCell sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            fontSize: '1.1rem',
                                            borderBottom: 'none',
                                            textAlign: 'center',
                                            backgroundColor: 'transparent'
                                        }}>
                                            Xem chi tiết
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tsMembersKpi.map((memberKpi, index) => (
                                        <TableRow
                                            key={memberKpi.member.id}
                                            hover
                                            sx={{
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(102, 126, 234, 0.05)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                },
                                                '&:nth-of-type(even)': {
                                                    backgroundColor: 'rgba(0,0,0,0.02)'
                                                }
                                            }}
                                        >
                                            <TableCell sx={{
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold',
                                                color: '#667eea'
                                            }}>
                                                {index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            fontSize: '1.1rem',
                                                            color: '#2c3e50'
                                                        }}
                                                    >
                                                        {memberKpi.member.fullName}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: '#7f8c8d',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        {memberKpi.member.email}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        color: '#3498db',
                                                        fontWeight: 'bold',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {memberKpi.shiftKpi.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        color: '#e74c3c',
                                                        fontWeight: 'bold',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {memberKpi.bugKpi.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        color: '#f39c12',
                                                        fontWeight: 'bold',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {memberKpi.issueKpi.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        color: '#27ae60',
                                                        fontWeight: 'bold',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {memberKpi.totalKpi.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{
                                                        transition: 'all 0.3s ease',
                                                        transform: 'scale(1)',
                                                        borderRadius: 2,
                                                        borderWidth: 2,
                                                        fontWeight: 'bold',
                                                        '&:hover': {
                                                            transform: 'scale(1.05)',
                                                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                                                            backgroundColor: '#667eea',
                                                            color: 'white',
                                                            borderColor: '#667eea'
                                                        }
                                                    }}
                                                    onClick={() => handleOpenModal(memberKpi)}
                                                >
                                                    Xem chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </Box>
            <ModalKPIDetail
                open={modalOpen}
                onClose={handleCloseModal}
                kpiData={selectedKpiData}
            />
        </Box>
    );
};

export default AllKpiTsTeam;