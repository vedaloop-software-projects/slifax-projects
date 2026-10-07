import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  allowDiscount: false,
  allowPriceOverride: false,
  allowRefund: false,
};

const roleAccessSlice = createSlice({
  name: 'roleAccess',
  initialState,
  reducers: {
    setBillingAccessRole: (state, action) => {
      state.allowDiscount = action.payload.allowDiscount;
      state.allowPriceOverride = action.payload.allowPriceOverride;
      state.allowRefund = action.payload.allowRefund;
    },

    clearBillingAccessRole: state => {
      state.allowDiscount = false;
      state.allowPriceOverride = false;
      state.allowRefund = false;
    },
  },
});

export const {
  setBillingAccessRole,
  clearBillingAccessRole,
} = roleAccessSlice.actions;

export default roleAccessSlice.reducer;