const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { appRoleForClientUser, legacyMd5Matches, looksLikeMobile } = require("../src/services/roles");
const { finalAmount, validateNewClient } = require("../src/services/client.rules");
const requireSuperAdmin = require("../src/middleware/super-admin.middleware");

test("client admins and Admin/Manager roles are ADMIN, everyone else USER", () => {
  assert.equal(appRoleForClientUser({ isAdmin: 1, roleTitle: "Cashier" }), "ADMIN");
  assert.equal(appRoleForClientUser({ isAdmin: 0, roleTitle: "Admin" }), "ADMIN");
  assert.equal(appRoleForClientUser({ isAdmin: 0, roleTitle: "Store Manager" }), "ADMIN");
  assert.equal(appRoleForClientUser({ isAdmin: 0, roleTitle: "Billing Staff" }), "USER");
  assert.equal(appRoleForClientUser({ isAdmin: 0, roleTitle: "Administrative assistant" }), "USER");
  assert.equal(appRoleForClientUser({ isAdmin: 0, roleTitle: null }), "USER");
});

test("legacy md5 admin passwords verify without accepting near misses", () => {
  const hash = crypto.createHash("md5").update("secret123").digest("hex");
  assert.equal(legacyMd5Matches("secret123", hash), true);
  assert.equal(legacyMd5Matches("secret123", hash.toUpperCase()), true);
  assert.equal(legacyMd5Matches("secret12", hash), false);
  assert.equal(legacyMd5Matches("secret123", "$2y$10$notmd5"), false);
  assert.equal(legacyMd5Matches("secret123", null), false);
});

test("mobile detection matches the zenx-pos rule", () => {
  assert.equal(looksLikeMobile("9876543210"), true);
  assert.equal(looksLikeMobile(" 7000010001 "), true);
  assert.equal(looksLikeMobile("5876543210"), false);
  assert.equal(looksLikeMobile("owner@shop.in"), false);
});

test("contract amounts: discount first, then GST", () => {
  assert.deepEqual(finalAmount({ amount: 15000, discountType: 1, discountValue: 1000, gst: 18 }), { gstValue: 2520, finalAmount: 16520 });
  assert.deepEqual(finalAmount({ amount: 6000, discountType: 2, discountValue: 10, gst: 18 }), { gstValue: 972, finalAmount: 6372 });
  assert.deepEqual(finalAmount({ amount: 100, discountType: 1, discountValue: 500, gst: 18 }), { gstValue: 0, finalAmount: 0 });
});

const valid = {
  businessName: "Annapurna Supermarket",
  businessTypeId: 1,
  stateId: 2,
  contactPerson: "Lakshmi",
  email: "Owner@Annapurna.in",
  mobile: "9876543210",
  city: "Hyderabad",
  address: "1 Main Road",
  adminPassword: "Strong#Pass1",
  amount: 15000,
  discountType: 1,
  discountValue: 1000,
  gst: 18,
  subscriptionDuration: 3,
  subscriptionAmount: 6000,
  subscriptionGst: 18,
  startDate: "2026-10-01",
  endDate: "2027-09-30",
  featureIds: [3, "4", 4, -1, "x"],
};

test("a complete onboarding form maps to zenx-pos users columns", () => {
  const { errors, value, featureIds, password } = validateNewClient(valid);
  assert.deepEqual(errors, {});
  assert.equal(value.email, "owner@annapurna.in");
  assert.equal(value.final_amount, 16520);
  assert.equal(value.subscription_final_amount, 7080);
  assert.equal(value.status, 1);
  assert.deepEqual(featureIds, [3, 4]);
  assert.equal(password, "Strong#Pass1");
});

test("onboarding rejects the same things zenx-pos rejects", () => {
  const { errors } = validateNewClient({
    ...valid,
    mobile: "1234567890",
    alternateMobile: "1234567890",
    gstNumber: "BAD",
    discountType: 2,
    discountValue: 120,
    endDate: "2026-09-01",
    adminPassword: "short",
    subscriptionDuration: 5,
  });
  for (const field of ["mobile", "alternateMobile", "gstNumber", "discountValue", "endDate", "adminPassword", "subscriptionDuration"]) {
    assert.ok(errors[field], `expected an error for ${field}`);
  }
});

test("only super admin tokens pass the super-admin guard", () => {
  const run = (user) => {
    let status = 200;
    let passed = false;
    requireSuperAdmin({ user }, { status: (s) => ({ json: () => { status = s; } }) }, () => { passed = true; });
    return passed ? "next" : status;
  };
  assert.equal(run({ role: "SUPER_ADMIN", adminId: 1 }), "next");
  assert.equal(run({ role: "SUPER_ADMIN" }), 403);
  assert.equal(run({ role: "ADMIN", adminId: 1, clientId: 5 }), 403);
  assert.equal(run(undefined), 403);
});
