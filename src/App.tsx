import React, { useState } from 'react';
import Layout from './components/Layout';
import ChatInterface from './components/ChatInterface';
import MediaGenerator from './components/MediaGenerator';
import LiveVoice from './components/LiveVoice';
import Integrations from './components/Integrations';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'image':
      case 'video':
        return <MediaGenerator />;
      case 'live':
        return <LiveVoice />;
      case 'integrations':
        return <Integrations />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <TooltipProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
      <Toaster position="top-right" theme="dark" />
    </TooltipProvider>
  );
}
