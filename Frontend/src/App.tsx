import StoryForm from './components/StoryFrom';
import './App.css'

import VideoResult from './components/VideoResult';
import './locales/index';
import { Col, Row } from 'antd';

function App() {
  return (
    <div className="app">
      <div className="appMainArea">

        <Row
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#f0f0f0',
          }}>
          <Col span={10}>
            <div style={{
              display: 'flex',
              width: "100%",
              height: '100vh',
              backgroundColor: '#f0f0f0',
              overflowX: 'scroll',
            }}>
              <StoryForm />
            </div>
          </Col>

          <Col span={14}>

            <VideoResult />

          </Col>

        </Row>



      </div>
    </div>
  )
}
export default App
