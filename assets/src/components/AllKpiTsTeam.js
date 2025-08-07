import React, { useState, useEffect } from 'react';
import { getKpiTsTeam } from '../api/workShiftApi';
import { getCardsByList } from '../api/trelloApi';
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
                
                // Fetch shift data
                const kpiData = await getKpiTsTeam('2025-07-31', '2025-08-30');
                const cleanedData = kpiData.filter(item => item && Object.keys(item).length > 0);
                setKpiTsTeam(cleanedData);
                
                // Get list IDs for "Fix done from dev" and "Done"
                const fixDoneList = listsId.find(list => list.name === "Fix done from dev");
                const doneLists = listsId.filter(list => list.name === "Done");
                
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
    }, []);

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
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 300
                        }}
                    >
                        Tháng 8/2025 (Ca trực + Issues)
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