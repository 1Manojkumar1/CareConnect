import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: localStorage.getItem('cc_token') || null,
  user: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user || null;
      state.status = 'authenticated';
      if (action.payload.token) localStorage.setItem('cc_token', action.payload.token);
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      localStorage.removeItem('cc_token');
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
