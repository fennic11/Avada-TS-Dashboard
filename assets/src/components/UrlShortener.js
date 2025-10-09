import React, { useState } from 'react';
import { Card, Input, Button, message, Space, Typography, Divider, Alert } from 'antd';
import { LinkOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Simple URL shortener using base62 encoding
function generateShortCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const UrlShortener = () => {
    const [originalUrl, setOriginalUrl] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleShorten = async () => {
        if (!originalUrl.trim()) {
            message.error('Please enter a URL');
            return;
        }

        // Validate URL format
        try {
            new URL(originalUrl);
        } catch {
            message.error('Please enter a valid URL');
            return;
        }

        setLoading(true);
        
        // Simulate API call delay
        setTimeout(() => {
            const shortCode = generateShortCode();
            const baseUrl = window.location.origin;
            const shortened = `${baseUrl}/s/${shortCode}`;
            
            setShortUrl(shortened);
            setLoading(false);
            message.success('URL shortened successfully!');
        }, 1000);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(true);
            message.success('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            message.error('Failed to copy link');
        }
    };

    const handleReset = () => {
        setOriginalUrl('');
        setShortUrl('');
        setCopied(false);
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px' }}>
            <Card 
                style={{ 
                    borderRadius: 16, 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title level={2} style={{ 
                        color: '#1e293b',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 8
                    }}>
                        <LinkOutlined style={{ marginRight: 12, color: '#667eea' }} />
                        URL Shortener
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                        Create short links for easy sharing
                    </Text>
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Original URL
                        </Text>
                        <Input
                            placeholder="Enter the URL you want to shorten"
                            value={originalUrl}
                            onChange={(e) => setOriginalUrl(e.target.value)}
                            size="large"
                            style={{ borderRadius: 12 }}
                            onPressEnter={handleShorten}
                        />
                    </div>

                    <Button
                        type="primary"
                        onClick={handleShorten}
                        loading={loading}
                        size="large"
                        style={{ 
                            width: '100%',
                            borderRadius: 12,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                        }}
                    >
                        Shorten URL
                    </Button>

                    {shortUrl && (
                        <>
                            <Divider />
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    Shortened URL
                                </Text>
                                <div style={{ 
                                    display: 'flex', 
                                    gap: 8,
                                    background: '#f8fafc',
                                    borderRadius: 12,
                                    padding: '12px 16px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <Input
                                        value={shortUrl}
                                        readOnly
                                        style={{ 
                                            flex: 1,
                                            border: 'none',
                                            background: 'transparent',
                                            fontSize: 14
                                        }}
                                    />
                                    <Button
                                        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                                        onClick={handleCopy}
                                        style={{ borderRadius: 8 }}
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Button>
                                </div>
                            </div>

                            <Alert
                                message="Link Generated Successfully!"
                                description={
                                    <div>
                                        <Text>Your shortened link is ready to share:</Text>
                                        <br />
                                        <Text code style={{ fontSize: 12, wordBreak: 'break-all' }}>
                                            {shortUrl}
                                        </Text>
                                    </div>
                                }
                                type="success"
                                showIcon
                                style={{ borderRadius: 12 }}
                            />

                            <Button 
                                onClick={handleReset}
                                style={{ width: '100%', borderRadius: 12 }}
                            >
                                Create Another Link
                            </Button>
                        </>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default UrlShortener;
