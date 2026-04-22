import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'http://localhost:8000';

export const fetchInteractions = createAsyncThunk('interactions/fetchAll', async () => {
  const res = await axios.get(`${API}/api/interactions`);
  return res.data;
});

export const createInteraction = createAsyncThunk('interactions/create', async (data) => {
  const res = await axios.post(`${API}/api/interactions`, data);
  return res.data;
});

export const updateInteraction = createAsyncThunk('interactions/update', async ({ id, data }) => {
  const res = await axios.put(`${API}/api/interactions/${id}`, data);
  return { id, ...res.data };
});

export const deleteInteraction = createAsyncThunk('interactions/delete', async (id) => {
  await axios.delete(`${API}/api/interactions/${id}`);
  return id;
});

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState: {
    list: [],
    loading: false,
    error: null,
    selectedInteraction: null,
  },
  reducers: {
    setSelected: (state, action) => { state.selectedInteraction = action.payload; },
    clearSelected: (state) => { state.selectedInteraction = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        // refetch will be triggered by component
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.list = state.list.filter(i => i.id !== action.payload);
      });
  },
});

export const { setSelected, clearSelected } = interactionsSlice.actions;
export default interactionsSlice.reducer;
