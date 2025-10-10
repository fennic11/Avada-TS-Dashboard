import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, Alert, Button, Space, Divider, Progress, Table, Avatar, message } from 'antd';
import { getResolutionTimes, getCardsOnTrello } from '../api/cardsApi';
import appData from '../data/app.json';
import membersData from '../data/members.json';
import { 
    TeamOutlined, 
    ClockCircleOutlined, 
    CheckCircleOutlined, 
    ExclamationCircleOutlined,
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

const mockAppData = [
    { name: 'SEO', cards: 89, avgTime: 145 },
    { name: 'Blog', cards: 67, avgTime: 178 },
    { name: 'Joy', cards: 123, avgTime: 165 },
    { name: 'Chatty', cards: 98, avgTime: 192 },
    { name: 'AEM', cards: 76, avgTime: 203 },
    { name: 'Bundle', cards: 54, avgTime: 156 }
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

// Create chart data for resolution time distribution
function createChartData(stats) {
    return [
        { name: '< 1h', value: stats.under1h, color: '#10b981' },
        { name: '1h-12h', value: stats.oneTo12h, color: '#f59e0b' },
        { name: '12h-24h', value: stats.twelveTo24h, color: '#ef4444' },
        { name: '> 24h', value: stats.over24h, color: '#8b5cf6' }
    ].filter(item => item.value > 0);
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

    // Define slides
    const slides = [
        { id: 'overview', title: 'Waiting to Fix', duration: 10000 },
        { id: 'team-stats', title: 'Team Statistics', duration: 10000 },
        { id: 'resolution-analysis', title: 'Resolution Analysis', duration: 10000 }
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
            const isTVResolution = (width >= 1920 && height >= 1080) || // Full HD
                                  (width >= 1366 && height >= 768) ||   // HD
                                  (width >= 1280 && height >= 720);     // HD Ready
            
            // Detect large screen (likely TV)
            const isLargeScreen = width >= 1920 || height >= 1080;
            
            const tvMode = isRedmiTV || (isTVResolution && isLargeScreen);
            
            console.log('📺 TV Detection:', {
                width, height, userAgent,
                isRedmiTV, isTVResolution, isLargeScreen,
                tvMode
            });
            
            setIsTVMode(tvMode);
            
            // Set appropriate zoom level for TV
            if (tvMode) {
                setZoomLevel(0.7); // Reduce zoom for TV
                console.log('📺 TV Mode activated - Zoom set to 0.7');
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

    const chartData = createChartData(mockStats);

    // Slide components
    const renderOverviewSlide = () => {
        const teamColors = [
            { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#667eea', border: '#667eea' },
            { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#f5576c', border: '#f5576c' },
            { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#4facfe', border: '#4facfe' },
            { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#43e97b', border: '#43e97b' },
            { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#fa709a', border: '#fa709a' },
            { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#a8edea', border: '#a8edea' }
        ];
        
        const teamEntries = Object.entries(teamStats).sort((a, b) => b[1] - a[1]);
        
        // Fallback data if no team stats yet
        const fallbackTeamStats = {
            'Falcon': 0,
            'Starlink': 0,
            'Tesla': 0,
            'Solar': 0,
            'Team X': 0
        };
        
        const displayTeamStats = Object.keys(teamStats).length > 0 ? teamStats : fallbackTeamStats;
        const displayTeamEntries = Object.entries(displayTeamStats).sort((a, b) => b[1] - a[1]);
        
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
                    marginBottom: '30px',
                    padding: '25px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(15px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    {/* Title Section */}
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <Title level={1} style={{ 
                            color: '#1e293b', 
                            marginBottom: 12,
                            fontSize: isTVMode ? '1.8rem' : '2.2rem',
                            fontWeight: 700,
                            margin: 0
                        }}>
                            <TeamOutlined style={{ marginRight: 12, color: '#667eea', fontSize: isTVMode ? '1.4rem' : '1.8rem' }} />
                            Waiting to Fix (from Dev)
                        </Title>
                        <Paragraph style={{ 
                            fontSize: isTVMode ? '1rem' : '1.2rem', 
                            color: '#64748b',
                            margin: '8px 0 0 0',
                            fontWeight: 500
                        }}>
                            Cards waiting for developer fixes by Product Team
                        </Paragraph>
                    </div>

                    {/* Stats Section */}
                    <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: isTVMode ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: isTVMode ? '15px' : '20px',
                        maxWidth: isTVMode ? '800px' : '600px',
                        margin: '0 auto'
                    }}>
                        <Card style={{ 
                            borderRadius: '12px', 
                            padding: '20px',
                            background: 'rgba(102, 126, 234, 0.1)',
                            border: '2px solid rgba(102, 126, 234, 0.2)',
                            textAlign: 'center'
                        }}>
                            <Statistic
                                title="Total Cards Waiting"
                                value={realStats.totalCards}
                                valueStyle={{ 
                                    color: '#667eea', 
                                    fontSize: '2rem', 
                                    fontWeight: 800
                                }}
                                prefix={<TeamOutlined style={{ marginRight: 8, color: '#667eea', fontSize: '1.2rem' }} />}
                            />
                        </Card>
                        
                        <Card style={{ 
                            borderRadius: '12px', 
                            padding: '20px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '2px solid rgba(59, 130, 246, 0.2)',
                            textAlign: 'center'
                        }}>
                            <Statistic
                                title="Teams Involved"
                                value={Object.keys(displayTeamStats).length}
                                valueStyle={{ 
                                    color: '#3b82f6', 
                                    fontSize: '2rem', 
                                    fontWeight: 800
                                }}
                                prefix={<TeamOutlined style={{ marginRight: 8, color: '#3b82f6', fontSize: '1.2rem' }} />}
                            />
                        </Card>
                    </div>
                </div>

                {/* Main Content - Team Statistics Only */}
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    padding: '25px',
                    backdropFilter: 'blur(15px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    <Title level={2} style={{ 
                        color: '#1e293b', 
                        marginBottom: 20,
                        fontSize: isTVMode ? '1.4rem' : '1.8rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        margin: '0 0 25px 0'
                    }}>
                        Team Statistics
                    </Title>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isTVMode ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: isTVMode ? '15px' : '20px',
                        flex: '1 1 auto',
                        overflow: 'auto'
                    }}>
                        {displayTeamEntries.map(([team, count], index) => (
                            <div key={team} style={{ 
                                background: teamColors[index % teamColors.length].bg,
                                borderRadius: isTVMode ? '8px' : '12px',
                                padding: isTVMode ? '16px' : '24px',
                                textAlign: 'center',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                                border: `2px solid ${teamColors[index % teamColors.length].border}40`,
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                minHeight: isTVMode ? '100px' : '140px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                            }}>
                                <div style={{ 
                                    position: 'absolute',
                                    top: '-30%',
                                    right: '-30%',
                                    width: '60%',
                                    height: '60%',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '50%',
                                    transform: 'rotate(45deg)'
                                }} />
                                <div style={{ 
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                    <div style={{ 
                                        fontWeight: 800, 
                                        color: 'white', 
                                        fontSize: isTVMode ? '2rem' : '2.5rem',
                                        marginBottom: '8px',
                                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {count}
                                    </div>
                                    <div style={{ 
                                        color: 'white', 
                                        fontSize: isTVMode ? '0.9rem' : '1.1rem',
                                        fontWeight: 600,
                                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {team}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {loading && (
                    <div style={{ 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '20px',
                        borderRadius: '12px',
                        backdropFilter: 'blur(15px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
                    }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 10, color: '#64748b', fontSize: '1.1rem' }}>
                            Loading real-time data...
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMetricsSlide = () => (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            padding: '20px'
        }}>
            <Title level={1} style={{ 
                color: '#1e293b', 
                textAlign: 'center',
                marginBottom: 40,
                fontSize: '3rem',
                fontWeight: 800
            }}>
                Waiting to Fix - Key Metrics
            </Title>
            <Row gutter={[24, 24]} style={{ flex: '1 1 auto' }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ 
                        borderRadius: 20, 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Statistic
                            title="Total Cards Waiting"
                            value={realStats.totalCards}
                            valueStyle={{ 
                                color: '#667eea', 
                                fontSize: '3rem', 
                                fontWeight: 800
                            }}
                            prefix={<TeamOutlined style={{ marginRight: 12, color: '#667eea', fontSize: '2rem' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ 
                        borderRadius: 20, 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Statistic
                            title="AVG Resolution Time"
                            value={formatMinutes(realStats.avgResolutionTime)}
                            valueStyle={{ 
                                color: '#3b82f6', 
                                fontSize: '2.5rem', 
                                fontWeight: 700
                            }}
                            prefix={<ClockCircleOutlined style={{ marginRight: 12, color: '#3b82f6', fontSize: '2rem' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ 
                        borderRadius: 20, 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Statistic
                            title="AVG First Action Time"
                            value={formatMinutes(realStats.avgFirstActionTime)}
                            valueStyle={{ 
                                color: '#10b981', 
                                fontSize: '2.5rem', 
                                fontWeight: 700
                            }}
                            prefix={<CheckCircleOutlined style={{ marginRight: 12, color: '#10b981', fontSize: '2rem' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card style={{ 
                        borderRadius: 20, 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Statistic
                            title="AVG Dev Resolution Time"
                            value={formatMinutes(realStats.avgResolutionTimeDev)}
                            valueStyle={{ 
                                color: '#f59e0b', 
                                fontSize: '2.5rem', 
                                fontWeight: 700
                            }}
                            prefix={<ExclamationCircleOutlined style={{ marginRight: 12, color: '#f59e0b', fontSize: '2rem' }} />}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );

    const renderTeamPerformanceSlide = () => (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            padding: '20px'
        }}>
            <Title level={1} style={{ 
                color: '#1e293b', 
                textAlign: 'center',
                marginBottom: 40,
                fontSize: '3rem',
                fontWeight: 800
            }}>
                Team Performance Analysis
            </Title>
            <div style={{ flex: '1 1 auto', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockTeamData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={16} />
                        <YAxis fontSize={16} />
                        <Tooltip 
                            formatter={(value, name) => [
                                name === 'resolutionTime' ? formatMinutes(value) : value,
                                name === 'resolutionTime' ? 'Resolution Time' : 
                                name === 'firstActionTime' ? 'First Action Time' :
                                name === 'devTime' ? 'Dev Time' : 'Cards'
                            ]}
                        />
                        <Bar dataKey="resolutionTime" fill="#667eea" name="resolutionTime" />
                        <Bar dataKey="firstActionTime" fill="#10b981" name="firstActionTime" />
                        <Bar dataKey="devTime" fill="#f59e0b" name="devTime" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const renderDistributionSlide = () => (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            padding: '20px'
        }}>
            <Title level={1} style={{ 
                color: '#1e293b', 
                textAlign: 'center',
                marginBottom: 40,
                fontSize: '3rem',
                fontWeight: 800
            }}>
                Resolution Time Distribution
            </Title>
            <div style={{ flex: '1 1 auto', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={150}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

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
                        <TrophyOutlined style={{ marginRight: 12, color: '#f59e0b', fontSize: isTVMode ? '1.4rem' : '1.8rem' }} />
                        TS Team Leaderboard
                    </Title>
                    <Paragraph style={{ 
                        fontSize: isTVMode ? '1rem' : '1.2rem', 
                        color: '#64748b',
                        margin: '8px 0 0 0',
                        fontWeight: 500
                    }}>
                        Performance Analysis - This Month
                    </Paragraph>
                </div>

                {/* Main Content */}
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '25px',
                    flex: '1 1 auto',
                    minHeight: 0
                }}>
                    {/* Stats Section */}
                    <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <Card style={{ 
                            borderRadius: '16px', 
                            padding: '25px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(15px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            textAlign: 'center'
                        }}>
                            <Statistic
                                title="Total Cards Resolved"
                                value={resolutionData.length}
                                valueStyle={{ 
                                    color: '#3b82f6', 
                                    fontSize: '2.2rem', 
                                    fontWeight: 800
                                }}
                                prefix={<CheckCircleOutlined style={{ marginRight: 10, color: '#3b82f6', fontSize: '1.3rem' }} />}
                            />
                        </Card>
                        
                        <Card style={{ 
                            borderRadius: '16px', 
                            padding: '25px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(15px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            textAlign: 'center'
                        }}>
                            <Statistic
                                title="AVG Resolution Time"
                                value={formatMinutes(avgResolutionTime)}
                                valueStyle={{ 
                                    color: '#10b981', 
                                    fontSize: '2.2rem', 
                                    fontWeight: 800
                                }}
                                prefix={<ClockCircleOutlined style={{ marginRight: 10, color: '#10b981', fontSize: '1.3rem' }} />}
                            />
                        </Card>

                        <Card style={{ 
                            borderRadius: '16px', 
                            padding: '25px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(15px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            textAlign: 'center'
                        }}>
                            <Statistic
                                title="Active TS Members"
                                value={agentLeaderboard.length}
                                valueStyle={{ 
                                    color: '#f59e0b', 
                                    fontSize: '2.2rem', 
                                    fontWeight: 800
                                }}
                                prefix={<TeamOutlined style={{ marginRight: 10, color: '#f59e0b', fontSize: '1.3rem' }} />}
                            />
                        </Card>
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

    const renderCurrentSlide = () => {
        switch (slides[currentSlide].id) {
            case 'overview':
                return renderOverviewSlide();
            case 'team-stats':
                return renderResolutionSlide();
            case 'resolution-analysis':
                return renderResolutionAnalysisSlide();
            default:
                return renderOverviewSlide();
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
                borderRadius: isTVMode ? '10px' : '20px',
                margin: isTVMode ? '8px' : '16px',
                width: isTVMode ? 'calc(100% - 16px)' : 'calc(100% - 32px)',
                height: isTVMode ? 'calc(100% - 16px)' : 'calc(100% - 32px)',
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
                                    setZoomLevel(0.7);
                                    console.log('📺 TV Mode activated');
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
