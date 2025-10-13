import React, { useState, useEffect } from 'react';
import { Typography, Button, Progress, message } from 'antd';
import { getResolutionTimes, getCardsOnTrello } from '../api/cardsApi';
import appData from '../data/app.json';
import membersData from '../data/members.json';
import {
    TeamOutlined,
    TrophyOutlined,
    BarChartOutlined,
    ReloadOutlined,
    RightOutlined,
    LeftOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// Format minutes to readable format
function formatMinutes(mins) {
    if (!mins || isNaN(mins)) return '—';
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
    const days = Math.floor(mins / 1440);
    const hours = ((mins % 1440) / 60).toFixed(1);
    return hours > 0 ? `${days} ngày ${hours} h` : `${days} ngày`;
}

// Map app name to product_team
const appToTeam = {};
const teamSet = new Set();
appData.forEach(app => {
    appToTeam[app.app_name.toLowerCase().trim()] = app.product_team;
    if (app.product_team) teamSet.add(app.product_team);
});

function getCardTeam(card) {
    if (!card.labels || card.labels.length === 0) {
        return null;
    }

    const appLabel = card.labels.find(label => label.name && label.name.includes('App:'));
    if (!appLabel) {
        return null;
    }

    const appKey = appLabel.name.replace('App:', '').trim().toLowerCase();
    const productTeam = appToTeam[appKey] || null;

    return productTeam;
}

const PublicDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(dayjs());
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [slideProgress, setSlideProgress] = useState(0);
    const [waitingToFixCards, setWaitingToFixCards] = useState([]);
    const [realStats, setRealStats] = useState({
        totalCards: 0,
        avgResolutionTime: 0,
        avgFirstActionTime: 0,
        avgResolutionTimeDev: 0
    });
    const [teamStats, setTeamStats] = useState({});
    const [resolutionData, setResolutionData] = useState([]);
    const [avgResolutionTime, setAvgResolutionTime] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isTVMode, setIsTVMode] = useState(false);

    // Define slides - optimized for TV display
    const slides = [
        { id: 'team-performance', title: 'Team Performance', duration: 15000 },
        { id: 'resolution-leaderboard', title: 'TS Leaderboard', duration: 15000 },
        { id: 'resolution-analysis', title: 'Resolution Analysis', duration: 15000 }
    ];

    // Fetch data from "Waiting to fix (from dev)" list
    const fetchWaitingToFixData = async () => {
        try {
            setLoading(true);
            const waitingToFixListId = '63c7b1a68e5576001577d65c';
            const cards = await getCardsOnTrello(waitingToFixListId);

            if (!cards || !Array.isArray(cards)) {
                setWaitingToFixCards([]);
                setRealStats({
                    totalCards: 0,
                    avgResolutionTime: 0,
                    avgFirstActionTime: 0,
                    avgResolutionTimeDev: 0
                });
                setTeamStats({});
                setLastUpdated(dayjs());
                return;
            }

            setWaitingToFixCards(cards);

            // Calculate stats
            const totalCards = cards.length;
            const validCards = cards.filter(card =>
                Number(card.resolutionTime) > 0 && !isNaN(Number(card.resolutionTime))
            );

            const avgResolutionTime = validCards.length > 0
                ? Math.round(validCards.reduce((sum, card) => sum + Number(card.resolutionTime), 0) / validCards.length)
                : 0;

            const avgFirstActionTime = validCards.length > 0
                ? Math.round(validCards.reduce((sum, card) => sum + Number(card.firstActionTime || 0), 0) / validCards.length)
                : 0;

            const avgResolutionTimeDev = validCards.length > 0
                ? Math.round(validCards.reduce((sum, card) => sum + Number(card.resolutionTimeDev || 0), 0) / validCards.length)
                : 0;

            setRealStats({
                totalCards,
                avgResolutionTime,
                avgFirstActionTime,
                avgResolutionTimeDev
            });

            // Calculate team statistics
            const teamCounts = {};
            cards.forEach(card => {
                const team = getCardTeam(card);
                if (team) {
                    teamCounts[team] = (teamCounts[team] || 0) + 1;
                }
            });

            setTeamStats(teamCounts);
            setLastUpdated(dayjs());

        } catch (error) {
            console.error('Error fetching waiting to fix data:', error);
            setWaitingToFixCards([]);
            setRealStats({
                totalCards: 0,
                avgResolutionTime: 0,
                avgFirstActionTime: 0,
                avgResolutionTimeDev: 0
            });
            setTeamStats({});
            setLastUpdated(dayjs());
            message.warning('Unable to load real-time data. Using fallback data.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch resolution data from beginning of month
    const fetchResolutionData = async () => {
        try {
            const now = dayjs();
            const startOfMonth = now.startOf('month').format('YYYY-MM-DD');
            const endOfMonth = now.endOf('month').format('YYYY-MM-DD');

            const data = await getResolutionTimes(startOfMonth, endOfMonth);

            if (!data || !Array.isArray(data)) {
                setResolutionData([]);
                setAvgResolutionTime(0);
                setLeaderboard([]);
                return;
            }

            setResolutionData(data);

            // Calculate average resolution time
            const validData = data.filter(item => item.resolutionTime && item.resolutionTime > 0);
            const avgTime = validData.length > 0
                ? Math.round(validData.reduce((sum, item) => sum + item.resolutionTime, 0) / validData.length)
                : 0;
            setAvgResolutionTime(avgTime);

            // Calculate leaderboard for TS members
            const tsMembers = membersData.filter(member => member.role === 'TS');
            const memberStats = {};

            data.forEach(item => {
                if (item.memberId && item.resolutionTime > 0) {
                    const member = tsMembers.find(m => m.id === item.memberId);
                    if (member) {
                        if (!memberStats[member.id]) {
                            memberStats[member.id] = {
                                member: member,
                                cards: 0,
                                totalTime: 0,
                                avgTime: 0
                            };
                        }
                        memberStats[member.id].cards += 1;
                        memberStats[member.id].totalTime += item.resolutionTime;
                    }
                }
            });

            // Calculate average time for each member
            Object.values(memberStats).forEach(stat => {
                stat.avgTime = Math.round(stat.totalTime / stat.cards);
            });

            // Sort by average resolution time (ascending - faster is better)
            const sortedLeaderboard = Object.values(memberStats)
                .sort((a, b) => a.avgTime - b.avgTime)
                .slice(0, 10);

            setLeaderboard(sortedLeaderboard);

        } catch (error) {
            console.error('Error fetching resolution data:', error);
            setResolutionData([]);
            setAvgResolutionTime(0);
            setLeaderboard([]);
            message.warning('Unable to load resolution data. Using fallback data.');
        }
    };

    // TV Mode Detection
    useEffect(() => {
        const detectTVMode = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const userAgent = navigator.userAgent.toLowerCase();

            const isRedmiTV = userAgent.includes('redmi') ||
                             userAgent.includes('mi tv') ||
                             userAgent.includes('android tv') ||
                             userAgent.includes('tv');

            const isTVResolution = (width >= 3840 && height >= 2160) ||
                                  (width >= 1920 && height >= 1080) ||
                                  (width >= 1366 && height >= 768) ||
                                  (width >= 1280 && height >= 720);

            const isLargeScreen = width >= 3840 || height >= 2160 || width >= 1920 || height >= 1080;
            const tvMode = isRedmiTV || (isTVResolution && isLargeScreen);

            setIsTVMode(tvMode);

            if (tvMode) {
                setZoomLevel(1);
            }
        };

        detectTVMode();
        window.addEventListener('resize', detectTVMode);

        return () => window.removeEventListener('resize', detectTVMode);
    }, []);

    // Load data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    fetchWaitingToFixData(),
                    fetchResolutionData()
                ]);
            } catch (error) {
                console.error('❌ Error loading initial data:', error);
            }
        };
        
        loadData();
    }, []);

    // Auto-fullscreen for TV mode
    useEffect(() => {
        if (isTVMode && !isFullscreen) {
            const timer = setTimeout(() => {
                toggleFullscreen();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isTVMode]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'F11') {
                event.preventDefault();
                toggleFullscreen();
            }
            
            // TV mode keyboard shortcuts
            if (isTVMode) {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        prevSlide();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        nextSlide();
                        break;
                    case ' ': // Spacebar
                        event.preventDefault();
                        toggleAutoPlay();
                        break;
                    case 'Escape':
                        if (isFullscreen) {
                            event.preventDefault();
                            toggleFullscreen();
                        }
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isTVMode, isFullscreen]);

    // Auto slide transition
    useEffect(() => {
        if (!isAutoPlay) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
            setSlideProgress(0);
        }, slides[currentSlide].duration);

        return () => clearInterval(interval);
    }, [currentSlide, isAutoPlay, slides]);

    // Progress bar animation
    useEffect(() => {
        if (!isAutoPlay) return;

        const progressInterval = setInterval(() => {
            setSlideProgress((prev) => {
                const increment = 100 / (slides[currentSlide].duration / 100);
                return Math.min(prev + increment, 100);
            });
        }, 100);

        return () => clearInterval(progressInterval);
    }, [currentSlide, isAutoPlay, slides]);

    const handleRefresh = () => {
        fetchWaitingToFixData();
        fetchResolutionData();
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setSlideProgress(0);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setSlideProgress(0);
    };

    const toggleAutoPlay = () => {
        setIsAutoPlay(!isAutoPlay);
        setSlideProgress(0);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.error('Error attempting to exit fullscreen:', err);
            });
        }
    };

    const zoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.1, 2)); // Max 200%
    };

    const zoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.1, 0.5)); // Min 50%
    };

    const calculateResolutionByTeamAndApp = (cards) => {
        const teamStats = new Map();
        const appStats = new Map();

        const productTeams = Array.from(new Set(appData.map(app => app.product_team))).filter(Boolean);
        productTeams.forEach(team => {
            teamStats.set(team, {
                team: team,
                totalTime: 0,
                cardCount: 0,
                avgTime: 0
            });
        });

        appData.forEach(app => {
            appStats.set(app.app_name, {
                app: app.app_name,
                team: app.product_team,
                totalTime: 0,
                cardCount: 0,
                avgTime: 0
            });
        });

        cards.forEach(card => {
            if (!card.resolutionTime || card.resolutionTime <= 0) return;

            if (card.labels && card.labels.length > 0) {
                const cardApps = [];
                card.labels.forEach(label => {
                    if (label.startsWith("App:")) {
                        const appName = label.replace("App:", "").trim();
                        cardApps.push(appName);

                        if (appStats.has(appName)) {
                            const appStat = appStats.get(appName);
                            appStat.totalTime += card.resolutionTime;
                            appStat.cardCount += 1;
                        }
                    }
                });

                const teamAppMap = {};
                cardApps.forEach(appName => {
                    const appDataItem = appData.find(app => app.app_name === appName);
                    if (appDataItem && appDataItem.product_team) {
                        const team = appDataItem.product_team;
                        if (!teamAppMap[team]) {
                            teamAppMap[team] = [];
                        }
                        teamAppMap[team].push(appName);
                    }
                });

                Object.keys(teamAppMap).forEach(team => {
                    if (teamStats.has(team)) {
                        const teamStat = teamStats.get(team);
                        teamStat.totalTime += card.resolutionTime;
                        teamStat.cardCount += 1;
                    }
                });
            }
        });

        teamStats.forEach(stat => {
            stat.avgTime = stat.cardCount > 0 ? Math.round((stat.totalTime / stat.cardCount) * 10) / 10 : 0;
        });

        appStats.forEach(stat => {
            stat.avgTime = stat.cardCount > 0 ? Math.round((stat.totalTime / stat.cardCount) * 10) / 10 : 0;
        });

        return {
            teams: Array.from(teamStats.values()).filter(stat => stat.cardCount > 0).sort((a, b) => a.avgTime - b.avgTime),
            apps: Array.from(appStats.values()).filter(stat => stat.cardCount > 0).sort((a, b) => a.avgTime - b.avgTime)
        };
    };

    const calculateAgentLeaderboard = (cards) => {
        const agentStats = new Map();

        // Initialize stats for all TS members
        membersData
            .filter(member => member.role === 'TS')
            .forEach(member => {
                agentStats.set(member.id, {
                    name: member.fullName,
                    totalTime: 0,
                    cardCount: 0,
                    averageTime: 0,
                    resolutionTime: 0,
                    firstActionTime: 0,
                    resolutionTimeTS: 0
                });
            });

        // Calculate stats for each card
        cards.forEach(card => {
            if (!card.members || !card.resolutionTime) return;

            card.members.forEach(memberId => {
                const member = membersData.find(m => m.id === memberId);
                if (!member || member.role !== 'TS') return;

                const stats = agentStats.get(memberId);
                if (!stats) return;

                stats.totalTime += card.resolutionTime || 0;
                stats.cardCount += 1;
                stats.resolutionTime += card.resolutionTime || 0;
                stats.firstActionTime += card.firstActionTime || 0;
                stats.resolutionTimeTS += card.resolutionTimeTS || 0;
            });
        });

        // Calculate averages and filter out members with no cards
        return Array.from(agentStats.values())
            .map(stats => ({
                ...stats,
                averageTime: stats.cardCount > 0 ? Math.round((stats.totalTime / stats.cardCount) * 10) / 10 : 0,
                avgResolutionTime: stats.cardCount > 0 ? Math.round((stats.resolutionTime / stats.cardCount) * 10) / 10 : 0,
                avgFirstActionTime: stats.cardCount > 0 ? Math.round((stats.firstActionTime / stats.cardCount) * 10) / 10 : 0,
                avgResolutionTimeTS: stats.cardCount > 0 ? Math.round((stats.resolutionTimeTS / stats.cardCount) * 10) / 10 : 0
            }))
            .filter(stats => stats.cardCount > 0)
            .sort((a, b) => a.averageTime - b.averageTime);
    };

    // Render Resolution Time Slide
    const renderResolutionSlide = () => {
        const agentLeaderboard = calculateAgentLeaderboard(resolutionData);

        // Podium colors
        const podiumColors = [
            { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', text: '#ffffff', medal: '🥇' },
            { bg: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)', text: '#ffffff', medal: '🥈' },
            { bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', text: '#ffffff', medal: '🥉' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: isTVMode ? '30px' : '25px',
                background: '#f8fafc',
                position: 'relative'
            }}>
                {/* Header Section */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: isTVMode ? '25px' : '20px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    padding: isTVMode ? '25px' : '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                }}>
                    <Title level={1} style={{
                        color: '#1e293b',
                        marginBottom: 8,
                        fontSize: isTVMode ? '2.2rem' : '2rem',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        <TrophyOutlined style={{ marginRight: 12, color: '#f5576c', fontSize: isTVMode ? '2rem' : '1.8rem' }} />
                        TS Performance Leaderboard
                    </Title>
                    <Paragraph style={{
                        fontSize: isTVMode ? '1rem' : '0.9rem',
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        This Month • Top Performers by Resolution Time
                    </Paragraph>
                </div>

                {/* Main Content */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: isTVMode ? '25px' : '20px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Left Column - Stats & Top 3 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isTVMode ? '20px' : '15px'
                    }}>
                        {/* Stats Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: isTVMode ? '15px' : '12px'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '16px',
                                padding: isTVMode ? '20px' : '18px',
                                textAlign: 'center',
                                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: isTVMode ? '0.8rem' : '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px'
                                }}>
                                    Total Resolved
                                </div>
                                <div style={{
                                    fontSize: isTVMode ? '3rem' : '2.5rem',
                                    fontWeight: 900,
                                    color: '#ffffff',
                                    lineHeight: 1
                                }}>
                                    {resolutionData.length}
                                </div>
                            </div>

                            <div style={{
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                borderRadius: '16px',
                                padding: isTVMode ? '20px' : '18px',
                                textAlign: 'center',
                                boxShadow: '0 8px 25px rgba(67, 233, 123, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: isTVMode ? '0.8rem' : '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px'
                                }}>
                                    Avg Time
                                </div>
                                <div style={{
                                    fontSize: isTVMode ? '2rem' : '1.8rem',
                                    fontWeight: 900,
                                    color: '#ffffff',
                                    lineHeight: 1
                                }}>
                                    {formatMinutes(avgResolutionTime)}
                                </div>
                            </div>

                            <div style={{
                                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                borderRadius: '16px',
                                padding: isTVMode ? '20px' : '18px',
                                textAlign: 'center',
                                boxShadow: '0 8px 25px rgba(250, 112, 154, 0.3)'
                            }}>
                                <div style={{
                                    fontSize: isTVMode ? '0.8rem' : '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px'
                                }}>
                                    Active Members
                                </div>
                                <div style={{
                                    fontSize: isTVMode ? '3rem' : '2.5rem',
                                    fontWeight: 900,
                                    color: '#ffffff',
                                    lineHeight: 1
                                }}>
                                    {agentLeaderboard.length}
                                </div>
                            </div>
                        </div>

                        {/* Top 3 Podium */}
                        {agentLeaderboard.length > 0 && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '20px',
                                padding: isTVMode ? '25px' : '20px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                flex: '1 1 auto'
                            }}>
                                <div style={{
                                    fontSize: isTVMode ? '1.1rem' : '1rem',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    marginBottom: isTVMode ? '20px' : '15px',
                                    textAlign: 'center'
                                }}>
                                    <TrophyOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
                                    Top 3 Champions
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isTVMode ? '12px' : '10px'
                                }}>
                                    {agentLeaderboard.slice(0, 3).map((member, index) => {
                                        const color = podiumColors[index];
                                        return (
                                            <div key={member.name} style={{
                                                background: color.bg,
                                                borderRadius: '12px',
                                                padding: isTVMode ? '15px' : '12px',
                                                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{
                                                    fontSize: isTVMode ? '2.5rem' : '2rem',
                                                    lineHeight: 1
                                                }}>
                                                    {color.medal}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: isTVMode ? '1.1rem' : '1rem',
                                                        fontWeight: 700,
                                                        color: color.text,
                                                        marginBottom: '4px'
                                                    }}>
                                                        {member.name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: isTVMode ? '0.85rem' : '0.8rem',
                                                        color: 'rgba(255, 255, 255, 0.9)',
                                                        fontWeight: 600
                                                    }}>
                                                        {member.cardCount} cards • {formatMinutes(member.avgResolutionTime)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Full Leaderboard */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '20px',
                        padding: isTVMode ? '25px' : '20px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <div style={{
                            fontSize: isTVMode ? '1.3rem' : '1.2rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            marginBottom: isTVMode ? '20px' : '15px',
                            textAlign: 'center',
                            paddingBottom: isTVMode ? '15px' : '12px',
                            borderBottom: '2px solid #e2e8f0'
                        }}>
                            <BarChartOutlined style={{ marginRight: 8, color: '#f5576c' }} />
                            All Members ({agentLeaderboard.length})
                        </div>

                        <div style={{
                            overflow: 'auto',
                            flex: '1 1 auto'
                        }}>
                            {agentLeaderboard.length > 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isTVMode ? '10px' : '8px'
                                }}>
                                    {agentLeaderboard.map((member, index) => (
                                        <div key={member.name} style={{
                                            background: index < 3
                                                ? 'linear-gradient(135deg, #f8fafc 0%, #fff7ed 100%)'
                                                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                            borderRadius: '12px',
                                            padding: isTVMode ? '15px 18px' : '12px 15px',
                                            border: index < 3 ? '2px solid #fbbf24' : '1px solid #e2e8f0',
                                            display: 'grid',
                                            gridTemplateColumns: '50px 1fr auto auto auto',
                                            gap: isTVMode ? '15px' : '12px',
                                            alignItems: 'center',
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                                            <div style={{
                                                fontSize: isTVMode ? '1.5rem' : '1.3rem',
                                                fontWeight: 900,
                                                color: index < 3 ? '#f59e0b' : '#64748b',
                                                textAlign: 'center'
                                            }}>
                                                #{index + 1}
                                            </div>
                                            <div style={{
                                                fontSize: isTVMode ? '1rem' : '0.95rem',
                                                fontWeight: 700,
                                                color: '#1e293b'
                                            }}>
                                                {member.name}
                                            </div>
                                            <div style={{
                                                background: '#e0f2fe',
                                                padding: isTVMode ? '8px 12px' : '6px 10px',
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: isTVMode ? '0.7rem' : '0.65rem',
                                                    color: '#0369a1',
                                                    fontWeight: 600,
                                                    marginBottom: '2px'
                                                }}>
                                                    Cards
                                                </div>
                                                <div style={{
                                                    fontSize: isTVMode ? '1.1rem' : '1rem',
                                                    fontWeight: 900,
                                                    color: '#0c4a6e'
                                                }}>
                                                    {member.cardCount}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: '#dcfce7',
                                                padding: isTVMode ? '8px 12px' : '6px 10px',
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: isTVMode ? '0.7rem' : '0.65rem',
                                                    color: '#15803d',
                                                    fontWeight: 600,
                                                    marginBottom: '2px'
                                                }}>
                                                    Avg Resolution
                                                </div>
                                                <div style={{
                                                    fontSize: isTVMode ? '1rem' : '0.9rem',
                                                    fontWeight: 900,
                                                    color: '#14532d'
                                                }}>
                                                    {formatMinutes(member.avgResolutionTime)}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: '#e0e7ff',
                                                padding: isTVMode ? '8px 12px' : '6px 10px',
                                                borderRadius: '8px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: isTVMode ? '0.7rem' : '0.65rem',
                                                    color: '#4338ca',
                                                    fontWeight: 600,
                                                    marginBottom: '2px'
                                                }}>
                                                    Avg First Action
                                                </div>
                                                <div style={{
                                                    fontSize: isTVMode ? '1rem' : '0.9rem',
                                                    fontWeight: 900,
                                                    color: '#312e81'
                                                }}>
                                                    {formatMinutes(member.avgFirstActionTime)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#64748b'
                                }}>
                                    <TrophyOutlined style={{ fontSize: '3rem', marginBottom: '16px', color: '#cbd5e1' }} />
                                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>No Data Yet</div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                        Leaderboard will appear when TS members complete cards
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render Resolution Analysis Slide
    const renderResolutionAnalysisSlide = () => {
        const analysisData = calculateResolutionByTeamAndApp(resolutionData);

        // Team colors matching slide 1
        const teamColors = [
            { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', text: '#ffffff' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: isTVMode ? '30px' : '25px',
                background: '#f8fafc',
                position: 'relative'
            }}>
                {/* Header Section */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: isTVMode ? '25px' : '20px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    padding: isTVMode ? '25px' : '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                }}>
                    <Title level={1} style={{
                        color: '#1e293b',
                        marginBottom: 8,
                        fontSize: isTVMode ? '2.2rem' : '2rem',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        <BarChartOutlined style={{ marginRight: 12, color: '#00f2fe', fontSize: isTVMode ? '2rem' : '1.8rem' }} />
                        Resolution Time Analysis
                    </Title>
                    <Paragraph style={{
                        fontSize: isTVMode ? '1rem' : '0.9rem',
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        This Month • Performance by Teams & Applications
                    </Paragraph>
                </div>

                {/* Main Content */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.5fr',
                    gap: isTVMode ? '25px' : '20px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Left Column - Teams */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isTVMode ? '15px' : '12px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '20px',
                            padding: isTVMode ? '25px' : '20px',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                            flex: '1 1 auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                fontSize: isTVMode ? '1.3rem' : '1.2rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                marginBottom: isTVMode ? '20px' : '15px',
                                textAlign: 'center',
                                paddingBottom: isTVMode ? '15px' : '12px',
                                borderBottom: '2px solid #e2e8f0'
                            }}>
                                <TeamOutlined style={{ marginRight: 8, color: '#4facfe' }} />
                                Product Teams ({analysisData.teams.length})
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: isTVMode ? '12px' : '10px',
                                overflow: 'auto',
                                flex: '1 1 auto'
                            }}>
                                {analysisData.teams.length > 0 ? (
                                    analysisData.teams.map((team, index) => {
                                        const color = teamColors[index % teamColors.length];
                                        const isFastest = index === 0;

                                        return (
                                            <div key={team.team} style={{
                                                background: color.bg,
                                                borderRadius: '12px',
                                                padding: isTVMode ? '12px 15px' : '10px 12px',
                                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.12)',
                                                border: isFastest ? '2px solid #fbbf24' : 'none',
                                                position: 'relative',
                                                transition: 'transform 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                {isFastest && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-8px',
                                                        right: '-8px',
                                                        background: '#fbbf24',
                                                        borderRadius: '50%',
                                                        width: '30px',
                                                        height: '30px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem',
                                                        boxShadow: '0 3px 10px rgba(251, 191, 36, 0.4)'
                                                    }}>
                                                        🏆
                                                    </div>
                                                )}
                                                <div style={{
                                                    fontSize: isTVMode ? '1rem' : '0.95rem',
                                                    fontWeight: 700,
                                                    color: color.text,
                                                    marginBottom: '8px',
                                                    textAlign: 'center'
                                                }}>
                                                    {team.team}
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: '8px'
                                                }}>
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.2)',
                                                        padding: '8px 6px',
                                                        borderRadius: '8px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            fontSize: isTVMode ? '0.65rem' : '0.6rem',
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            fontWeight: 600,
                                                            marginBottom: '3px'
                                                        }}>
                                                            Cards
                                                        </div>
                                                        <div style={{
                                                            fontSize: isTVMode ? '1.4rem' : '1.3rem',
                                                            fontWeight: 900,
                                                            color: color.text
                                                        }}>
                                                            {team.cardCount}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.2)',
                                                        padding: '8px 6px',
                                                        borderRadius: '8px',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            fontSize: isTVMode ? '0.65rem' : '0.6rem',
                                                            color: 'rgba(255, 255, 255, 0.9)',
                                                            fontWeight: 600,
                                                            marginBottom: '3px'
                                                        }}>
                                                            Avg Time
                                                        </div>
                                                        <div style={{
                                                            fontSize: isTVMode ? '0.9rem' : '0.85rem',
                                                            fontWeight: 900,
                                                            color: color.text
                                                        }}>
                                                            {formatMinutes(team.avgTime)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px',
                                        color: '#64748b'
                                    }}>
                                        <TeamOutlined style={{ fontSize: '3rem', marginBottom: '16px', color: '#cbd5e1' }} />
                                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>No Team Data</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Apps */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '20px',
                        padding: isTVMode ? '25px' : '20px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <div style={{
                            fontSize: isTVMode ? '1.3rem' : '1.2rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            marginBottom: isTVMode ? '20px' : '15px',
                            textAlign: 'center',
                            paddingBottom: isTVMode ? '15px' : '12px',
                            borderBottom: '2px solid #e2e8f0'
                        }}>
                            <BarChartOutlined style={{ marginRight: 8, color: '#00f2fe' }} />
                            Applications Breakdown ({analysisData.apps.length})
                        </div>

                        <div style={{
                            overflow: 'auto',
                            flex: '1 1 auto'
                        }}>
                            {analysisData.apps.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isTVMode ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: isTVMode ? '12px' : '10px'
                                }}>
                                    {analysisData.apps.map((app, index) => {
                                        const isFastest = index === 0;

                                        return (
                                            <div key={app.app} style={{
                                                background: isFastest
                                                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                                borderRadius: '12px',
                                                padding: isTVMode ? '16px 12px' : '14px 10px',
                                                textAlign: 'center',
                                                boxShadow: isFastest ? '0 6px 20px rgba(251, 191, 36, 0.3)' : '0 3px 10px rgba(0, 0, 0, 0.08)',
                                                border: isFastest ? '2px solid #fbbf24' : '2px solid rgba(79, 172, 254, 0.1)',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                                                e.currentTarget.style.boxShadow = isFastest
                                                    ? '0 10px 30px rgba(251, 191, 36, 0.4)'
                                                    : '0 8px 25px rgba(79, 172, 254, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                e.currentTarget.style.boxShadow = isFastest
                                                    ? '0 6px 20px rgba(251, 191, 36, 0.3)'
                                                    : '0 3px 10px rgba(0, 0, 0, 0.08)';
                                            }}>
                                                {isFastest && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-8px',
                                                        right: '-8px',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        ⭐
                                                    </div>
                                                )}
                                                <div style={{
                                                    fontSize: isTVMode ? '0.8rem' : '0.75rem',
                                                    fontWeight: 700,
                                                    color: '#1e293b',
                                                    lineHeight: '1.2',
                                                    minHeight: '2.4em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    {app.app}
                                                </div>
                                                <div style={{
                                                    background: isFastest ? 'rgba(251, 191, 36, 0.2)' : 'rgba(79, 172, 254, 0.1)',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{
                                                        fontSize: isTVMode ? '0.65rem' : '0.6rem',
                                                        color: '#64748b',
                                                        fontWeight: 600,
                                                        marginBottom: '2px'
                                                    }}>
                                                        Cards
                                                    </div>
                                                    <div style={{
                                                        fontSize: isTVMode ? '1.4rem' : '1.3rem',
                                                        fontWeight: 900,
                                                        color: isFastest ? '#b45309' : '#4facfe'
                                                    }}>
                                                        {app.cardCount}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    background: isFastest ? 'rgba(251, 191, 36, 0.2)' : 'rgba(67, 233, 123, 0.1)',
                                                    padding: '6px 8px',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{
                                                        fontSize: isTVMode ? '0.65rem' : '0.6rem',
                                                        color: '#64748b',
                                                        fontWeight: 600,
                                                        marginBottom: '2px'
                                                    }}>
                                                        Avg Time
                                                    </div>
                                                    <div style={{
                                                        fontSize: isTVMode ? '0.85rem' : '0.8rem',
                                                        fontWeight: 900,
                                                        color: isFastest ? '#b45309' : '#15803d'
                                                    }}>
                                                        {formatMinutes(app.avgTime)}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: isTVMode ? '0.6rem' : '0.55rem',
                                                    color: '#94a3b8',
                                                    fontWeight: 600,
                                                    background: 'rgba(148, 163, 184, 0.1)',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {app.team}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#64748b'
                                }}>
                                    <BarChartOutlined style={{ fontSize: '3rem', marginBottom: '16px', color: '#cbd5e1' }} />
                                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>No App Data</div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                        Data will appear when apps have resolved cards
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render Team Performance Slide
    const renderTeamPerformanceSlide = () => {
        const teamEntries = Object.entries(teamStats).sort((a, b) => b[1] - a[1]);
        const totalTeamCards = teamEntries.reduce((sum, [, count]) => sum + count, 0);

        // Team colors for visual distinction
        const teamColors = [
            { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', text: '#ffffff' },
            { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', text: '#ffffff' },
        ];

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: isTVMode ? '30px' : '25px',
                background: '#f8fafc',
                position: 'relative'
            }}>
                {/* Header Section */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: isTVMode ? '25px' : '20px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    padding: isTVMode ? '25px' : '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                }}>
                    <Title level={1} style={{
                        color: '#1e293b',
                        marginBottom: 8,
                        fontSize: isTVMode ? '2.2rem' : '2rem',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        <TeamOutlined style={{ marginRight: 12, color: '#667eea', fontSize: isTVMode ? '2rem' : '1.8rem' }} />
                        Team Performance Dashboard
                    </Title>
                    <Paragraph style={{
                        fontSize: isTVMode ? '1rem' : '0.9rem',
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        Real-time Overview • Cards Waiting for Developer Fixes
                    </Paragraph>
                </div>

                {/* Main Content - 2 Column Layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: isTVMode ? '25px' : '20px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Left Column - Summary Stats */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isTVMode ? '20px' : '15px'
                    }}>
                        {/* Total Cards - Big Hero Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '20px',
                            padding: isTVMode ? '35px 25px' : '30px 20px',
                            textAlign: 'center',
                            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
                            border: '2px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <div style={{
                                fontSize: isTVMode ? '1rem' : '0.9rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontWeight: 600,
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                Total Cards
                            </div>
                            <div style={{
                                fontSize: isTVMode ? '5rem' : '4.5rem',
                                fontWeight: 900,
                                color: '#ffffff',
                                lineHeight: 1,
                                textShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                            }}>
                                {realStats.totalCards}
                            </div>
                            <div style={{
                                fontSize: isTVMode ? '0.85rem' : '0.75rem',
                                color: 'rgba(255, 255, 255, 0.8)',
                                marginTop: '12px',
                                fontWeight: 500
                            }}>
                                Waiting for Fix
                            </div>
                        </div>

                        {/* Team Summary Cards */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '20px',
                            padding: isTVMode ? '25px' : '20px',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                            flex: '1 1 auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                fontSize: isTVMode ? '1.1rem' : '1rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                marginBottom: isTVMode ? '20px' : '15px',
                                textAlign: 'center'
                            }}>
                                <TeamOutlined style={{ marginRight: 8, color: '#667eea' }} />
                                Product Teams ({teamEntries.length})
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: isTVMode ? '12px' : '10px',
                                flex: '1 1 auto',
                                overflow: 'auto'
                            }}>
                                {teamEntries.map(([team, count], index) => {
                                    const percentage = totalTeamCards > 0 ? Math.round((count / totalTeamCards) * 100) : 0;
                                    const color = teamColors[index % teamColors.length];

                                    return (
                                        <div key={team} style={{
                                            background: color.bg,
                                            borderRadius: '12px',
                                            padding: isTVMode ? '15px' : '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                                            transition: 'transform 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                flex: 1
                                            }}>
                                                <div style={{
                                                    fontSize: isTVMode ? '2rem' : '1.8rem',
                                                    fontWeight: 900,
                                                    color: color.text,
                                                    minWidth: isTVMode ? '50px' : '45px',
                                                    textAlign: 'center'
                                                }}>
                                                    {count}
                                                </div>
                                                <div>
                                                    <div style={{
                                                        fontSize: isTVMode ? '1rem' : '0.9rem',
                                                        fontWeight: 700,
                                                        color: color.text,
                                                        lineHeight: 1.2
                                                    }}>
                                                        {team}
                                                    </div>
                                                    <div style={{
                                                        fontSize: isTVMode ? '0.75rem' : '0.7rem',
                                                        color: 'rgba(255, 255, 255, 0.9)',
                                                        fontWeight: 600
                                                    }}>
                                                        {percentage}% of total
                                                    </div>
                                                </div>
                                            </div>
                                            <Progress
                                                type="circle"
                                                percent={percentage}
                                                width={isTVMode ? 50 : 45}
                                                strokeColor="#ffffff"
                                                trailColor="rgba(255, 255, 255, 0.3)"
                                                strokeWidth={8}
                                                format={(percent) => (
                                                    <span style={{ color: color.text, fontSize: '0.7rem', fontWeight: 700 }}>
                                                        {percent}%
                                                    </span>
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Apps Grid */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '20px',
                        padding: isTVMode ? '25px' : '20px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <div style={{
                            fontSize: isTVMode ? '1.3rem' : '1.2rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            marginBottom: isTVMode ? '20px' : '15px',
                            textAlign: 'center',
                            paddingBottom: isTVMode ? '15px' : '12px',
                            borderBottom: '2px solid #e2e8f0'
                        }}>
                            <BarChartOutlined style={{ marginRight: 8, color: '#667eea' }} />
                            Applications Breakdown
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isTVMode ? 'repeat(auto-fill, minmax(110px, 1fr))' : 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: isTVMode ? '12px' : '10px',
                            overflow: 'auto',
                            flex: '1 1 auto',
                            alignContent: 'start'
                        }}>
                            {appData.map((app, index) => {
                                const appCardsCount = waitingToFixCards.filter(card => {
                                    if (!card.labels || !Array.isArray(card.labels)) return false;
                                    const appLabel = card.labels.find(label => label.name && label.name.includes('App:'));
                                    if (appLabel) {
                                        const appKey = appLabel.name.replace('App:', '').trim().toLowerCase();
                                        return appKey === app.app_name.toLowerCase();
                                    }
                                    return false;
                                }).length;

                                if (appCardsCount === 0) return null;

                                return (
                                    <div key={app.app_name} style={{
                                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                        borderRadius: '12px',
                                        padding: isTVMode ? '15px 10px' : '12px 8px',
                                        textAlign: 'center',
                                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
                                        border: '2px solid rgba(102, 126, 234, 0.1)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                                        e.currentTarget.style.borderColor = '#667eea';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                                    }}>
                                        <div style={{
                                            color: '#667eea',
                                            fontSize: isTVMode ? '2rem' : '1.8rem',
                                            fontWeight: 900,
                                            lineHeight: 1
                                        }}>
                                            {appCardsCount}
                                        </div>
                                        <div style={{
                                            color: '#1e293b',
                                            fontSize: isTVMode ? '0.75rem' : '0.7rem',
                                            fontWeight: 700,
                                            lineHeight: '1.1',
                                            wordBreak: 'break-word'
                                        }}>
                                            {app.app_name}
                                        </div>
                                        <div style={{
                                            color: '#64748b',
                                            fontSize: isTVMode ? '0.65rem' : '0.6rem',
                                            fontWeight: 600,
                                            background: 'rgba(100, 116, 139, 0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            display: 'inline-block'
                                        }}>
                                            {app.product_team || 'N/A'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCurrentSlide = () => {
        switch (slides[currentSlide].id) {
            case 'team-performance':
                return renderTeamPerformanceSlide();
            case 'resolution-leaderboard':
                return renderResolutionSlide();
            case 'resolution-analysis':
                return renderResolutionAnalysisSlide();
            default:
                return renderTeamPerformanceSlide();
        }
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#f8fafc',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Slide Content */}
            <div style={{
                position: 'relative',
                background: '#ffffff',
                borderRadius: '20px',
                margin: isTVMode ? '20px' : '16px',
                width: isTVMode ? 'calc(100% - 40px)' : 'calc(100% - 32px)',
                height: isTVMode ? 'calc(100% - 40px)' : 'calc(100% - 32px)',
                overflow: 'hidden',
                transform: isTVMode ? 'none' : `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
            }}>
                {renderCurrentSlide()}
            </div>

            {/* Slide Navigation */}
            {!isFullscreen && !isTVMode && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span>{slides[currentSlide].title}</span>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: 400,
                            opacity: 0.8,
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}>
                            {Math.round(zoomLevel * 100)}%
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button
                            icon={<LeftOutlined />}
                            onClick={prevSlide}
                            style={{ borderRadius: '8px' }}
                            size="large"
                        />
                        <Button
                            icon={isAutoPlay ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            onClick={toggleAutoPlay}
                            style={{ borderRadius: '8px' }}
                            size="large"
                            type={isAutoPlay ? 'primary' : 'default'}
                        />
                        <Button
                            icon={<RightOutlined />}
                            onClick={nextSlide}
                            style={{ borderRadius: '8px' }}
                            size="large"
                        />
                        <Button
                            onClick={() => {
                                if (isTVMode) {
                                    setIsTVMode(false);
                                    setZoomLevel(1);
                                } else {
                                    setIsTVMode(true);
                                    setZoomLevel(1);
                                }
                            }}
                            style={{ 
                                borderRadius: '8px',
                                background: isTVMode ? 'rgba(102, 126, 234, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                                border: 'none',
                                color: 'white'
                            }}
                            size="large"
                            title={isTVMode ? 'Disable TV Mode' : 'Enable TV Mode'}
                        >
                            📺
                        </Button>
                        <Button
                            icon={<ZoomOutOutlined />}
                            onClick={zoomOut}
                            style={{ borderRadius: '8px' }}
                            size="large"
                            title="Zoom Out"
                        />
                        <Button
                            icon={<ZoomInOutlined />}
                            onClick={zoomIn}
                            style={{ borderRadius: '8px' }}
                            size="large"
                            title="Zoom In"
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleRefresh}
                            style={{ borderRadius: '8px' }}
                            size="large"
                            loading={loading}
                            title="Refresh Data"
                        />
                        <Button
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={toggleFullscreen}
                            style={{ borderRadius: '8px' }}
                            size="large"
                            type={isFullscreen ? 'primary' : 'default'}
                            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        />
                    </div>
                </div>
            )}

            {/* TV Mode Indicator */}
            {isTVMode && (
                <div 
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000,
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    📺 TV Mode
                    {isFullscreen && (
                        <Button
                            icon={<FullscreenExitOutlined />}
                            style={{ 
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                marginLeft: '8px'
                            }}
                            size="small"
                            title="Exit Fullscreen (F11)"
                            onClick={toggleFullscreen}
                        />
                    )}
                </div>
            )}

            {/* Fullscreen Exit Overlay */}
            {isFullscreen && !isTVMode && (
                <div 
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000
                    }}
                    onClick={toggleFullscreen}
                >
                    <Button
                        icon={<FullscreenExitOutlined />}
                        style={{ 
                            borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            border: 'none',
                            color: 'white'
                        }}
                        size="large"
                        title="Exit Fullscreen (F11)"
                    />
                </div>
            )}

            {/* Progress Bar */}
            {!isFullscreen && !isTVMode && (
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '12px',
                        padding: '16px 20px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '8px',
                            color: 'white'
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                Slide {currentSlide + 1} of {slides.length}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                {isAutoPlay ? 'Auto' : 'Manual'}
                            </span>
                        </div>
                        <Progress 
                            percent={slideProgress} 
                            showInfo={false}
                            strokeColor={{
                                '0%': '#667eea',
                                '100%': '#764ba2',
                            }}
                            style={{ marginBottom: '8px' }}
                        />
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: '8px' 
                        }}>
                            {slides.map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: index === currentSlide ? '#667eea' : 'rgba(255, 255, 255, 0.3)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onClick={() => {
                                        setCurrentSlide(index);
                                        setSlideProgress(0);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicDashboard;
