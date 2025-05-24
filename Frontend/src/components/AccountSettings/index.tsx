import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useAccountStore } from '../../stores';

const { Title } = Typography;

const AccountSettings: React.FC = () => {
  const { currentAccount, updateAccountDetails, isLoading } = useAccountStore();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  
  if (!currentAccount) {
    return <div>Please select an account first</div>;
  }
  
  const handleEdit = () => {
    form.setFieldsValue({
      name: currentAccount.name,
      description: currentAccount.description || ''
    });
    setEditing(true);
  };
  
  const handleCancel = () => {
    setEditing(false);
  };
  
  
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateAccountDetails(
        currentAccount.id, 
        values.name, 
        values.description
      );
      message.success('Account settings updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update account settings:', error);
    }
  };
  
  return (
    <Card>
      <Title level={4}>Account Settings</Title>
      
      {editing ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: currentAccount.name,
            description: currentAccount.description || ''
          }}
        >
          <Form.Item
            name="name"
            label="Account Name"
            rules={[{ required: true, message: 'Please enter an account name' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              onClick={handleSubmit} 
              loading={isLoading}
              style={{ marginRight: 8 }}
            >
              Save
            </Button>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <div>
          <p><strong>Account Type:</strong> {currentAccount.type === 'personal' ? 'Personal' : 'Team'}</p>
          <p><strong>Name:</strong> {currentAccount.name}</p>
          <p><strong>Description:</strong> {currentAccount.description || 'No description'}</p>
          <p><strong>Created:</strong> {new Date(currentAccount.created_at).toLocaleDateString()}</p>
          
          {currentAccount.is_owner && (
            <Button 
              type="primary" 
              onClick={handleEdit}
              style={{ marginTop: 16 }}
            >
              Edit Account
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default AccountSettings;
