// Validation and contract maths for onboarding a client. Mirrors the zenx-pos
// super-admin form (dev/app/Http/Controllers/admin/Clients.php::addClient) so a
// client created here looks exactly like one created from zenx-pos.

const MOBILE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const DISCOUNT_FIXED = 1;
const DISCOUNT_PERCENT = 2;

/** Discount (fixed = 1, percent = 2), then GST on the discounted amount. */
const finalAmount = ({ amount = 0, discountType = 0, discountValue = 0, gst = 0 }) => {
  let discounted = Number(amount) || 0;
  if (Number(discountType) === DISCOUNT_FIXED) discounted -= Number(discountValue) || 0;
  else if (Number(discountType) === DISCOUNT_PERCENT) discounted -= (discounted * (Number(discountValue) || 0)) / 100;
  discounted = Math.max(0, discounted);
  const gstValue = (discounted * (Number(gst) || 0)) / 100;
  return { gstValue: round2(gstValue), finalAmount: round2(discounted + gstValue) };
};

const round2 = (n) => Math.round(n * 100) / 100;

const text = (value, max) => {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
};

const optional = (value, max) => {
  const s = text(value, max);
  return s === "" ? null : s;
};

const number = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Returns { value, errors }. `errors` maps field name to message; empty when valid.
 * `value` uses database column names, ready to insert into `users`.
 */
const validateNewClient = (input = {}) => {
  const errors = {};
  const need = (field, ok, message) => {
    if (!ok) errors[field] = message;
  };

  const businessName = text(input.businessName, 100);
  const contactPerson = text(input.contactPerson, 100);
  const email = text(input.email, 255).toLowerCase();
  const mobile = text(input.mobile, 15);
  const alternateMobile = optional(input.alternateMobile, 15);
  const city = text(input.city, 100);
  const address = text(input.address, 500);
  const gstNumber = optional(input.gstNumber, 50)?.toUpperCase() ?? null;
  const panNumber = optional(input.panNumber, 50)?.toUpperCase() ?? null;
  const fssaiNumber = optional(input.fssaiNumber, 50);
  const gstCode = optional(input.gstCode, 2);
  const websiteUrl = optional(input.websiteUrl, 255);
  const password = typeof input.adminPassword === "string" ? input.adminPassword : "";

  need("businessName", businessName.length > 0, "Business name is required");
  need("businessTypeId", Number.isSafeInteger(Number(input.businessTypeId)) && Number(input.businessTypeId) > 0, "Choose a business type");
  need("stateId", Number.isSafeInteger(Number(input.stateId)) && Number(input.stateId) > 0, "Choose a state");
  need("contactPerson", contactPerson.length > 0, "Contact person is required");
  need("email", EMAIL.test(email), "Enter a valid email");
  need("mobile", MOBILE.test(mobile), "Enter a 10-digit mobile starting with 6-9");
  if (alternateMobile) {
    need("alternateMobile", MOBILE.test(alternateMobile), "Enter a 10-digit mobile starting with 6-9");
    if (alternateMobile === mobile) errors.alternateMobile = "Alternate mobile must differ from mobile";
  }
  need("city", city.length > 0, "City is required");
  need("address", address.length > 0, "Address is required");
  if (websiteUrl) need("websiteUrl", /^https?:\/\/\S+$/i.test(websiteUrl), "Enter a full URL starting with http:// or https://");
  if (gstNumber) need("gstNumber", GST.test(gstNumber), "GST number format is invalid");
  if (gstCode) need("gstCode", /^\d{2}$/.test(gstCode), "GST code is 2 digits");
  if (panNumber) need("panNumber", PAN.test(panNumber), "PAN format is invalid");
  if (fssaiNumber) need("fssaiNumber", /^\d{14}$/.test(fssaiNumber), "FSSAI number is 14 digits");
  need("adminPassword", password.length >= 8 && password.length <= 72, "Admin password must be 8-72 characters");

  const amount = number(input.amount);
  const discountType = number(input.discountType);
  const discountValue = number(input.discountValue);
  const gst = number(input.gst);
  const subscriptionDuration = number(input.subscriptionDuration);
  const subscriptionAmount = number(input.subscriptionAmount);
  const subscriptionDiscountType = number(input.subscriptionDiscountType);
  const subscriptionDiscountValue = number(input.subscriptionDiscountValue);
  const subscriptionGst = number(input.subscriptionGst);

  need("amount", amount >= 0, "Installation amount must be 0 or more");
  need("discountType", [0, 1, 2].includes(discountType), "Invalid discount type");
  need("discountValue", discountValue >= 0, "Discount must be 0 or more");
  if (discountType === DISCOUNT_PERCENT && discountValue > 100) errors.discountValue = "Discount percentage cannot be greater than 100";
  if (discountType === DISCOUNT_FIXED && discountValue > amount) errors.discountValue = "Discount cannot exceed amount";
  need("gst", gst >= 0 && gst <= 100, "GST must be between 0 and 100");
  need("subscriptionDuration", [1, 2, 3].includes(subscriptionDuration), "Choose a subscription duration");
  need("subscriptionAmount", subscriptionAmount >= 0, "Subscription amount must be 0 or more");
  need("subscriptionDiscountType", [0, 1, 2].includes(subscriptionDiscountType), "Invalid discount type");
  need("subscriptionDiscountValue", subscriptionDiscountValue >= 0, "Discount must be 0 or more");
  if (subscriptionDiscountType === DISCOUNT_PERCENT && subscriptionDiscountValue > 100) errors.subscriptionDiscountValue = "Subscription discount % cannot exceed 100";
  if (subscriptionDiscountType === DISCOUNT_FIXED && subscriptionDiscountValue > subscriptionAmount) errors.subscriptionDiscountValue = "Discount cannot exceed subscription amount";
  need("subscriptionGst", subscriptionGst >= 0 && subscriptionGst <= 100, "GST must be between 0 and 100");

  const startDate = text(input.startDate, 10);
  const endDate = text(input.endDate, 10);
  need("startDate", DATE.test(startDate), "Start date is required");
  need("endDate", DATE.test(endDate), "End date is required");
  if (DATE.test(startDate) && DATE.test(endDate) && endDate <= startDate) errors.endDate = "End date must be after start date";

  const featureIds = Array.isArray(input.featureIds) ? input.featureIds : [];
  const subFeatureIds = Array.isArray(input.subFeatureIds) ? input.subFeatureIds : [];
  const ids = (list) => [...new Set(list.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];

  const contract = finalAmount({ amount, discountType, discountValue, gst });
  const subscription = finalAmount({
    amount: subscriptionAmount,
    discountType: subscriptionDiscountType,
    discountValue: subscriptionDiscountValue,
    gst: subscriptionGst,
  });

  return {
    errors,
    password,
    featureIds: ids(featureIds),
    subFeatureIds: ids(subFeatureIds),
    value: {
      name: "",
      business_name: businessName,
      business_type_id: Number(input.businessTypeId),
      email,
      mobile,
      contact_person: contactPerson,
      alternate_mobile: alternateMobile,
      state_id: Number(input.stateId),
      city,
      pincode: Number.isSafeInteger(Number(input.pincode)) ? Number(input.pincode) : 0,
      website_url: websiteUrl,
      address,
      gst_number: gstNumber,
      gst_code: gstCode ? Number(gstCode) : null,
      pan_number: panNumber,
      fssai_number: fssaiNumber,
      trade_license_number: optional(input.tradeLicenseNumber, 50),
      amount,
      discount_type: discountType,
      discount_value: discountValue,
      gst,
      gst_value: contract.gstValue,
      final_amount: contract.finalAmount,
      subscription_duration: subscriptionDuration,
      subscription_amount: subscriptionAmount,
      subscription_discount_type: subscriptionDiscountType,
      subscription_discount_value: subscriptionDiscountValue,
      subscription_gst: subscriptionGst,
      subscription_gst_value: subscription.gstValue,
      subscription_final_amount: subscription.finalAmount,
      start_date: startDate,
      end_date: endDate,
      status: input.status === 0 || input.status === "0" ? 0 : 1,
    },
  };
};

module.exports = {
  finalAmount,
  validateNewClient,
};
