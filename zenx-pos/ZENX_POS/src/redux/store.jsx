import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice'
import roleAccessReducer from './roleAccessSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    roleAccess: roleAccessReducer,
  },
});