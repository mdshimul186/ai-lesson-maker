import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Typography, message, Popconfirm, Spin, Tag, Select } from 'antd';
import { UserAddOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAccountStore, useAuthStore } from '../../stores';
import { ITeamMember } from '../../interfaces';

const { Title, Text } = Typography;
const { Option } = Select;

interface DisplayTeamMember extends ITeamMember {
  key: string;
}

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

const TeamManagement: React.FC = () => {
  const { 
    currentAccount,
    fetchAccountDetails,
    inviteTeamMember,
    removeTeamMember,
    isLoading: isStoreLoading 
  } = useAccountStore();
  const { user } = useAuthStore();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteForm] = Form.useForm();
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const mapAccountMembersToDisplay = useCallback((members?: ITeamMember[]): DisplayTeamMember[] => {
    return members?.map(m => ({ ...m, key: m.user_id })) || [];
  }, []);
  const refreshTeamMembers = useCallback(async () => {
    if (!currentAccount?.id) return;
    
    // Skip if we're already loading or if this isn't a team account
    if (isStoreLoading || currentAccount.type !== 'team') return;
    
    // Skip if we already have members data
    if (currentAccount.members && currentAccount.members.length > 0) return;
    
    setLoadingLocal(true);
    try {
      await fetchAccountDetails(currentAccount.id);
    } catch (error) {
      console.error('Failed to refresh team members:', error);
      message.error('Failed to refresh team members. Please try again.');
    } finally {
      setLoadingLocal(false);
    }
  }, [currentAccount?.id, currentAccount?.type, currentAccount?.members, isStoreLoading, fetchAccountDetails]);
  useEffect(() => {
    // Only fetch team details if it's a team account and we haven't loaded members yet
    if (currentAccount?.id && currentAccount.type === 'team') {
      const membersNotLoaded = !currentAccount.members || currentAccount.members.length === 0;
      const membersStillLoading = !isStoreLoading && membersNotLoaded;
      
      if (membersStillLoading) {
        refreshTeamMembers();
      }
    }
  }, [currentAccount?.id, currentAccount?.type, currentAccount?.members, isStoreLoading, refreshTeamMembers]);
  
  if (!currentAccount) {
    return <Card><Text>Please select an account first.</Text></Card>;
  }
  
  if (currentAccount.type !== 'team') {
    return (
      <Card>
        <Title level={4}>Team Management</Title>
        <Text>This feature is only available for team accounts.</Text>
      </Card>
    );
  }

  const isCurrentUserOwner = currentAccount.owner_id === user?.id;
  const displayedTeamMembers = mapAccountMembersToDisplay(currentAccount.members);
  
  const handleInviteMember = async () => {
    if (!currentAccount?.id) return;
    try {
      const values = await inviteForm.validateFields();
      setIsInviting(true);
      await inviteTeamMember(currentAccount.id, values.email, values.role);
      message.success('Invitation sent successfully!');
      inviteForm.resetFields();
      setInviteModalVisible(false);
    } catch (error: any) {
      console.error('Failed to invite member:', error);
      message.error(error.response?.data?.detail || 'Failed to invite member. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };
  
  const handleRemoveMember = async (memberUserId: string) => {
    if (!currentAccount?.id) return;
    setIsRemoving(memberUserId);
    try {
      await removeTeamMember(currentAccount.id, memberUserId);
      message.success('Member removed successfully!');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      message.error(error.response?.data?.detail || 'Failed to remove member. Please try again.');
    } finally {
      setIsRemoving(null);
    }
  };
  
  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => ROLES.find(r => r.value === role)?.label || role,
    },
    {
      title: 'Status',
      dataIndex: 'invitation_status',
      key: 'invitation_status',
      render: (status: ITeamMember['invitation_status']) => {
        let color = 'default';
        let text = status.toUpperCase();
        if (status === 'accepted') {
          color = 'green';
          text = 'ACTIVE';
        } else if (status === 'pending') {
          color = 'gold';
          text = 'PENDING';
        } else if (status === 'rejected') {
          color = 'red';
          text = 'REJECTED';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Joined At',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (date: string | null, record: DisplayTeamMember) => 
        record.invitation_status === 'accepted' && date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DisplayTeamMember) => {
        const canRemove = isCurrentUserOwner ? record.user_id !== currentAccount.owner_id : record.user_id === user?.id;
        const isSelf = record.user_id === user?.id;
        const popconfirmTitle = isSelf ? "Are you sure you want to leave this team?" : "Are you sure you want to remove this member?";

        if (!canRemove || record.user_id === currentAccount.owner_id && isSelf) return null;

        return (
          <Popconfirm
            title={popconfirmTitle}
            onConfirm={() => handleRemoveMember(record.user_id)}
            okText="Yes"
            cancelText="No"
            disabled={isRemoving === record.user_id || isStoreLoading}
          >
            <Button 
              icon={isRemoving === record.user_id ? <LoadingOutlined /> : <DeleteOutlined />}
              danger
              size="small"
              disabled={isRemoving === record.user_id || isStoreLoading}
            >
              {isSelf ? 'Leave Team' : 'Remove'}
            </Button>
          </Popconfirm>
        );
      }
    }
  ];
  
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Team Management</Title>
        {isCurrentUserOwner && (
          <Button 
            type="primary" 
            icon={<UserAddOutlined />}
            onClick={() => setInviteModalVisible(true)}
            disabled={isStoreLoading || loadingLocal}
          >
            Invite Member
          </Button>
        )}
      </div>
      
      <Spin spinning={loadingLocal || isStoreLoading}>
        <Table 
          dataSource={displayedTeamMembers}
          columns={columns}
          rowKey="key"
          pagination={false}
          locale={{ emptyText: displayedTeamMembers.length === 0 ? 'No team members yet. Invite someone to join!' : 'No data' }}
        />
      </Spin>
      
      <Modal
        title="Invite Team Member"
        open={inviteModalVisible}
        onOk={handleInviteMember}
        onCancel={() => {
          setInviteModalVisible(false);
          inviteForm.resetFields();
        }}
        confirmLoading={isInviting}
        okButtonProps={{ disabled: isInviting || isStoreLoading }}
        cancelButtonProps={{ disabled: isInviting || isStoreLoading }}
      >
        <Form form={inviteForm} layout="vertical" name="inviteMemberForm">
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter the email address of the user to invite.' },
              { type: 'email', message: 'Please enter a valid email address.' }
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Role"
            initialValue="member"
            rules={[{ required: true, message: 'Please assign a role.'}]}
          >
            <Select placeholder="Select a role">
              {ROLES.map(role => (
                <Option key={role.value} value={role.value}>{role.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TeamManagement;
