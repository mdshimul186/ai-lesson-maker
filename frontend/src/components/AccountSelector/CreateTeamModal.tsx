import React from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useAccountStore } from '../../stores';

interface CreateTeamModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const { createTeamAccount, isLoading } = useAccountStore();
  
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createTeamAccount(values.name, values.description);
      message.success('Team account created successfully');
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Failed to create team account:', error);
    }
  };
  
  return (
    <Modal
      title="Create Team Account"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={isLoading}
          onClick={handleSubmit}
        >
          Create
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label="Team Name"
          rules={[{ required: true, message: 'Please enter a team name' }]}
        >
          <Input placeholder="Enter team name" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea placeholder="Enter team description (optional)" rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTeamModal;
