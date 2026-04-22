import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'http://localhost:8000';

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, history }) => {
    const res = await axios.post(`${API}/api/chat`, { message, history });
    return { userMessage: message, aiResponse: res.data.response };
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearChat: (state) => { state.messages = []; },
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: action.payload.aiResponse });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        state.messages.push({ role: 'assistant', content: '⚠️ Error: ' + action.error.message });
      });
  },
});

export const { clearChat, addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;
