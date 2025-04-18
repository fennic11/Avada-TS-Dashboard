import React, { useState } from 'react';
import { 
    Box, 
    Paper, 
    Typography, 
    Alert,
    Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import members from '../data/members.json';

const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'error'
    });

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            setIsLoading(true);
            const decoded = jwtDecode(credentialResponse.credential);
            console.log(decoded);
            
            // Kiểm tra email có trong members.json không
            const member = members.find(m => m.email === decoded.email);
            if (!member) {
                throw new Error('Email không có quyền truy cập');
            }

            // Gửi thông tin Google đến server

            // Lưu thông tin user và token
            localStorage.setItem('user' , JSON.stringify({...decoded, trelloId: member.id}));
            
            // Chuyển hướng về trang chủ
            navigate('/bugs');
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.message || 'Đăng nhập bằng Google thất bại',
                severity: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                p: 3
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
            >
                <Box
                    sx={{
                        width: '120px',
                        height: '120px',
                        mb: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <img 
                        src={logo} 
                        alt="Logo" 
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                </Box>

                <Typography 
                    variant="h4" 
                    component="h1" 
                    gutterBottom 
                    sx={{ 
                        textAlign: 'center',
                        color: '#06038D',
                        fontWeight: 'bold',
                        mb: 4,
                        fontSize: '1.75rem'
                    }}
                >
                    Đăng nhập
                </Typography>

                <Box sx={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mb: 2,
                    '& .google-login-button': {
                        backgroundColor: '#ffffff',
                        color: '#06038D',
                        border: '1px solid #06038D',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        fontSize: '16px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            backgroundColor: '#f5f5f5',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                            transform: 'translateY(-1px)'
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }
                    }
                }}>
                    <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => {
                            setSnackbar({
                                open: true,
                                message: 'Đăng nhập bằng Google thất bại',
                                severity: 'error'
                            });
                        }}
                        useOneTap
                        theme="outline"
                        size="large"
                        shape="rectangular"
                        width="100%"
                        className="google-login-button"
                    />
                </Box>
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Login; 