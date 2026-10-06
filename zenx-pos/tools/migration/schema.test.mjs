import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileSchema } from './schema.mjs'

const migration = (name, body) => ({ name, text: `<?php\nclass Migration {\n    public function up(): void\n    {\n${body}\n    }\n    public function down(): void\n    {\n    }\n}` })

test('schema compiler preserves numeric precision, nullability, defaults, indexes and alter additions', () => {
  const { schema, report } = compileSchema([
    migration('1.php', "Schema::create('users', function (Blueprint $table) { $table->id(); $table->decimal('amount', 15, 3)->default(0); $table->double('price', 10, 2); $table->string('name')->nullable()->unique(); $table->timestamps(); });"),
    migration('2.php', "Schema::table('users', function (Blueprint $table) { $table->string('contact', 100)->after('name'); });"),
  ])
  assert.match(schema, /amount Decimal @default\(0\) @db.Decimal\(15, 3\)/)
  assert.match(schema, /price Float\s+@db.Double/)
  assert.match(schema, /name String\?/)
  assert.match(schema, /@@unique\(\[name\]/)
  assert.match(schema, /id BigInt @id @default\(autoincrement\(\)\) @db.UnsignedBigInt/)
  assert.match(schema, /contact String\s+@db.VarChar\(100\)/)
  assert.equal(report.columnCount, 7)
  assert.deepEqual(report.floatingColumns, ['users.price'])
})

test('schema compiler preserves foreign-key actions and reports missing targets without inventing them', () => {
  const { schema, report } = compileSchema([
    migration('1.php', "Schema::create('users', function (Blueprint $table) { $table->id(); });"),
    migration('2.php', "Schema::create('orders', function (Blueprint $table) { $table->id(); $table->unsignedBigInteger('user_id')->nullable(); $table->foreign('user_id')->references('id')->on('users')->nullOnDelete(); $table->unsignedBigInteger('client_id'); $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete(); });"),
  ])
  assert.match(schema, /onDelete: SetNull/)
  assert.match(schema, /rel_user_id Users\?/)
  assert.equal(report.unresolvedForeignKeys.length, 1)
  assert.equal(report.unresolvedForeignKeys[0].target, 'clients')
  assert.match(schema, /REVIEW: orders_client_id_foreign/)
  assert.doesNotMatch(schema, /model Clients/)
})

test('schema compiler rejects unfamiliar source instead of silently dropping it', () => {
  assert.throws(() => compileSchema([migration('1.php', "DB::statement('anything');")]), /Untranslated/)
  assert.throws(() => compileSchema([migration('1.php', "Schema::create('items', function (Blueprint $table) { $table->id(); $table->geometry('shape'); });")]), /Unsupported type/)
  assert.throws(() => compileSchema([migration('1.php', "Schema::create('items', function (Blueprint $table) { $table->id(); $table->id(); });")]), /duplicate column/)
})
