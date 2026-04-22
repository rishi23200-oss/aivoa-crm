import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions } from '../store/interactionsSlice';
import InteractionForm from './InteractionForm';
import ChatInterface from './ChatInterface';
import InteractionsList from './InteractionsList';
import './LogInteractionScreen.css';

const LogInteractionScreen = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(state => state.interactions);
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'chat'

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  const refreshList = () => dispatch(fetchInteractions());

  return (
    <div className="crm-layout">
      {/* ── Sidebar ── */}
      <aside className="crm-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⚕</span>
            <div>
              <div className="logo-name">AIVOA CRM</div>
              <div className="logo-sub">Life Sciences HCP Module</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">WORKSPACE</div>
          <button className="nav-item active">
            <span>📋</span> Log Interaction
          </button>
          <button className="nav-item">
            <span>👥</span> HCP Directory
          </button>
          <button className="nav-item">
            <span>📊</span> Analytics
          </button>
          <button className="nav-item">
            <span>📅</span> Calendar
          </button>
        </nav>

        <div className="sidebar-stats">
          <div className="stat-card">
            <div className="stat-value">{list.length}</div>
            <div className="stat-label">Total Interactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{color:'#22c55e'}}>
              {list.filter(i => i.sentiment === 'Positive').length}
            </div>
            <div className="stat-label">Positive Sentiment</div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="crm-main">
        {/* Header */}
        <header className="crm-header">
          <div>
            <h1 className="page-title">Log HCP Interaction</h1>
            <p className="page-sub">Record and manage your Healthcare Professional touchpoints</p>
          </div>
          <div className="header-actions">
            <div className="tab-switcher">
              <button
                className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                📝 Structured Form
              </button>
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                🤖 AI Chat
              </button>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <div className="content-grid">
          <div className="content-left">
            {activeTab === 'form' ? (
              <InteractionForm onSuccess={refreshList} />
            ) : (
              <ChatInterface onSuccess={refreshList} />
            )}
          </div>
          <div className="content-right">
            <InteractionsList
              interactions={list}
              loading={loading}
              onRefresh={refreshList}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogInteractionScreen;
