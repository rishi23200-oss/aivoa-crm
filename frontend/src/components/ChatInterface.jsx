import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendChatMessage, addUserMessage, clearChat } from '../store/chatSlice';
import './ChatInterface.css';

const QUICK_PROMPTS = [
  'Log a meeting with Dr. Sharma today about Product X efficacy',
  'Show interaction history for Dr. Patel',
  'Suggest follow-ups for Dr. Kumar after last week\'s call',
  'Analyze sentiment: "HCP was skeptical but open to trial"',
  'Edit interaction ID 1 – change sentiment to Positive',
];

const ChatInterface = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector(state => state.chat);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    dispatch(addUserMessage(msg));
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    await dispatch(sendChatMessage({ message: msg, history }));
    onSuccess && onSuccess();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-card">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="ai-avatar">🤖</div>
            <div>
              <div className="chat-title">AI Assistant</div>
              <div className="chat-sub">Powered by LangGraph + Groq gemma2-9b-it</div>
            </div>
          </div>
          <button className="btn btn-secondary" style={{fontSize:'12px', padding:'5px 10px'}}
            onClick={() => dispatch(clearChat())}>
            🗑 Clear
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-icon">⚕️</div>
              <h3>How can I help you today?</h3>
              <p>Log interactions, check HCP history, get follow-up suggestions, or analyze sentiment — just ask!</p>
              <div className="quick-prompts">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} className="quick-prompt-btn" onClick={() => handleSend(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-bubble">
                <div className="message-content">
                  {msg.content.split('\n').map((line, j) => (
                    <p key={j}>{line || <br />}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble">
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Describe interaction... e.g. "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure"'
            rows={2}
            disabled={loading}
          />
          <button className="send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()}>
            {loading ? '⏳' : '↑ Log'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
