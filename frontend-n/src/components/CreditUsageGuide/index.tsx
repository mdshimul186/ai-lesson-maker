import React from 'react';
import { Card, Typography, Steps, Divider, Row, Col, Tag } from 'antd';
import { VideoCameraOutlined, CreditCardOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

const CreditUsageGuide: React.FC = () => {
  return (
    <Card style={{ borderRadius: 8, marginBottom: 24 }}>
      <Title level={4}>
        <CreditCardOutlined /> Understanding Credit Usage
      </Title>
      
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Learn how credits work and how to get the most value from your AI Lesson Maker account.
      </Paragraph>
      
      <Divider orientation="left">Credit System</Divider>
      
      <Row gutter={[16, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card 
            title={<Text strong>1 Credit = 1 Scene</Text>} 
            bordered={false} 
            style={{ background: '#f0f7ff', height: '100%' }}
          >
            <Paragraph>
              Each scene in your lesson uses exactly one credit. A scene typically includes:
            </Paragraph>
            <ul>
              <li>A slide with visual content</li>
              <li>Narration for that slide</li>
              <li>Animations and transitions</li>
            </ul>
            <Paragraph>
              <Text type="secondary">Example: A 10-scene lesson will require 10 credits.</Text>
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title={<Text strong>Scene Length Flexibility</Text>} 
            bordered={false}
            style={{ background: '#f6ffed', height: '100%' }}
          >
            <Paragraph>
              Scene length is flexible and can vary based on:
            </Paragraph>
            <ul>
              <li>The amount of content in each scene</li>
              <li>The narration speed setting</li>
              <li>Your preferred pacing</li>
            </ul>
            <Paragraph>
              <Text type="secondary">Scene duration typically ranges from 10-30 seconds.</Text>
            </Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Divider orientation="left">How to Create Scenes</Divider>
      
      <Steps 
        direction="vertical" 
        current={-1} 
        style={{ marginBottom: 24 }}
      >
        <Step 
          title="Plan Your Lesson" 
          description="Outline the key points you want to cover in your lesson and estimate how many scenes you'll need." 
          icon={<VideoCameraOutlined />} 
        />
        <Step 
          title="Create Scenes" 
          description="When creating your lesson, break down your content into logical segments or slides. Each segment will become a scene." 
          icon={<PlayCircleOutlined />} 
        />
        <Step 
          title="Generate Video" 
          description="Credits are only deducted when you finalize and generate your video. You can edit your scenes without using additional credits." 
          icon={<CheckCircleOutlined />} 
        />
      </Steps>
      
      <Divider orientation="left">Recommended Scene Counts</Divider>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ background: '#f9f9f9', textAlign: 'center', height: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>3-5</Title>
            <Text>scenes</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Tag color="blue">Short Lessons</Tag>
            <Paragraph style={{ marginTop: 12 }}>
              Quick concepts, definitions, or simple explanations
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ background: '#f9f9f9', textAlign: 'center', height: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>6-10</Title>
            <Text>scenes</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Tag color="green">Standard Lessons</Tag>
            <Paragraph style={{ marginTop: 12 }}>
              Complete topics with examples and detailed explanations
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ background: '#f9f9f9', textAlign: 'center', height: '100%' }}>
            <Title level={4} style={{ margin: 0 }}>11-20</Title>
            <Text>scenes</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Tag color="purple">Comprehensive Lessons</Tag>
            <Paragraph style={{ marginTop: 12 }}>
              In-depth tutorials or complex subject matter
            </Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Paragraph type="secondary" style={{ textAlign: 'center' }}>
        Still have questions about credits? Check the FAQ tab or contact our support team.
      </Paragraph>
    </Card>
  );
};

export default CreditUsageGuide;
