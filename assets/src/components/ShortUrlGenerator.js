import React, { useState } from 'react';
import { Card, Button, Input, message, Space, Typography, Radio } from 'antd';
import { LinkOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Simple URL shortener function
function generateShortCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const ShortUrlGenerator = () => {
    const [shortUrl, setShortUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [customDomain, setCustomDomain] = useState('');
    const [urlType, setUrlType] = useState('dashboard'); // 'dashboard' or 'public'

    const handleGenerateShortUrl = () => {
        const shortCode = generateShortCode();
        let baseUrl;
        
        if (customDomain.trim()) {
            // Use custom domain if provided
            baseUrl = customDomain.trim().startsWith('http') 
                ? customDomain.trim() 
                : `https://${customDomain.trim()}`;
        } else {
            // Use current domain or fallback
            baseUrl = window.location.hostname === 'localhost' 
                ? 'https://avada-ts-dashboard.vercel.app' // Your deployed domain
                : window.location.origin;
        }
        
        let shortened;
        if (urlType === 'dashboard') {
            // Short URL for main dashboard - redirects to main app
            shortened = `${baseUrl}/s/${shortCode}?type=dashboard`;
        } else {
            // Short URL for public dashboard - redirects to /public
            shortened = `${baseUrl}/s/${shortCode}?type=public`;
        }
        
        setShortUrl(shortened);
        message.success('Short URL generated successfully!');
    };

    const handleCopyShortUrl = async () => {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(true);
            message.success('Short URL copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            message.error('Failed to copy short URL');
        }
    };

    const handleReset = () => {
        setShortUrl('');
        setCopied(false);
        setCustomDomain('');
    };

    return (
        <Card 
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LinkOutlined style={{ color: '#1890ff' }} />
                    <span>URL Shortener</span>
                </div>
            }
            style={{ 
                borderRadius: 16, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: 24
            }}
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Generate a short URL to share with others.
                </Text>
            </div>

            {/* URL Type Selection */}
            <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: 'block' }}>
                    Choose URL type:
                </Text>
                <Radio.Group 
                    value={urlType} 
                    onChange={(e) => setUrlType(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value="dashboard">
                            <div>
                                <Text strong>Main Dashboard</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Short URL for the main dashboard (requires login)
                                </Text>
                            </div>
                        </Radio>
                        <Radio value="public">
                            <div>
                                <Text strong>Public Dashboard</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Short URL for the public dashboard (no login required)
                                </Text>
                            </div>
                        </Radio>
                    </Space>
                </Radio.Group>
            </div>

            {/* Custom Domain Input */}
            <div style={{ marginBottom: 16 }}>
                <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="Enter custom domain (default: avada-ts-dashboard.vercel.app)"
                    addonBefore="🌐"
                    style={{ marginBottom: 8 }}
                />
                <Text style={{ fontSize: 12, color: '#666' }}>
                    Leave empty to use default domain: avada-ts-dashboard.vercel.app
                </Text>
            </div>
            
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                <Input
                    value={shortUrl}
                    placeholder="Short URL will appear here..."
                    readOnly
                    style={{ flex: 1 }}
                />
                <Button
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopyShortUrl}
                    disabled={!shortUrl}
                    type={copied ? 'primary' : 'default'}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </Button>
            </Space.Compact>

            <div style={{ display: 'flex', gap: 8 }}>
                <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={handleGenerateShortUrl}
                    size="large"
                    style={{ flex: 1 }}
                >
                    Generate Short URL
                </Button>
                <Button
                    onClick={handleReset}
                    size="large"
                    disabled={!shortUrl && !customDomain}
                >
                    Reset
                </Button>
            </div>

            {shortUrl && (
                <div style={{ 
                    marginTop: 16, 
                    padding: 12, 
                    background: '#f6ffed', 
                    border: '1px solid #b7eb8f', 
                    borderRadius: 6 
                }}>
                    <Text style={{ fontSize: 12, color: '#52c41a', display: 'block', marginBottom: 4 }}>
                        ✅ Short URL created! You can now share this link with others.
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 2 }}>
                        Type: {urlType === 'dashboard' ? 'Main Dashboard (requires login)' : 'Public Dashboard (no login required)'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>
                        Domain: {customDomain || (window.location.hostname === 'localhost' ? 'avada-ts-dashboard.vercel.app' : window.location.origin)}
                    </Text>
                </div>
            )}
        </Card>
    );
};

export default ShortUrlGenerator;
