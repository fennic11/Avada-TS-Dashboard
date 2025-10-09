import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Spin, Alert } from 'antd';

const ShortUrlRedirect = () => {
    const { shortCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Get URL type from query parameters
        const urlParams = new URLSearchParams(location.search);
        const urlType = urlParams.get('type') || 'public'; // Default to public
        
        // Simulate a brief loading time
        const timer = setTimeout(() => {
            if (urlType === 'dashboard') {
                // Redirect to main dashboard (requires login)
                navigate('/', { replace: true });
            } else {
                // Redirect to public dashboard (no login required)
                navigate('/public', { replace: true });
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [navigate, shortCode, location.search]);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 20,
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: 400,
                width: '100%'
            }}>
                <Spin size="large" style={{ marginBottom: 24 }} />
                <Alert
                    message="Redirecting..."
                    description={`Short code: ${shortCode}${location.search ? ` (${new URLSearchParams(location.search).get('type') || 'public'})` : ''}`}
                    type="info"
                    showIcon
                    style={{ borderRadius: 12 }}
                />
            </div>
        </div>
    );
};

export default ShortUrlRedirect;
