import bcrypt from 'bcryptjs'
import { loadDatabaseConfig } from './config.ts'
import { createDatabase } from './client.ts'

const mobile = process.env.ADMIN_RESET_MOBILE?.trim() ?? ''
const password = process.env.ADMIN_RESET_PASSWORD ?? ''
// ADMIN_CREATE_FIRST=true creates the first super-admin on a new database. It refuses when any
// super-admin already exists, so it cannot be used to add accounts to a running environment.
const createFirst = process.env.ADMIN_CREATE_FIRST === 'true'
const name = process.env.ADMIN_RESET_NAME?.trim() || 'Super Admin'

if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('ADMIN_RESET_MOBILE must be a valid 10-digit mobile number.')
if (password.length < 12 || password.length > 128) throw new Error('ADMIN_RESET_PASSWORD must contain 12 to 128 characters.')
if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  throw new Error('ADMIN_RESET_PASSWORD must include upper-case, lower-case, number, and symbol characters.')
}

const config = loadDatabaseConfig()
if (!config) throw new Error('DATABASE_URL is required.')
const database = createDatabase(config)

try {
  const hash = await bcrypt.hash(password, 12)
  const admin = await database.prisma.admins.findFirst({ where: { mobile } })
  if (!admin && createFirst) {
    if (await database.prisma.admins.count() > 0) throw new Error('A super-admin already exists; ADMIN_CREATE_FIRST is only for a new database.')
    const now = new Date()
    await database.prisma.admins.create({ data: { name, mobile, password: hash, status: 1, trash: 0, created_by: 0, updated_by: 0, created_at: now, updated_at: now } })
    console.log(`First super-admin created for mobile ending ${mobile.slice(-4)}.`)
  } else {
    if (!admin) throw new Error('Super-admin account was not found.')
    if (admin.status !== 1 || admin.trash !== 0) throw new Error('Super-admin account is inactive or deleted; review the record before reactivating it.')
    const result = await database.prisma.admins.updateMany({
      where: { id: admin.id, status: 1, trash: 0 },
      data: { password: hash, updated_by: Number(admin.id), updated_at: new Date() },
    })
    if (result.count !== 1) throw new Error('Super-admin password was not updated.')
    console.log(`Super-admin password reset completed for mobile ending ${mobile.slice(-4)}.`)
  }
} finally {
  await database.close()
}
