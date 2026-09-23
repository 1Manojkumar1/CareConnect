import { createSlice } from '@reduxjs/toolkit';

let toastSeq = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    pushToast(state, action) {
      toastSeq += 1;
      state.toasts.push({ id: toastSeq, tone: 'info', ...action.payload });
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
