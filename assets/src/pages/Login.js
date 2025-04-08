import React, { useState } from 'react';
import { 
    Box, 
    Paper, 
    TextField, 
    Button, 
    Typography, 
    Alert,
    Snackbar
} from '@mui/material';
import { login } from '../api/usersApi';
import { useNavigate } from 'react-router-dom';
import logo from '../Logo có nền/Logo có nền/Avada_Brandmark_PhienBanMauChinhTrenNenSang.jpg';

const Login = () => {
    const navigate = useNavigate();
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'error'
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const response = await login(loginData.email, loginData.password);
            
            // Lưu thông tin user và token
            localStorage.setItem('user', JSON.stringify(response.data));
            
            // Chuyển hướng về trang chủ
            navigate('/bugs');
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.message || 'Đăng nhập thất bại',
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

                <Box 
                    component="form" 
                    onSubmit={handleLogin} 
                    sx={{ 
                        mt: 1,
                        width: '100%'
                    }}
                >
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        sx={{ 
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(0, 0, 0, 0.23)',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#06038D',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#06038D',
                                },
                            },
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Mật khẩu"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        sx={{ 
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: 'rgba(0, 0, 0, 0.23)',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#06038D',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#06038D',
                                },
                            },
                        }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isLoading}
                        sx={{
                            mt: 3,
                            mb: 2,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            background: 'linear-gradient(135deg, #06038D 0%, #1B263B 100%)',
                            boxShadow: '0 4px 12px rgba(6, 3, 141, 0.2)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #06038D 20%, #1B263B 100%)',
                                boxShadow: '0 6px 16px rgba(6, 3, 141, 0.3)',
                            }
                        }}
                    >
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </Button>
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