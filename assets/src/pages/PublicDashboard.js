import React, { useState, useEffect } from 'react';
import { Card, Statistic, Typography, Button, Progress, Table, message } from 'antd';
import { getResolutionTimes, getCardsOnTrello } from '../api/cardsApi';
import appData from '../data/app.json';
import membersData from '../data/members.json';
import { 
    TeamOutlined, 
    ClockCircleOutlined, 
    CheckCircleOutlined,
    TrophyOutlined,
    BarChartOutlined,
    ReloadOutlined,
    RightOutlined,
    LeftOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    StarOutlined,
    FireOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// Mock data for demonstration
const mockStats = {
    totalCards: 1247,
    avgResolutionTime: 180, // minutes
    avgFirstActionTime: 45, // minutes
    avgResolutionTimeDev: 120, // minutes
    under1h: 456,
    oneTo12h: 523,
    twelveTo24h: 198,
    over24h: 70
};

const mockTeamData = [
    { name: 'Falcon', resolutionTime: 165, firstActionTime: 38, devTime: 110, cards: 234 },
    { name: 'Starlink', resolutionTime: 195, firstActionTime: 52, devTime: 125, cards: 189 },
    { name: 'Tesla', resolutionTime: 142, firstActionTime: 28, devTime: 95, cards: 312 },
    { name: 'Solar', resolutionTime: 178, firstActionTime: 41, devTime: 108, cards: 267 },
    { name: 'Team X', resolutionTime: 203, firstActionTime: 55, devTime: 135, cards: 245 }
];

// Format minutes to readable format
function formatMinutes(mins) {
    if (!mins || isNaN(mins)) return '—';
    if (mins < 60) return `${mins} min`;
    if (mins < 1440) return `${(mins / 60).toFixed(1)} h`;
    const days = Math.floor(mins / 1440);
    const hours = ((mins % 1440) / 60).toFixed(1);
    return hours > 0 ? `${days} ngày ${hours} h` : `${days} ngày`;
}


// Map app name to product_team (same as DevFixing.js)
const appToTeam = {};
const teamSet = new Set();
appData.forEach(app => {
    appToTeam[app.app_name.toLowerCase().trim()] = app.product_team;
    if (app.product_team) teamSet.add(app.product_team);
});

// Get product team from card labels (same logic as DevFixing.js)
function getCardTeam(card) {
    if (!card.labels || card.labels.length === 0) {
        return null;
    }
    
    // Find app label first
    const appLabel = card.labels.find(label => label.name && label.name.includes('App:'));
    if (!appLabel) {
        return null;
    }
    
    // Extract app name from label
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
            console.log('🔄 Fetching waiting to fix data...');
            
            const waitingToFixListId = '63c7b1a68e5576001577d65c'; // ID for "Waiting to fix (from dev)"
            const cards = await getCardsOnTrello(waitingToFixListId);
            
            console.log('📊 Cards received:', cards?.length || 0);
            console.log('📋 Sample card:', cards?.[0]);
            
            // Debug labels structure
            if (cards && cards.length > 0) {
                console.log('🏷️ Sample card labels:', cards[0]?.labels);
                console.log('🏷️ Labels type:', typeof cards[0]?.labels);
                console.log('🏷️ Is array:', Array.isArray(cards[0]?.labels));
            }
            
            if (!cards || !Array.isArray(cards)) {
                console.warn('⚠️ No cards data received, using fallback');
                // Use fallback data
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
            
            // Calculate real stats
            const totalCards = cards.length;
            const validCards = cards.filter(card => 
                Number(card.resolutionTime) > 0 && !isNaN(Number(card.resolutionTime))
            );
            
            console.log('✅ Valid cards for stats:', validCards.length);
            
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
            
            console.log('🏢 Team stats calculated:', teamCounts);
            setTeamStats(teamCounts);
            
            setLastUpdated(dayjs());
            console.log('✅ Waiting to fix data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error fetching waiting to fix data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Set fallback data instead of showing error
            setWaitingToFixCards([]);
            setRealStats({
                totalCards: 0,
                avgResolutionTime: 0,
                avgFirstActionTime: 0,
                avgResolutionTimeDev: 0
            });
            setTeamStats({});
            setLastUpdated(dayjs());
            
            // Show user-friendly message
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
            
            console.log('🔄 Fetching resolution data from:', startOfMonth, 'to:', endOfMonth);
            const data = await getResolutionTimes(startOfMonth, endOfMonth);
            console.log('📊 Resolution data received:', data?.length || 0);
            
            if (!data || !Array.isArray(data)) {
                console.warn('⚠️ No resolution data received, using fallback');
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
            console.log('TS Members found:', tsMembers.length);
            const memberStats = {};
            
            data.forEach(item => {
                console.log('Processing item:', item);
                if (item.memberId && item.resolutionTime > 0) {
                    const member = tsMembers.find(m => m.id === item.memberId);
                    console.log('Found member for item:', member);
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
            
            console.log('Member stats calculated:', memberStats);
            
            // Calculate average time for each member
            Object.values(memberStats).forEach(stat => {
                stat.avgTime = Math.round(stat.totalTime / stat.cards);
            });
            
            // Sort by average resolution time (ascending - faster is better)
            const sortedLeaderboard = Object.values(memberStats)
                .sort((a, b) => a.avgTime - b.avgTime)
                .slice(0, 10); // Top 10
            
            console.log('✅ Final leaderboard:', sortedLeaderboard);
            setLeaderboard(sortedLeaderboard);
            console.log('✅ Resolution data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error fetching resolution data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Set fallback data
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
            
            // Detect Redmi TV or similar TV devices
            const isRedmiTV = userAgent.includes('redmi') || 
                             userAgent.includes('mi tv') || 
                             userAgent.includes('android tv') ||
                             userAgent.includes('tv');
            
            // Detect TV-like resolutions (common TV resolutions)
            const isTVResolution = (width >= 3840 && height >= 2160) || // 4K UHD
                                  (width >= 1920 && height >= 1080) || // Full HD
                                  (width >= 1366 && height >= 768) ||   // HD
                                  (width >= 1280 && height >= 720);     // HD Ready
            
            // Detect large screen (likely TV) - optimized for 4K
            const isLargeScreen = width >= 3840 || height >= 2160 || width >= 1920 || height >= 1080;
            
            const tvMode = isRedmiTV || (isTVResolution && isLargeScreen);
            
            console.log('📺 TV Detection:', {
                width, height, userAgent,
                isRedmiTV, isTVResolution, isLargeScreen,
                tvMode
            });
            
            setIsTVMode(tvMode);
            
            // Set appropriate zoom level for TV
            if (tvMode) {
                // Optimized for 4K 50 inch TV
                const zoomLevel = width >= 3840 ? 1.2 : 0.9; // Larger for 4K, smaller for HD
                setZoomLevel(zoomLevel);
                console.log(`📺 TV Mode activated - Zoom set to ${zoomLevel} for ${width}x${height}`);
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
            // Small delay to ensure component is mounted
            const timer = setTimeout(() => {
                toggleFullscreen();
                console.log('📺 Auto-entering fullscreen for TV mode');
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
        console.log('🔄 Manual refresh triggered');
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

    // Calculate resolution time by team and app
    const calculateResolutionByTeamAndApp = (cards) => {
        const teamStats = new Map();
        const appStats = new Map();
        
        // Initialize team stats
        const productTeams = Array.from(new Set(appData.map(app => app.product_team))).filter(Boolean);
        productTeams.forEach(team => {
            teamStats.set(team, {
                team: team,
                totalTime: 0,
                cardCount: 0,
                avgTime: 0
            });
        });
        
        // Initialize app stats
        appData.forEach(app => {
            appStats.set(app.app_name, {
                app: app.app_name,
                team: app.product_team,
                totalTime: 0,
                cardCount: 0,
                avgTime: 0
            });
        });
        
        // Process each card
        cards.forEach(card => {
            if (!card.resolutionTime || card.resolutionTime <= 0) return;
            
            // Get apps from card labels and group by team
            if (card.labels && card.labels.length > 0) {
                const cardApps = [];
                card.labels.forEach(label => {
                    if (label.startsWith("App:")) {
                        const appName = label.replace("App:", "").trim();
                        cardApps.push(appName);
                        
                        // Update app stats
                        if (appStats.has(appName)) {
                            const appStat = appStats.get(appName);
                            appStat.totalTime += card.resolutionTime;
                            appStat.cardCount += 1;
                        }
                    }
                });
                
                // Group apps by their product_team and update team stats
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
                
                // Update team stats for each team that has apps in this card
                Object.keys(teamAppMap).forEach(team => {
                    if (teamStats.has(team)) {
                        const teamStat = teamStats.get(team);
                        teamStat.totalTime += card.resolutionTime;
                        teamStat.cardCount += 1;
                    }
                });
            }
        });
        
        // Calculate averages
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

    // Calculate agent leaderboard (same as RevolutionTime.js)
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
        
        const leaderboardColumns = [
            {
                title: 'Rank',
                key: 'rank',
                width: 80,
                render: (_, record, index) => {
                    let color = 'default';
                    let icon = null;
                    
                    if (index === 0) {
                        color = 'gold';
                        icon = <TrophyOutlined />;
                    } else if (index === 1) {
                        color = 'silver';
                        icon = <StarOutlined />;
                    } else if (index === 2) {
                        color = 'bronze';
                        icon = <FireOutlined />;
                    }

                    return (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 800, 
                            fontSize: '1.2rem',
                            color: index < 3 ? '#f59e0b' : '#64748b'
                        }}>
                            {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
                            #{index + 1}
                        </div>
                    );
                }
            },
            {
                title: 'Member',
                dataIndex: 'name',
                key: 'name',
                render: (text) => (
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: '1rem',
                        color: '#1e293b'
                    }}>
                        {text}
                    </div>
                )
            },
            {
                title: 'Cards',
                dataIndex: 'cardCount',
                key: 'cardCount',
                width: 80,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1.1rem',
                        color: '#3b82f6',
                        textAlign: 'center'
                    }}>
                        {value}
                    </div>
                )
            },
            {
                title: 'Avg Resolution',
                dataIndex: 'avgResolutionTime',
                key: 'avgResolutionTime',
                width: 120,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        color: '#3b82f6'
                    }}>
                        {formatMinutes(value)}
                    </div>
                )
            },
            {
                title: 'Avg First Action',
                dataIndex: 'avgFirstActionTime',
                key: 'avgFirstActionTime',
                width: 120,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        color: '#6366f1'
                    }}>
                        {formatMinutes(value)}
                    </div>
                )
            },
            {
                title: 'Avg TS Done',
                dataIndex: 'avgResolutionTimeTS',
                key: 'avgResolutionTimeTS',
                width: 120,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        color: '#0ea5e9'
                    }}>
                        {formatMinutes(value)}
                    </div>
                )
            }
        ];

        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                padding: isTVMode ? '40px' : '30px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                position: 'relative'
            }}>
                {/* Main Content - Vertical Layout */}
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isTVMode ? '25px' : '20px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Top Section - Stats Row */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '16px',
                        padding: isTVMode ? '20px' : '15px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                        <Title level={2} style={{ 
                            color: '#1e293b', 
                            marginBottom: isTVMode ? '20px' : '15px',
                            fontSize: isTVMode ? '1.4rem' : '1.2rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            margin: '0 0 20px 0'
                        }}>
                            <TrophyOutlined style={{ marginRight: 8, color: '#475569', fontSize: isTVMode ? '1.2rem' : '1rem' }} />
                            Performance Overview
                        </Title>
                        
                        <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: isTVMode ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: isTVMode ? '20px' : '15px'
                        }}>
                            <div style={{ 
                                background: 'rgba(248, 250, 252, 0.6)',
                                borderRadius: isTVMode ? '12px' : '10px',
                                padding: isTVMode ? '20px' : '15px',
                                textAlign: 'center',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(226, 232, 240, 0.5)'
                            }}>
                                <Statistic
                                    title="Total Cards Resolved"
                                    value={resolutionData.length}
                                    valueStyle={{ 
                                        color: '#3b82f6', 
                                        fontSize: isTVMode ? '2rem' : '1.8rem', 
                                        fontWeight: 800
                                    }}
                                    prefix={<CheckCircleOutlined style={{ marginRight: 8, color: '#3b82f6', fontSize: isTVMode ? '1.2rem' : '1rem' }} />}
                                />
                            </div>
                            
                            <div style={{ 
                                background: 'rgba(248, 250, 252, 0.6)',
                                borderRadius: isTVMode ? '12px' : '10px',
                                padding: isTVMode ? '20px' : '15px',
                                textAlign: 'center',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(226, 232, 240, 0.5)'
                            }}>
                                <Statistic
                                    title="Average Resolution Time"
                                    value={formatMinutes(avgResolutionTime)}
                                    valueStyle={{ 
                                        color: '#10b981', 
                                        fontSize: isTVMode ? '2rem' : '1.8rem', 
                                        fontWeight: 800
                                    }}
                                    prefix={<ClockCircleOutlined style={{ marginRight: 8, color: '#10b981', fontSize: isTVMode ? '1.2rem' : '1rem' }} />}
                                />
                            </div>

                            <div style={{ 
                                background: 'rgba(248, 250, 252, 0.6)',
                                borderRadius: isTVMode ? '12px' : '10px',
                                padding: isTVMode ? '20px' : '15px',
                                textAlign: 'center',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(226, 232, 240, 0.5)'
                            }}>
                                <Statistic
                                    title="Active TS Members"
                                    value={agentLeaderboard.length}
                                    valueStyle={{ 
                                        color: '#f59e0b', 
                                        fontSize: isTVMode ? '2rem' : '1.8rem', 
                                        fontWeight: 800
                                    }}
                                    prefix={<TeamOutlined style={{ marginRight: 8, color: '#f59e0b', fontSize: isTVMode ? '1.2rem' : '1rem' }} />}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Section */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '25px',
                        backdropFilter: 'blur(15px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Title level={2} style={{ 
                            color: '#1e293b', 
                            marginBottom: 20,
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            margin: '0 0 20px 0'
                        }}>
                            <TrophyOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
                            TS Performance Leaderboard ({agentLeaderboard.length} members)
                        </Title>
                        
                        <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
                            {agentLeaderboard.length > 0 ? (
                                <Table
                                    columns={leaderboardColumns}
                                    dataSource={agentLeaderboard}
                                    pagination={false}
                                    size="middle"
                                    rowKey="name"
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '40px',
                                    color: '#64748b',
                                    fontSize: '1.1rem'
                                }}>
                                    <TrophyOutlined style={{ fontSize: '2rem', marginBottom: '16px' }} />
                                    <div>No resolution data available for this month</div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                        Data will appear when TS members complete cards
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
        
        const teamColumns = [
            {
                title: 'Team',
                dataIndex: 'team',
                key: 'team',
                render: (text) => (
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: '1rem',
                        color: '#1e293b'
                    }}>
                        {text}
                    </div>
                )
            },
            {
                title: 'Cards',
                dataIndex: 'cardCount',
                key: 'cardCount',
                width: 80,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1.1rem',
                        color: '#3b82f6',
                        textAlign: 'center'
                    }}>
                        {value}
                    </div>
                )
            },
            {
                title: 'AVG Resolution Time',
                dataIndex: 'avgTime',
                key: 'avgTime',
                width: 150,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '1rem',
                        color: '#10b981'
                    }}>
                        {formatMinutes(value)}
                    </div>
                )
            }
        ];

        const appColumns = [
            {
                title: 'App',
                dataIndex: 'app',
                key: 'app',
                width: 110,
                render: (text) => (
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: '0.8rem',
                        color: '#1e293b',
                        lineHeight: '1.1'
                    }}>
                        {text}
                    </div>
                )
            },
            {
                title: 'Team',
                dataIndex: 'team',
                key: 'team',
                width: 70,
                render: (text) => (
                    <div style={{ 
                        fontWeight: 500, 
                        fontSize: '0.7rem',
                        color: '#64748b'
                    }}>
                        {text}
                    </div>
                )
            },
            {
                title: 'Cards',
                dataIndex: 'cardCount',
                key: 'cardCount',
                width: 50,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '0.8rem',
                        color: '#3b82f6',
                        textAlign: 'center'
                    }}>
                        {value}
                    </div>
                )
            },
            {
                title: 'AVG Time',
                dataIndex: 'avgTime',
                key: 'avgTime',
                width: 90,
                render: (value) => (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: '0.75rem',
                        color: '#10b981'
                    }}>
                        {formatMinutes(value)}
                    </div>
                )
            }
        ];

        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                padding: '30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative'
            }}>
                {/* Header Section */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px',
                    padding: '25px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(15px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <Title level={1} style={{ 
                        color: '#1e293b', 
                        marginBottom: 12,
                        fontSize: isTVMode ? '1.8rem' : '2.2rem',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        <BarChartOutlined style={{ marginRight: 12, color: '#667eea', fontSize: isTVMode ? '1.4rem' : '1.8rem' }} />
                        Resolution Time Analysis
                    </Title>
                    <Paragraph style={{ 
                        fontSize: isTVMode ? '1rem' : '1.2rem', 
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        Performance by Team & App - This Month
                    </Paragraph>
                </div>

                {/* Main Content */}
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr',
                    gap: '25px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Team Analysis */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '25px',
                        backdropFilter: 'blur(15px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Title level={2} style={{ 
                            color: '#1e293b', 
                            marginBottom: 20,
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            margin: '0 0 20px 0'
                        }}>
                            <TeamOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
                            By Product Team ({analysisData.teams.length} teams)
                        </Title>
                        
                        <div style={{ flex: '1 1 auto' }}>
                            {analysisData.teams.length > 0 ? (
                                <Table
                                    columns={teamColumns}
                                    dataSource={analysisData.teams}
                                    pagination={false}
                                    size="middle"
                                    rowKey="team"
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '40px',
                                    color: '#64748b',
                                    fontSize: '1.1rem'
                                }}>
                                    <TeamOutlined style={{ fontSize: '2rem', marginBottom: '16px' }} />
                                    <div>No team data available</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* App Analysis */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '16px',
                        padding: '25px',
                        backdropFilter: 'blur(15px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Title level={2} style={{ 
                            color: '#1e293b', 
                            marginBottom: 20,
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            margin: '0 0 20px 0'
                        }}>
                            <BarChartOutlined style={{ marginRight: 8, color: '#10b981' }} />
                            By App ({analysisData.apps.length} apps)
                        </Title>
                        
                        <div style={{ flex: '1 1 auto' }}>
                            {analysisData.apps.length > 0 ? (
                                <Table
                                    columns={appColumns}
                                    dataSource={analysisData.apps}
                                    pagination={false}
                                    size="small"
                                    rowKey="app"
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '40px',
                                    color: '#64748b',
                                    fontSize: '1.1rem'
                                }}>
                                    <BarChartOutlined style={{ fontSize: '2rem', marginBottom: '16px' }} />
                                    <div>No app data available</div>
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
        
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                padding: isTVMode ? '40px' : '30px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                position: 'relative'
            }}>
                {/* Header Section */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: isTVMode ? '40px' : '30px'
                }}>
                    <Title level={1} style={{ 
                        color: '#1e293b', 
                        marginBottom: 12,
                        fontSize: isTVMode ? '2.5rem' : '2.2rem',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        <TeamOutlined style={{ marginRight: 12, color: '#475569', fontSize: isTVMode ? '2rem' : '1.8rem' }} />
                        Team Performance Overview
                    </Title>
                    <Paragraph style={{ 
                        fontSize: isTVMode ? '1.2rem' : '1rem', 
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        Cards waiting for developer fixes by Product Team
                    </Paragraph>
                </div>

                {/* Main Content */}
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isTVMode ? '20px' : '15px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Top Section - Total Cards & Team Workload */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '16px',
                        padding: isTVMode ? '20px' : '15px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}>
                        <div style={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: isTVMode ? '20px' : '15px'
                        }}>
                            {/* Total Cards - Small in top left */}
                            <div style={{ 
                                background: 'rgba(248, 250, 252, 0.8)',
                                borderRadius: isTVMode ? '12px' : '10px',
                                padding: isTVMode ? '15px' : '12px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(226, 232, 240, 0.5)',
                                minWidth: isTVMode ? '180px' : '150px',
                                textAlign: 'center'
                            }}>
                                <Statistic
                                    title="Total Cards"
                                    value={realStats.totalCards}
                                    valueStyle={{ 
                                        color: '#1e293b', 
                                        fontSize: isTVMode ? '1.8rem' : '1.5rem', 
                                        fontWeight: 800
                                    }}
                                    prefix={<TeamOutlined style={{ marginRight: 6, color: '#475569', fontSize: isTVMode ? '1.2rem' : '1rem' }} />}
                                />
                            </div>

                            {/* Team Workload - Takes remaining space */}
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: isTVMode ? 'repeat(5, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: isTVMode ? '10px' : '8px'
                                }}>
                                    {teamEntries.map(([team, count], index) => {
                                        const percentage = teamEntries.length > 0 ? Math.round((count / teamEntries.reduce((sum, [, c]) => sum + c, 0)) * 100) : 0;
                                        
                                        return (
                                            <div key={team} style={{ 
                                                background: 'rgba(248, 250, 252, 0.6)',
                                                borderRadius: isTVMode ? '12px' : '10px',
                                                padding: isTVMode ? '12px' : '10px',
                                                textAlign: 'center',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                border: '1px solid rgba(226, 232, 240, 0.5)',
                                                transition: 'all 0.3s ease',
                                                cursor: 'pointer',
                                                minHeight: isTVMode ? '80px' : '70px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                            }}>
                                                <div style={{ 
                                                    fontWeight: 800, 
                                                    color: '#1e293b', 
                                                    fontSize: isTVMode ? '1.8rem' : '1.5rem',
                                                    marginBottom: '4px'
                                                }}>
                                                    {count}
                                                </div>
                                                <div style={{ 
                                                    color: '#475569', 
                                                    fontSize: isTVMode ? '0.9rem' : '0.8rem',
                                                    fontWeight: 600,
                                                    marginBottom: '2px'
                                                }}>
                                                    {team}
                                                </div>
                                                <div style={{ 
                                                    color: '#64748b', 
                                                    fontSize: isTVMode ? '0.7rem' : '0.6rem',
                                                    fontWeight: 500,
                                                    background: 'rgba(226, 232, 240, 0.5)',
                                                    padding: '2px 4px',
                                                    borderRadius: '4px',
                                                    display: 'inline-block'
                                                }}>
                                                    {percentage}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section - Apps */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '16px',
                        padding: isTVMode ? '20px' : '15px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        maxHeight: isTVMode ? '400px' : 'none',
                        overflow: 'auto'
                    }}>
                        <Title level={3} style={{ 
                            color: '#1e293b', 
                            marginBottom: isTVMode ? '15px' : '10px',
                            fontSize: isTVMode ? '1.2rem' : '1rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            margin: '0 0 15px 0'
                        }}>
                            <BarChartOutlined style={{ marginRight: 6, color: '#475569' }} />
                            Applications ({appData.length} apps)
                        </Title>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: isTVMode ? 'repeat(6, 1fr)' : 'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: isTVMode ? '10px' : '8px'
                        }}>
                            {appData.map((app, index) => {
                                // Calculate cards count for this app using same logic as DevFixing.js
                                const appCardsCount = waitingToFixCards.filter(card => {
                                    if (!card.labels || !Array.isArray(card.labels)) return false;
                                    
                                    // Find app label (same logic as DevFixing.js)
                                    const appLabel = card.labels.find(label => label.name && label.name.includes('App:'));
                                    
                                    if (appLabel) {
                                        // Extract app name from label (same as DevFixing.js)
                                        const appKey = appLabel.name.replace('App:', '').trim().toLowerCase();
                                        return appKey === app.app_name.toLowerCase();
                                    }
                                    
                                    return false;
                                }).length;
                                
                                console.log(`App ${app.app_name}: ${appCardsCount} cards found`);
                                
                                // Only show apps that have cards
                                if (appCardsCount === 0) return null;
                                
                                return (
                                    <div key={app.app_name} style={{ 
                                        background: 'rgba(248, 250, 252, 0.8)',
                                        borderRadius: isTVMode ? '10px' : '8px',
                                        padding: isTVMode ? '12px' : '10px',
                                        textAlign: 'center',
                                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid rgba(226, 232, 240, 0.5)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        minHeight: isTVMode ? '70px' : '60px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.05)';
                                    }}>
                                        <div style={{ 
                                            color: '#1e293b', 
                                            fontSize: isTVMode ? '1.3rem' : '1.1rem',
                                            fontWeight: 800,
                                            marginBottom: '4px'
                                        }}>
                                            {appCardsCount}
                                        </div>
                                        <div style={{ 
                                            color: '#475569', 
                                            fontSize: isTVMode ? '0.7rem' : '0.6rem',
                                            fontWeight: 600,
                                            lineHeight: '1.1',
                                            marginBottom: '2px'
                                        }}>
                                            {app.app_name}
                                        </div>
                                        <div style={{ 
                                            color: '#64748b', 
                                            fontSize: isTVMode ? '0.6rem' : '0.5rem',
                                            fontWeight: 500,
                                            background: 'rgba(226, 232, 240, 0.5)',
                                            padding: '1px 4px',
                                            borderRadius: '4px',
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Slide Content */}
            <div style={{ 
                width: '100%', 
                height: '100%',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: isTVMode ? '20px' : '20px',
                margin: isTVMode ? '20px' : '16px',
                width: isTVMode ? 'calc(100% - 40px)' : 'calc(100% - 32px)',
                height: isTVMode ? 'calc(100% - 40px)' : 'calc(100% - 32px)',
                overflow: 'hidden',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center'
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
                                    console.log('📺 TV Mode disabled');
                                } else {
                                    setIsTVMode(true);
                                    // Set appropriate zoom for current screen size
                                    const width = window.innerWidth;
                                    const zoomLevel = width >= 3840 ? 1.2 : 0.9;
                                    setZoomLevel(zoomLevel);
                                    console.log(`📺 TV Mode activated - Zoom set to ${zoomLevel}`);
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
