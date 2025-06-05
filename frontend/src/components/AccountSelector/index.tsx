import React, { useEffect, useState } from 'react';
import { Menu, Dropdown, Button, Badge, Spin, message } from 'antd';
import { DownOutlined, TeamOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
import { useAccountStore } from '../../stores';
// Define Account type locally if not exported from services
type Account = {
    id: string;
    name: string;
    type: 'personal' | 'team';
    credits: number;
};
import CreateTeamModal from './CreateTeamModal';

const AccountSelector: React.FC = () => {
    const {
        accounts,
        currentAccount,
        fetchAccounts,
        setCurrentAccount,
        isLoading,
        error
    } = useAccountStore();

    const [createTeamModalVisible, setCreateTeamModalVisible] = useState(false);
    useEffect(() => {
        // Only fetch accounts if we don't already have any loaded
        if (accounts.length === 0 && !isLoading) {
            fetchAccounts();
        }
    }, [accounts.length, fetchAccounts, isLoading]);

    useEffect(() => {
        if (error) {
            message.error(error);
        }
    }, [error]);

    // Check if we have a saved account ID in localStorage
    useEffect(() => {
        const savedAccountId = localStorage.getItem('currentAccountId');
        if (savedAccountId && accounts.some(a => a.id === savedAccountId)) {
            setCurrentAccount(savedAccountId);
        }
    }, [accounts, setCurrentAccount]);

    const handleAccountChange = (accountId: string) => {
        setCurrentAccount(accountId);
    };

    const handleCreateTeam = () => {
        setCreateTeamModalVisible(true);
    };

    const renderAccountIcon = (account: Account) => {
        return account.type === 'personal' ? <UserOutlined /> : <TeamOutlined />;
    };

    const menu = (
        <Menu>
            {accounts.map(account => (
                <Menu.Item
                    key={account.id}
                    onClick={() => handleAccountChange(account.id)}
                    icon={renderAccountIcon(account)}
                >
                    {account.name}
                    <Badge
                        count={account.credits}
                        style={{
                            backgroundColor: account.credits > 0 ? '#52c41a' : '#ff4d4f',
                            marginLeft: 8
                        }}
                        overflowCount={999}
                    />
                </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item key="create-team" onClick={handleCreateTeam} icon={<PlusOutlined />}>
                Create Team Account
            </Menu.Item>
        </Menu>
    );

    if (isLoading && accounts.length === 0) {
        return <Spin size="small" />;
    }

    return (
        <>
            <Dropdown overlay={menu} trigger={['click']}>
                <Button>
                    {currentAccount ? (
                        <>
                            {renderAccountIcon(currentAccount)}
                            <span style={{ margin: '0 8px' }}>{currentAccount.name}</span>
                            {/* <Badge 
                count={currentAccount.credits} 
                style={{ 
                  backgroundColor: currentAccount.credits > 0 ? '#52c41a' : '#ff4d4f',
                  marginRight: 8
                }} 
                overflowCount={999}
              /> */}
                        </>
                    ) : (
                        'Select Account'
                    )}
                    <DownOutlined />
                </Button>
            </Dropdown>

            <CreateTeamModal
                visible={createTeamModalVisible}
                onClose={() => setCreateTeamModalVisible(false)}
            />
        </>
    );
};

export default AccountSelector;
