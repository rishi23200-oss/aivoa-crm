import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createInteraction } from '../store/interactionsSlice';
import axios from 'axios';
import './InteractionForm.css';

const API = 'http://localhost:8000';

const initialForm = {
  hcp_name: '',
  interaction_type: 'Meeting',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  attendees: '',
  topics_discussed: '',
  materials_shared: '',
  samples_distributed: '',
  sentiment: 'Neutral',
  outcomes: '',
  follow_up_actions: '',
};

const InteractionForm = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hcp_name || !form.date) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/interactions`, form);
      setSuccess(`✅ Interaction logged! ID: ${res.data.id}`);
      setForm(initialForm);
      setAiSuggestions([]);
      onSuccess && onSuccess();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setSuccess('❌ Error: ' + (err.response?.data?.detail || err.message));
    }
    setLoading(false);
  };

  const getAISuggestions = async () => {
    if (!form.hcp_name || !form.topics_discussed) return;
    setLoadingSuggestions(true);
    try {
      const res = await axios.post(`${API}/api/chat`, {
        message: `suggest_follow_up for HCP "${form.hcp_name}" based on: "${form.topics_discussed}". Outcomes: "${form.outcomes}"`,
        history: [],
      });
      // Parse bullet points from response
      const text = res.data.response;
      const lines = text.split('\n').filter(l => l.trim().match(/^[-•*\d]/));
      setAiSuggestions(lines.length ? lines.map(l => l.replace(/^[-•*\d.]+\s*/, '').trim()) : [text]);
    } catch (err) {
      setAiSuggestions(['Could not fetch suggestions. Check backend connection.']);
    }
    setLoadingSuggestions(false);
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-card-header">
          <h2>📋 Interaction Details</h2>
          <p>Fill in the structured form to log your HCP touchpoint</p>
        </div>

        <form onSubmit={handleSubmit} className="interaction-form">
          {/* Row 1 */}
          <div className="form-row">
            <div className="form-group">
              <label>HCP Name <span className="required">*</span></label>
              <input
                name="hcp_name" value={form.hcp_name}
                onChange={handleChange} placeholder="Search or enter HCP name..."
                required
              />
            </div>
            <div className="form-group">
              <label>Interaction Type</label>
              <select name="interaction_type" value={form.interaction_type} onChange={handleChange}>
                <option>Meeting</option>
                <option>Phone Call</option>
                <option>Virtual Call</option>
                <option>Conference</option>
                <option>Email</option>
                <option>Lunch / Dinner</option>
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>Date <span className="required">*</span></label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" name="time" value={form.time} onChange={handleChange} />
            </div>
          </div>

          {/* Attendees */}
          <div className="form-group">
            <label>Attendees</label>
            <input name="attendees" value={form.attendees} onChange={handleChange}
              placeholder="Enter names or search..." />
          </div>

          {/* Topics */}
          <div className="form-group">
            <label>Topics Discussed</label>
            <textarea name="topics_discussed" value={form.topics_discussed}
              onChange={handleChange} rows={3}
              placeholder="Key discussion points, product discussions, objections raised..." />
          </div>

          {/* Materials & Samples */}
          <div className="form-row">
            <div className="form-group">
              <label>Materials Shared</label>
              <input name="materials_shared" value={form.materials_shared}
                onChange={handleChange} placeholder="Brochures, studies, PDFs..." />
            </div>
            <div className="form-group">
              <label>Samples Distributed</label>
              <input name="samples_distributed" value={form.samples_distributed}
                onChange={handleChange} placeholder="Product samples given..." />
            </div>
          </div>

          {/* Sentiment */}
          <div className="form-group">
            <label>Observed / Inferred HCP Sentiment</label>
            <div className="sentiment-group">
              {['Positive', 'Neutral', 'Negative'].map(s => (
                <label key={s} className={`sentiment-option ${form.sentiment === s ? 'active ' + s.toLowerCase() : ''}`}>
                  <input type="radio" name="sentiment" value={s}
                    checked={form.sentiment === s} onChange={handleChange} hidden />
                  {s === 'Positive' ? '😊' : s === 'Neutral' ? '😐' : '😞'} {s}
                </label>
              ))}
            </div>
          </div>

          {/* Outcomes */}
          <div className="form-group">
            <label>Outcomes</label>
            <textarea name="outcomes" value={form.outcomes} onChange={handleChange}
              rows={2} placeholder="Key outcomes or agreements reached..." />
          </div>

          {/* Follow-up */}
          <div className="form-group">
            <label>Follow-up Actions</label>
            <textarea name="follow_up_actions" value={form.follow_up_actions}
              onChange={handleChange} rows={2}
              placeholder="Next steps or tasks to complete..." />
            <button type="button" className="ai-suggest-btn" onClick={getAISuggestions}
              disabled={loadingSuggestions || !form.hcp_name}>
              {loadingSuggestions ? '⏳ Generating...' : '🤖 AI Suggest Follow-ups'}
            </button>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="ai-suggestions">
              <div className="ai-suggestions-title">✨ AI Suggested Follow-ups</div>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="ai-suggestion-item"
                  onClick={() => setForm(f => ({ ...f, follow_up_actions: f.follow_up_actions ? f.follow_up_actions + '\n• ' + s : '• ' + s }))}>
                  <span className="suggestion-arrow">→</span> {s}
                </div>
              ))}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={`form-message ${success.startsWith('✅') ? 'success' : 'error'}`}>
              {success}
            </div>
          )}

          {/* Submit */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setForm(initialForm)}>
              🗑 Clear
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Saving...' : '💾 Log Interaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InteractionForm;
