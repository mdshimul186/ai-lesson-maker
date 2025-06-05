'use client';

import React, { useEffect } from 'react';
import { Typography, Card, Row, Col, Avatar, Descriptions, Tag, Divider, Spin, Statistic } from 'antd';
import {
    UserOutlined,
    MailOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { useAuthStore, useAccountStore } from '../../stores';

// Simple date formatting utility
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const { Title, Text } = Typography;

export default function ProfilePage() {
    const { user } = useAuthStore();
    const { currentAccount, fetchAccounts } = useAccountStore();

    useEffect(() => {
        if (!currentAccount) {
            fetchAccounts();
        }
    }, [fetchAccounts, currentAccount]);

    if (!user) {
        return (
            <Card>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <Spin size="large" />
                    <Text style={{ marginLeft: 16 }}>Loading profile...</Text>
                </div>
            </Card>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <Row gutter={[16, 24]}>
                <Col span={24}>
                    <Card>
                        <Row gutter={16} align="middle">
                            <Col>
                                <Avatar size={80} icon={<UserOutlined />} />
                            </Col>
                            <Col flex="auto">
                                <Title level={2} style={{ margin: 0 }}>
                                    {user.first_name} {user.last_name}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 16 }}>
                                    <MailOutlined /> {user.email}
                                </Text>                <div style={{ marginTop: 8 }}>
                                    <Tag
                                        color={user.is_verified ? 'green' : 'orange'}
                                        icon={user.is_verified ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                                    >
                                        {user.is_verified ? 'Email Verified' : 'Email Not Verified'}
                                    </Tag>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="Personal Information">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="First Name">
                                {user.first_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Last Name">
                                {user.last_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {user.email}
                            </Descriptions.Item>              <Descriptions.Item label="Registration Date">
                                <CalendarOutlined /> {formatDate(user.created_at)}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="Account Overview">
                        {currentAccount ? (
                            <div>
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Statistic
                                            title="Available Credits"
                                            value={currentAccount.credits}
                                            suffix="credits"
                                        />
                                    </Col>
                                </Row>
                                <Divider />
                                <Descriptions column={1} size="small">
                                    <Descriptions.Item label="Account Name">
                                        {currentAccount.name}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Account Type">
                                        <Tag color="blue">
                                            {currentAccount.type.charAt(0).toUpperCase() + currentAccount.type.slice(1)}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Created">
                                        <CalendarOutlined /> {formatDate(currentAccount.created_at)}
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Spin />
                                <Text style={{ marginLeft: 16 }}>Loading account information...</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
