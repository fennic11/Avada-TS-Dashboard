import React from 'react';
import { 
    Box, 
    Paper, 
    Typography, 
    Avatar, 
    Grid,
    Card,
    CardContent,
    LinearProgress,
    useTheme,
    alpha
} from '@mui/material';
import members from '../data/members.json';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme, rank }) => ({
    position: 'relative',
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: theme.shadows[8],
    },
    background: rank <= 3 
        ? `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.1)})`
        : 'white',
    border: rank <= 3 ? `2px solid ${theme.palette.primary.main}` : 'none',
}));

const RankBadge = styled(Box)(({ theme, rank }) => ({
    position: 'absolute',
    top: -15,
    right: -15,
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: 'white',
    background: rank === 1 
        ? '#FFD700' // Gold
        : rank === 2 
            ? '#C0C0C0' // Silver
            : rank === 3 
                ? '#CD7F32' // Bronze
                : theme.palette.primary.main,
    boxShadow: theme.shadows[3],
}));

const Leaderboard = () => {
    const theme = useTheme();
    const tsMembers = members.filter(member => member.role === 'TS');
    
    const sortedMembers = tsMembers.map(member => ({
        ...member,
        points: Math.floor(Math.random() * 100)
    })).sort((a, b) => b.points - a.points);

    const maxPoints = Math.max(...sortedMembers.map(m => m.points));

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Typography 
                variant="h4" 
                gutterBottom 
                sx={{ 
                    textAlign: 'center',
                    mb: 4,
                    fontWeight: 'bold',
                    color: theme.palette.primary.main,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                TS Team Leaderboard
            </Typography>

            <Grid container spacing={3}>
                {sortedMembers.map((member, index) => (
                    <Grid item xs={12} md={6} lg={4} key={member.id}>
                        <StyledCard rank={index + 1}>
                            <RankBadge rank={index + 1}>
                                {index + 1}
                            </RankBadge>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar 
                                        src={member.avatarUrl} 
                                        alt={member.fullName}
                                        sx={{ 
                                            width: 60, 
                                            height: 60,
                                            border: `3px solid ${theme.palette.primary.main}`,
                                            boxShadow: theme.shadows[3]
                                        }}
                                    >
                                        {member.initials}
                                    </Avatar>
                                    <Box sx={{ ml: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            {member.fullName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {member.kpiName}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Points
                                        </Typography>
                                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                            {member.points}
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={(member.points / maxPoints) * 100}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 4,
                                                backgroundColor: theme.palette.primary.main,
                                            }
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </StyledCard>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Leaderboard;