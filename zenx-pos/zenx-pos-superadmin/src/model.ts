export type Admin = { id: string; name: string; mobile: string }
export type Row = Record<string, unknown> & { id: string }
export type ListResult = { data: Row[]; meta: { total: number; pageSize: number }; summary?: Record<string, number> }

export type FieldKind = 'text' | 'mobile' | 'password' | 'number' | 'status' | 'parent' | 'file'
export type Field = { key: string; label: string; kind: FieldKind; required?: boolean; parent?: 'features' | 'businessTypes' }
export type Resource = {
  key: string
  title: string
  singular: string
  list: string
  create: string
  edit: string
  update: string
  remove: string
  searchPlaceholder: string
  fields: Field[]
  columns: { key: string; label: string }[]
  filter?: { key: string; label: string; parent: 'features' | 'businessTypes' }
}

export const resources: Resource[] = [
  { key: 'business-types', title: 'Business Types', singular: 'business type', list: 'business_types', create: 'add/business_type', edit: 'edit/business_type', update: 'update/business_type', remove: 'delete/business_type', searchPlaceholder: 'Search business type', fields: [{ key: 'business_type', label: 'Business type', kind: 'text', required: true }, { key: 'display_name', label: 'Display name', kind: 'text', required: true }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'business_type', label: 'Business type' }, { key: 'display_name', label: 'Display name' }, { key: 'status', label: 'Status' }] },
  { key: 'features', title: 'Features', singular: 'feature', list: 'features', create: 'add/feature', edit: 'edit/feature', update: 'update/feature', remove: 'delete/feature', searchPlaceholder: 'Search feature', fields: [{ key: 'feature', label: 'Feature name', kind: 'text', required: true }, { key: 'priority', label: 'Priority', kind: 'number', required: true }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'feature', label: 'Feature' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }] },
  { key: 'sub-features', title: 'Sub Features', singular: 'sub feature', list: 'sub_features', create: 'add/sub_feature', edit: 'edit/sub_feature', update: 'update/sub_feature', remove: 'delete/sub_feature', searchPlaceholder: 'Search sub feature', filter: { key: 'feature_id', label: 'All features', parent: 'features' }, fields: [{ key: 'feature_id', label: 'Parent feature', kind: 'parent', parent: 'features', required: true }, { key: 'sub_feature', label: 'Sub feature', kind: 'text', required: true }, { key: 'priority', label: 'Priority', kind: 'number', required: true }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'feature_id', label: 'Feature' }, { key: 'sub_feature', label: 'Sub feature' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }] },
  { key: 'admins', title: 'Admin Management', singular: 'admin', list: 'admins', create: 'add/admin', edit: 'edit/admin', update: 'update/admin', remove: 'delete/admin', searchPlaceholder: 'Search admin name', fields: [{ key: 'name', label: 'Name', kind: 'text', required: true }, { key: 'mobile', label: 'Mobile', kind: 'mobile', required: true }, { key: 'password', label: 'Password', kind: 'password' }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'name', label: 'Name' }, { key: 'mobile', label: 'Mobile' }, { key: 'status', label: 'Status' }] },
  { key: 'key-mappings', title: 'Key Mapping', singular: 'key mapping', list: 'key_maps', create: 'add/key_map', edit: 'edit/key_map', update: 'update/key_map', remove: 'delete/key_map', searchPlaceholder: 'Search key name', fields: [{ key: 'key_name', label: 'Key name', kind: 'text', required: true }, { key: 'short_key', label: 'Shortcut', kind: 'text' }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'key_name', label: 'Key name' }, { key: 'short_key', label: 'Shortcut' }, { key: 'status', label: 'Status' }] },
  { key: 'bill-columns', title: 'Bill Columns', singular: 'bill column', list: 'bill_columns', create: 'add/bill_column', edit: 'edit/bill_column', update: 'update/bill_column', remove: 'delete/bill_column', searchPlaceholder: 'Search column', fields: [{ key: 'col_name', label: 'Column name', kind: 'text', required: true }, { key: 'app_status', label: 'Available in app', kind: 'status', required: true }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'col_name', label: 'Column' }, { key: 'app_status', label: 'App' }, { key: 'status', label: 'Status' }] },
  { key: 'coupon-usage-types', title: 'Coupon Usage Types', singular: 'coupon usage type', list: 'coupon_usage_types', create: 'add/coupon_usage_type', edit: 'edit/coupon_usage_type', update: 'update/coupon_usage_type', remove: 'delete/coupon_usage_type', searchPlaceholder: 'Search usage type', fields: [{ key: 'title', label: 'Title', kind: 'text', required: true }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }] },
  { key: 'bill-formats', title: 'Bill Formats', singular: 'bill format', list: 'bill_formats', create: 'add/bill_format', edit: 'edit/bill_format', update: 'update/bill_format', remove: 'delete/bill_format', searchPlaceholder: 'Search format title', filter: { key: 'business_type_id', label: 'All business types', parent: 'businessTypes' }, fields: [{ key: 'business_type_id', label: 'Business type', kind: 'parent', parent: 'businessTypes', required: true }, { key: 'title', label: 'Title', kind: 'text', required: true }, { key: 'size', label: 'Paper size', kind: 'text', required: true }, { key: 'file', label: 'Template file', kind: 'file' }, { key: 'status', label: 'Status', kind: 'status', required: true }], columns: [{ key: 'title', label: 'Title' }, { key: 'business_type_id', label: 'Business type' }, { key: 'size', label: 'Size' }, { key: 'file', label: 'File' }, { key: 'status', label: 'Status' }] },
]

export const resourceByKey = Object.fromEntries(resources.map((resource) => [resource.key, resource]))
