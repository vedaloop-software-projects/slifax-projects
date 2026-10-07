import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  permissions:[],
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.permissions = action.payload.permissions || [];
      state.isLoggedIn = true;
    },
       updatePermissions(state, action) {
      state.permissions = action.payload || [];
      if (state.user) {
        state.user = {
          ...state.user,
          permissions: action.payload || [],
        };
      }
    },


    updateUser(state, action) {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
         if (action.payload.permissions) {
          state.permissions = action.payload.permissions;
        }
      }
    },

    clearUser(state) {
      state.user = null;
      state.token = null;
      state.permissions=[];
      state.isLoggedIn = false;
    },
  },
});

export const { setUser, updatePermissions, updateUser, clearUser } = authSlice.actions;
export default authSlice.reducer;