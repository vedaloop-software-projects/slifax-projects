import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapLoginUser, mapProductDetail, mapProductListRow, roleFromBackend } from '../src/api/zenxpos.ts'

test('maps the converted ZenxPOS login response and token', () => {
  const mapped = mapLoginUser({
    id: 13, token: 'jwt', name: 'Praveen', email: 'p@example.com', mobile: '9999999999',
    clientId: 8, businessName: 'KPN Fresh Mart', address: 'Main road', city: 'Hyderabad',
    roleTitle: 'Billing Admin', permissions: [],
  })
  assert.equal(mapped.token, 'jwt')
  assert.equal(mapped.user.role, 'ADMIN')
  assert.equal(mapped.user.clientId, '8')
  assert.equal(mapped.user.businessAddress, 'Main road')
})

test('uses backend access levels to distinguish managers from print users', () => {
  assert.equal(roleFromBackend({ roleTitle: 'Cashier', permissions: [{ subFeatures: [{ add: 0, edit: 0 }] }] }), 'USER')
  assert.equal(roleFromBackend({ roleTitle: 'Stock lead', permissions: [{ subFeatures: [{ add: 1, edit: 0 }] }] }), 'ADMIN')
})

test('maps product list fields used by barcode search and printing', () => {
  const product = mapProductListRow({
    productId: 20, variantId: 31, productCode: 'PRD20', productShortName: 'Milk',
    productFullName: 'Toned Milk', eanCode: '8901234567890', hsnCode: '0401',
    categoryId: 2, categoryName: 'Dairy', brandId: 3, brandName: 'Amul', taxId: 4,
    packSize: '1 litre', mrp: 60, salePrice: 58, status: 1,
  })
  assert.equal(product.id, 'product_20_variant_31')
  assert.equal(product.globalId, 'product_20_variant_31')
  assert.equal(product.backendProductId, 20)
  assert.equal(product.variantId, 31)
  assert.equal(product.unit, '1 litre')
  assert.equal(product.mrp, 60)
  assert.equal(product.status, 'ACTIVE')
})

test('maps nested getProductById data and selects the requested variant', () => {
  const product = mapProductDetail({
    productDetails: { id: 20, productCode: 'PRD20', productShortName: 'Milk', categoryName: 'Dairy', status: 1 },
    variants: [{ id: 31, packSize: '500 ml', mrp: 30, salePrice: 28 }, { id: 32, packSize: '1 litre', mrp: 60, salePrice: 58 }],
  }, 32)
  assert.equal(product.variantId, 32)
  assert.equal(product.unit, '1 litre')
  assert.equal(product.salePrice, 58)
})
