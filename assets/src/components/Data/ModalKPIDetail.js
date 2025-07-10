import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    Button,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider,
    Link,
    Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WorkIcon from '@mui/icons-material/Work';
import BugReportIcon from '@mui/icons-material/BugReport';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';

const ModalKPIDetail = ({ open, onClose, kpiData }) => {
    if (!kpiData) return null;

    const { member, shiftDetails, bugCardDetails, issueCardDetails, shiftKpi, bugKpi, issueKpi, totalKpi } = kpiData;

    // Group shifts by shift name
    const shiftSummary = shiftDetails.reduce((acc, shift) => {
        if (!acc[shift.shiftName]) {
            acc[shift.shiftName] = { count: 0, totalPoints: 0, rate: shift.rate };
        }
        acc[shift.shiftName].count += 1;
        acc[shift.shiftName].totalPoints += shift.rate;
        return acc;
    }, {});

    // Group issue cards by label
    const issueSummary = {};
    issueCardDetails.forEach(card => {
        card.labels.forEach(label => {
            if (!issueSummary[label.name]) {
                issueSummary[label.name] = { count: 0, totalPoints: 0, rate: label.rate };
            }
            issueSummary[label.name].count += 1;
            issueSummary[label.name].totalPoints += label.rate;
        });
    });

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Chi tiết KPI - {member.fullName}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {member.email}
                    </Typography>
                </Box>
                <Button
                    onClick={onClose}
                    sx={{ color: 'white', minWidth: 'auto' }}
                >
                    <CloseIcon />
                </Button>
            </DialogTitle>

            <DialogContent sx={{ p: 3, marginTop: 3 }}>
                <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid item xs={12}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ 
                                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                    color: 'white'
                                }}>
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <WorkIcon sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {shiftKpi.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2">KPI Ca trực</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ 
                                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                    color: 'white'
                                }}>
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <BugReportIcon sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {bugKpi.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2">KPI Bugs</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ 
                                    background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                    color: 'white'
                                }}>
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {issueKpi.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2">KPI Issues</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ 
                                    background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                                    color: 'white'
                                }}>
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <PersonIcon sx={{ fontSize: 40, mb: 1 }} />
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {totalKpi.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2">Tổng KPI</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Shift Details */}
                    {shiftDetails.length > 0 && (
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#3498db' }}>
                                        <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Chi tiết Ca trực
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Ca</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Rate/Ca</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Tổng</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(shiftSummary).map(([shiftName, data]) => (
                                                    <TableRow key={shiftName}>
                                                        <TableCell>{shiftName}</TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={data.count} color="primary" size="small" />
                                                        </TableCell>
                                                        <TableCell align="center">{data.rate.toLocaleString()}</TableCell>
                                                        <TableCell align="center">
                                                            <Typography sx={{ fontWeight: 'bold', color: '#3498db' }}>
                                                                {data.totalPoints.toLocaleString()}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Issue Summary */}
                    {Object.keys(issueSummary).length > 0 && (
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#f39c12' }}>
                                        <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Chi tiết Issues theo Level
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Level</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Rate/Label</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Tổng</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(issueSummary).map(([labelName, data]) => (
                                                    <TableRow key={labelName}>
                                                        <TableCell>
                                                            <Chip label={labelName} color="warning" size="small" />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={data.count} color="warning" variant="outlined" size="small" />
                                                        </TableCell>
                                                        <TableCell align="center">{data.rate.toLocaleString()}</TableCell>
                                                        <TableCell align="center">
                                                            <Typography sx={{ fontWeight: 'bold', color: '#f39c12' }}>
                                                                {data.totalPoints.toLocaleString()}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Bug Cards Details */}
                    {bugCardDetails.length > 0 && (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#e74c3c' }}>
                                        <BugReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Chi tiết Bug Cards ({bugCardDetails.length} cards)
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Tên Card</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Số Member</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Điểm</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Members</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {bugCardDetails.map((card, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Link 
                                                                href={card.cardUrl} 
                                                                target="_blank" 
                                                                rel="noopener"
                                                                sx={{ textDecoration: 'none', color: '#667eea' }}
                                                            >
                                                                {card.cardName}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip 
                                                                label={card.memberCount} 
                                                                color={card.memberCount === 1 ? "success" : "warning"}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography sx={{ 
                                                                fontWeight: 'bold', 
                                                                color: card.points === 20 ? '#27ae60' : '#f39c12'
                                                            }}>
                                                                {card.points}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                {card.members.map((member, idx) => (
                                                                    <Chip 
                                                                        key={idx} 
                                                                        label={member} 
                                                                        size="small" 
                                                                        variant="outlined"
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Issue Cards Details */}
                    {issueCardDetails.length > 0 && (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#f39c12' }}>
                                        <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        Chi tiết Issue Cards ({issueCardDetails.length} cards)
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Tên Card</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Labels</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Tổng Điểm</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {issueCardDetails.map((card, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Link 
                                                                href={card.cardUrl} 
                                                                target="_blank" 
                                                                rel="noopener"
                                                                sx={{ textDecoration: 'none', color: '#667eea' }}
                                                            >
                                                                {card.cardName}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                {card.labels.map((label, idx) => (
                                                                    <Chip 
                                                                        key={idx} 
                                                                        label={`${label.name} (${label.rate})`} 
                                                                        color="warning" 
                                                                        size="small"
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Typography sx={{ fontWeight: 'bold', color: '#f39c12' }}>
                                                                {card.totalRate.toLocaleString()}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button 
                    onClick={onClose} 
                    variant="contained"
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                        }
                    }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalKPIDetail;