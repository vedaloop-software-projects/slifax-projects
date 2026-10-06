/*
 * Seeds demo clients into the zenx-pos database the label app reads from.
 *
 *   npm run seed:clients               add the demo clients (skips ones already there)
 *   npm run seed:clients -- --dry-run  show what would be added, change nothing
 *   npm run seed:clients:undo          remove every demo client this script added
 *
 * Optional: SEED_SUPER_ADMIN_MOBILE + SEED_SUPER_ADMIN_PASSWORD also create a zenx-pos
 * super admin (admins table, legacy md5 password) when that mobile is not taken.
 * SEED_PASSWORD overrides the default password for every seeded login.
 *
 * Each client is written the way zenx-pos onboarding writes it (users row, Admin role,
 * admin login, client_features, role access) plus a Manager and a Billing Staff login,
 * a category, a tax and a few products so every role can be tested end to end.
 * Seeded rows are recognised only by the reserved `.seed.example` email domain.
 */
require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// src/config/db.js needs these; fail with a clear message instead of a stack trace.
const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_SSL_CA"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  if (process.env.DB_DATABASE || process.env.DB_USERNAME) {
    console.error("Your .env uses Laravel names (DB_DATABASE / DB_USERNAME). This backend reads DB_NAME / DB_USER.");
  }
  console.error("Use the same values as the deployed backend (Cloud Run): DB_PORT=4000, DB_NAME=zenxpos_dev, DB_SSL_CA=certs/ca.pem.");
  process.exit(1);
}
if (!fs.existsSync(path.resolve(process.env.DB_SSL_CA))) {
  console.error(`DB_SSL_CA file not found: ${process.env.DB_SSL_CA}`);
  process.exit(1);
}

const { pool } = require("../src/config/db");
const productService = require("../src/services/product.service");
const { finalAmount } = require("../src/services/client.rules");
const { insertWithId } = require("../src/services/insert-with-id");
const { hashPassword } = require("../src/services/passwords");

const DOMAIN = "seed.example";
const PASSWORD = process.env.SEED_PASSWORD || "Label@123";

const CLIENTS = [
  { slug: "vijayadurga", business: "Vijaya Durga Kirana Stores", contact: "Srinivas Rao", city: "Vijayawada", state: "Andhra Pradesh", type: ["grocery", "kirana", "retail"] },
  { slug: "annapurna", business: "Annapurna Supermarket", contact: "Lakshmi Prasad", city: "Hyderabad", state: "Telangana", type: ["supermarket", "grocery", "retail"] },
  { slug: "sriram", business: "Sri Ram Sweets & Bakery", contact: "Ramesh Kumar", city: "Guntur", state: "Andhra Pradesh", type: ["bakery", "sweet", "restaurant"] },
  { slug: "greenleaf", business: "Green Leaf Organics", contact: "Kavya Reddy", city: "Bengaluru", state: "Karnataka", type: ["grocery", "retail"] },
  { slug: "medplus", business: "Sai Medicals", contact: "Mohan Varma", city: "Visakhapatnam", state: "Andhra Pradesh", type: ["pharmacy", "medical", "retail"] },
  { slug: "dailyfresh", business: "Daily Fresh Mart", contact: "Anil Sharma", city: "Chennai", state: "Tamil Nadu", type: ["supermarket", "grocery", "retail"] },
  { slug: "kalyan", business: "Kalyan Dry Fruits", contact: "Priya Nair", city: "Kochi", state: "Kerala", type: ["grocery", "retail"] },
  { slug: "spicehub", business: "Spice Hub Masalas", contact: "Farhan Ali", city: "Warangal", state: "Telangana", type: ["grocery", "retail"] },
];

const PRODUCTS = [
  { name: "Toor Dal", pack: "1 KG", mrp: 195, sale: 168, hsn: "0713" },
  { name: "Sona Masoori Rice", pack: "5 KG", mrp: 420, sale: 389, hsn: "1006" },
  { name: "Groundnut Oil", pack: "1 L", mrp: 230, sale: 214, hsn: "1508" },
  { name: "Turmeric Powder", pack: "200 G", mrp: 72, sale: 65, hsn: "0910" },
];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const UNDO = args.has("--undo");

const mobile = (series, index) => `70000${series}00${String(index + 1).padStart(2, "0")}`;

const pickByKeyword = (rows, column, keywords) => {
  for (const word of keywords) {
    const hit = rows.find((r) => String(r[column] ?? "").toLowerCase().includes(word));
    if (hit) return hit;
  }
  return rows[0];
};

const seededClientIds = async (connection) => {
  const [rows] = await connection.query("SELECT id FROM users WHERE email LIKE ?", [`%@%.${DOMAIN}`]);
  return rows.map((r) => r.id);
};

async function undo() {
  const connection = await pool.getConnection();
  try {
    const ids = await seededClientIds(connection);
    if (!ids.length) {
      console.log("No seeded clients found. Nothing to remove.");
      return;
    }
    console.log(`Removing ${ids.length} seeded clients: ${ids.join(", ")}${DRY_RUN ? " (dry run)" : ""}`);
    if (DRY_RUN) return;
    await connection.beginTransaction();
    for (const table of [
      "product_controls", "product_variants", "products",
      "sub_categories", "categories", "brands", "unit_types", "sizes", "colours", "taxes",
      "client_role_billing_access", "client_role_features", "client_features", "client_users", "client_roles", "audits",
    ]) {
      const [result] = await connection.query(`DELETE FROM ${table} WHERE client_id IN (?)`, [ids]);
      console.log(`  ${table}: ${result.affectedRows}`);
    }
    const [result] = await connection.query(`DELETE FROM users WHERE id IN (?) AND email LIKE ?`, [ids, `%@%.${DOMAIN}`]);
    console.log(`  users: ${result.affectedRows}`);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function taken(connection, email, mobiles) {
  const [[byEmail]] = await connection.query(
    "SELECT (SELECT COUNT(*) FROM users WHERE LOWER(email) = ?) + (SELECT COUNT(*) FROM client_users WHERE LOWER(email) = ?) AS n",
    [email, email]
  );
  const [[byMobile]] = await connection.query(
    "SELECT (SELECT COUNT(*) FROM users WHERE mobile IN (?)) + (SELECT COUNT(*) FROM client_users WHERE mobile IN (?)) + (SELECT COUNT(*) FROM admins WHERE mobile IN (?)) AS n",
    [mobiles, mobiles, mobiles]
  );
  return { email: Number(byEmail.n) > 0, mobile: Number(byMobile.n) > 0 };
}

async function seedClient(connection, spec, index, refs, adminId) {
  const email = `owner@${spec.slug}.${DOMAIN}`;
  const logins = [
    { title: "Admin", isAdmin: 1, name: spec.contact, email, mobile: mobile(1, index), access: "full" },
    { title: "Store Manager", isAdmin: 0, name: `${spec.contact.split(" ")[0]} (Manager)`, email: `manager@${spec.slug}.${DOMAIN}`, mobile: mobile(2, index), access: "full" },
    { title: "Billing Staff", isAdmin: 0, name: `${spec.contact.split(" ")[0]} (Billing)`, email: `staff@${spec.slug}.${DOMAIN}`, mobile: mobile(3, index), access: "view" },
  ];

  const clash = await taken(connection, email, logins.map((l) => l.mobile));
  if (clash.email) return { skipped: `${spec.business} already exists (${email})` };
  if (clash.mobile) return { skipped: `${spec.business}: a seed mobile is already used by a real account, not touching it` };
  if (DRY_RUN) return { planned: `${spec.business} with logins ${logins.map((l) => l.email).join(", ")}` };

  const type = pickByKeyword(refs.businessTypes, "business_type", spec.type);
  const state = pickByKeyword(refs.states, "state_name", [spec.state.toLowerCase()]);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start.getFullYear() + 1, start.getMonth(), 0);
  const gst = refs.gst;
  const contract = finalAmount({ amount: 15000, discountType: 1, discountValue: 1000, gst });
  const subscription = finalAmount({ amount: 6000, discountType: 2, discountValue: 10, gst });

  await connection.beginTransaction();
  try {
    const clientId = await insertWithId(connection, "users", {
      name: "",
      business_name: spec.business,
      business_type_id: type.id,
      email,
      mobile: logins[0].mobile,
      contact_person: spec.contact,
      state_id: state.id,
      city: spec.city,
      pincode: 0,
      address: `${12 + index}-${4 + index}, Main Road, ${spec.city}`,
      amount: 15000,
      discount_type: 1,
      discount_value: 1000,
      gst,
      gst_value: contract.gstValue,
      final_amount: contract.finalAmount,
      subscription_duration: 3,
      subscription_amount: 6000,
      subscription_discount_type: 2,
      subscription_discount_value: 10,
      subscription_gst: gst,
      subscription_gst_value: subscription.gstValue,
      subscription_final_amount: subscription.finalAmount,
      paid_amount: index % 3 === 0 ? contract.finalAmount : 0,
      start_date: start,
      end_date: end,
      password: null,
      status: index === CLIENTS.length - 1 ? 0 : 1, // one inactive client to test blocking
      trash: 0,
      created_by: adminId,
      updated_by: 0,
      created_at: now,
      updated_at: now,
    });
    const hash = await hashPassword(PASSWORD);
    const created = [];

    for (const login of logins) {
      const role = await insertWithId(connection, "client_roles", { client_id: clientId, role_title: login.title, status: 1, trash: 0, created_by: 0, created_at: now, updated_at: now });
      const user = await insertWithId(connection, "client_users", {
        client_id: clientId, name: login.name, email: login.email, mobile: login.mobile, password: hash,
        role_id: role, max_discount_percentage: 0, is_admin: login.isAdmin, status: 1, trash: 0,
        created_by: 0, created_at: now, updated_at: now,
      });
      created.push({ ...login, roleId: role, userId: user });
    }
    const ownerId = created[0].userId;
    await connection.query("UPDATE client_users SET created_by = ? WHERE client_id = ?", [ownerId, clientId]);
    await connection.query("UPDATE client_roles SET created_by = ? WHERE client_id = ?", [ownerId, clientId]);

    // Every active feature enabled for the client; Admin/Manager full access, staff view-only.
    for (const feature of refs.features) {
      const subs = refs.subFeatures.filter((s) => Number(s.feature_id) === Number(feature.id));
      for (const subId of subs.length ? subs.map((s) => s.id) : [0]) {
        await insertWithId(connection, "client_features", { client_id: clientId, feature_id: feature.id, sub_feature_id: subId, status: 1, created_by: adminId, created_at: now, updated_at: now });
        for (const login of created) {
          const full = login.access === "full" ? 1 : 0;
          await insertWithId(connection, "client_role_features", {
            client_id: clientId, role_id: login.roleId, feature_id: feature.id, sub_feature_id: subId,
            is_add: full, is_edit: full, is_view: 1, status: 1, trash: 0, created_by: ownerId, created_at: now, updated_at: now,
          });
        }
      }
    }

    const category = await insertWithId(connection, "categories", { client_id: clientId, category_name: "Groceries", category_code: "GRO", status: 1, trash: 0, created_by: ownerId, created_at: now, updated_at: now });
    const tax = await insertWithId(connection, "taxes", { client_id: clientId, tax_code: "GST5", tax_name: "GST 5%", tax_percent: 5, status: 1, trash: 0, created_by: ownerId, created_at: now, updated_at: now });
    await insertWithId(connection, "audits", { type: "add", description: "Admin role access levels added", client_id: clientId, user_id: ownerId, created_at: now });
    await connection.commit();

    // Products go through the same service the app uses, so they pass its validation.
    for (const [n, p] of PRODUCTS.entries()) {
      await productService.createProduct({
        clientId,
        userId: ownerId,
        input: {
          productCode: `${index + 1}${String(n + 1).padStart(3, "0")}0415`.slice(0, 8),
          productShortName: p.name.toUpperCase().slice(0, 30),
          productFullName: `${p.name} ${p.pack}`,
          categoryId: Number(category),
          hsnCode: p.hsn,
          taxId: Number(tax),
          qoh: 100,
          status: 1,
          variant: { packSize: p.pack, mrp: p.mrp, salePrice: p.sale, costPrice: Math.round(p.sale * 0.85) },
        },
      });
    }

    return { clientId, logins: created };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  }
}

async function ensureSuperAdmin(connection) {
  const mobileNo = process.env.SEED_SUPER_ADMIN_MOBILE;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!mobileNo || !password) return null;
  if (!/^[6-9]\d{9}$/.test(mobileNo)) throw new Error("SEED_SUPER_ADMIN_MOBILE must be a 10-digit mobile");
  const [[existing]] = await connection.query("SELECT id FROM admins WHERE mobile = ? LIMIT 1", [mobileNo]);
  if (existing) {
    console.log(`Super admin ${mobileNo} already exists (id ${existing.id}); password unchanged.`);
    return Number(existing.id);
  }
  if (DRY_RUN) {
    console.log(`Would create super admin ${mobileNo}`);
    return 0;
  }
  const now = new Date();
  const md5 = crypto.createHash("md5").update(password).digest("hex"); // zenx-pos admin login format
  const result = await insertWithId(connection, "admins", { name: "Super Admin", mobile: mobileNo, password: md5, status: 1, trash: 0, created_by: 0, updated_by: 0, created_at: now, updated_at: now });
  console.log(`Created super admin ${mobileNo} (id ${result}).`);
  return Number(result);
}

async function seed() {
  const connection = await pool.getConnection();
  try {
    const [businessTypes] = await connection.query("SELECT id, business_type FROM business_types WHERE status = 1 AND trash = 0 ORDER BY id");
    const [states] = await connection.query("SELECT id, state_name FROM states WHERE status = 1 AND trash = 0 ORDER BY id");
    const [features] = await connection.query("SELECT id FROM features WHERE status = 1 AND trash = 0 ORDER BY id");
    const [subFeatures] = await connection.query("SELECT id, feature_id FROM sub_features WHERE status = 1 AND trash = 0 ORDER BY id");
    if (!businessTypes.length || !states.length) {
      throw new Error("business_types and states must have at least one active row (they come from zenx-pos). Seed those first.");
    }

    const adminId = (await ensureSuperAdmin(connection)) ?? 0;
    const [gstRows] = await connection.query("SELECT gst FROM gsts ORDER BY id DESC LIMIT 1");
    const refs = { businessTypes, states, features, subFeatures, gst: gstRows.length ? Number(gstRows[0].gst) || 0 : 18 };
    const summary = [];

    for (const [index, spec] of CLIENTS.entries()) {
      const result = await seedClient(connection, spec, index, refs, adminId);
      if (result.skipped) console.log(`skip  ${result.skipped}`);
      else if (result.planned) console.log(`plan  ${result.planned}`);
      else {
        console.log(`added ${spec.business} (client ${result.clientId})`);
        summary.push(...result.logins.map((l) => ({ business: spec.business, role: l.title, email: l.email, mobile: l.mobile })));
      }
    }

    if (summary.length) {
      console.log(`\nLogins (password for all: ${process.env.SEED_PASSWORD ? "value of SEED_PASSWORD" : PASSWORD}):`);
      console.table(summary);
      console.log(`"${CLIENTS[CLIENTS.length - 1].business}" is seeded INACTIVE so you can check that its users are blocked.`);
    }
  } finally {
    connection.release();
  }
}

(UNDO ? undo() : seed())
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
