import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteInteraction } from '../store/interactionsSlice';
import axios from 'axios';
import './InteractionsList.css';

const API = 'http://localhost:8000';

const SentimentBadge = ({ s }) => (
  <span className={`badge badge-${s?.toLowerCase()}`}>
    {s === 'Positive' ? '😊' : s === 'Negative' ? '😞' : '😐'} {s}
  </span>
);

const InteractionsList = ({ interactions, loading, onRefresh }) => {
  const dispatch = useDispatch();
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interaction?')) return;
    await dispatch(deleteInteraction(id));
  };

  const startEdit = (interaction) => {
    setEditId(interaction.id);
    setEditData({
      topics_discussed: interaction.topics_discussed || '',
      outcomes: interaction.outcomes || '',
      follow_up_actions: interaction.follow_up_actions || '',
      sentiment: interaction.sentiment || 'Neutral',
    });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await axios.put(`${API}/api/interactions/${editId}`, editData);
      setEditId(null);
      onRefresh();
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
    setEditLoading(false);
  };

  return (
    <div className="list-panel">
      <div className="list-header">
        <div>
          <h3 className="list-title">Recent Interactions</h3>
          <p className="list-count">{interactions.length} total logged</p>
        </div>
        <button className="btn btn-secondary" style={{fontSize:'12px', padding:'6px 10px'}} onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="list-body">
        {loading && (
          <div className="list-loading">
            <div className="spinner"></div>
            <span>Loading interactions...</span>
          </div>
        )}

        {!loading && interactions.length === 0 && (
          <div className="list-empty">
            <div className="empty-icon">📭</div>
            <p>No interactions logged yet.</p>
            <p className="empty-sub">Use the form or AI chat to log your first HCP interaction.</p>
          </div>
        )}

        {interactions.map((item) => (
          <div key={item.id} className={`interaction-card ${expandedId === item.id ? 'expanded' : ''}`}>
            {editId === item.id ? (
              /* ── Edit Mode ── */
              <div className="edit-mode">
                <div className="edit-header">✏️ Editing Interaction #{item.id}</div>
                <div className="edit-field">
                  <label>Topics Discussed</label>
                  <textarea rows={2} value={editData.topics_discussed}
                    onChange={e => setEditData({...editData, topics_discussed: e.target.value})} />
                </div>
                <div className="edit-field">
                  <label>Outcomes</label>
                  <textarea rows={2} value={editData.outcomes}
                    onChange={e => setEditData({...editData, outcomes: e.target.value})} />
                </div>
                <div className="edit-field">
                  <label>Follow-up Actions</label>
                  <textarea rows={2} value={editData.follow_up_actions}
                    onChange={e => setEditData({...editData, follow_up_actions: e.target.value})} />
                </div>
                <div className="edit-field">
                  <label>Sentiment</label>
                  <select value={editData.sentiment}
                    onChange={e => setEditData({...editData, sentiment: e.target.value})}>
                    <option>Positive</option><option>Neutral</option><option>Negative</option>
                  </select>
                </div>
                <div className="edit-actions">
                  <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveEdit} disabled={editLoading}>
                    {editLoading ? '⏳ Saving...' : '💾 Save'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View Mode ── */
              <>
                <div className="card-top" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <div className="card-left">
                    <div className="card-id">#{item.id}</div>
                    <div>
                      <div className="card-hcp">{item.hcp_name}</div>
                      <div className="card-meta">{item.interaction_type} · {item.date}</div>
                    </div>
                  </div>
                  <div className="card-right">
                    <SentimentBadge s={item.sentiment} />
                    <span className="expand-icon">{expandedId === item.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {item.ai_summary && (
                  <div className="card-summary">
                    <span className="ai-tag">✨ AI</span> {item.ai_summary}
                  </div>
                )}

                {expandedId === item.id && (
                  <div className="card-details">
                    {item.topics_discussed && <div className="detail-row"><span>Topics:</span> {item.topics_discussed}</div>}
                    {item.materials_shared && <div className="detail-row"><span>Materials:</span> {item.materials_shared}</div>}
                    {item.samples_distributed && <div className="detail-row"><span>Samples:</span> {item.samples_distributed}</div>}
                    {item.outcomes && <div className="detail-row"><span>Outcomes:</span> {item.outcomes}</div>}
                    {item.follow_up_actions && <div className="detail-row"><span>Follow-up:</span> {item.follow_up_actions}</div>}
                    <div className="card-actions">
                      <button className="btn btn-secondary" style={{fontSize:'12px', padding:'5px 10px'}}
                        onClick={() => startEdit(item)}>
                        ✏️ Edit
                      </button>
                      <button className="btn btn-danger" style={{fontSize:'12px', padding:'5px 10px'}}
                        onClick={() => handleDelete(item.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractionsList;
