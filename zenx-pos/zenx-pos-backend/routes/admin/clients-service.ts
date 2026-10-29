import { z } from 'zod'
import type { AdminIdentity } from '../../models/admin/contracts.ts'
import type { ClientAdminStore, ClientInput, LogoFile, LogoStorage } from '../../models/admin/client-contracts.ts'
import { ApiError } from '../auth/service.ts'

const mobile = /^[6-9]\d{9}$/
const blankToNull = (value: unknown) => typeof value === 'string' && !value.trim() ? null : value
const optionalMobile = z.preprocess(blankToNull, z.string().trim().regex(mobile).nullable().optional())
const optionalUrl = z.preprocess(blankToNull, z.string().trim().pipe(z.url()).nullable().optional())
// Zero is the existing database sentinel for an optional, unprovided pincode.
const pincode = z.preprocess(value => value == null || typeof value === 'string' && !value.trim() || value === 0 || value === '0' ? undefined : value, z.coerce.number().int().min(100000).max(999999).optional().default(0))
const password = z.preprocess(value => value === '' || value === null ? undefined : value, z.string().min(10).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/).optional())
const fieldLabels: Record<string, string> = { password: 'Admin password', business_name: 'Business name', business_type_id: 'Business type', contact_person_name: 'Contact person', alternate_mobile: 'Alternate mobile', state_id: 'State', pincode: 'Pincode', website_url: 'Website', max_users: 'Users allowed', start_date: 'Start date', end_date: 'End date' }
const validationMessages: Record<string, string> = {
  password: 'Use 10-128 characters with uppercase, lowercase, a number and a special character.',
  mobile: 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.',
  alternate_mobile: 'Enter a 10-digit Indian mobile number or leave this field blank.',
  pincode: 'Enter a six-digit pincode or leave this field blank.',
  max_users: 'Enter the number of users allowed (1 or more), or leave it blank for unlimited.',
  email: 'Enter a valid email address.', website_url: 'Enter a complete URL such as https://example.com, or leave this field blank.',
  business_type_id: 'Select a business type.', state_id: 'Select a state.',
  start_date: 'Enter a valid date in DD-MM-YYYY format.', end_date: 'Enter a valid date in DD-MM-YYYY format.',
}

export class ClientValidationError extends ApiError {
  readonly fieldErrors: Record<string, string>
  constructor(fieldErrors: Record<string, string>) {
    const entries = Object.entries(fieldErrors)
    const details = entries.slice(0, 3).map(([field, message]) => `${fieldLabels[field] ?? field.replaceAll('_', ' ')}: ${message}`).join(' ')
    super(422, `Invalid client details. ${details}${entries.length > 3 ? ' Check the other highlighted fields.' : ''}`)
    this.fieldErrors = fieldErrors
  }
}

function clientValidationError(error: z.ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'client'
    // Report rules and field names only; never include submitted values or passwords.
    fields[key] ??= validationMessages[key] ?? issue.message
  }
  return new ClientValidationError(fields)
}
const optional = (max: number) => z.string().trim().max(max).nullable().optional()
const initialPayment = z.object({ paid_amount: z.coerce.number().positive().max(1e9), payment_mode: z.coerce.number().int().positive(), reference_number: z.string().trim().max(255).nullable().optional(), payment_date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/), payment_type: z.coerce.number().int().min(1).max(2) })
const schema = z.object({
  business_name: z.string().trim().min(1).max(255), business_type_id: z.coerce.number().int().positive().safe(), email: z.string().trim().pipe(z.email().max(255)), contact_person_name: z.string().trim().min(1).max(255), mobile: z.string().trim().regex(mobile), alternate_mobile: optionalMobile, state_id: z.coerce.number().int().positive().safe(), city: z.string().trim().min(1).max(100), pincode, website_url: optionalUrl, address: z.string().trim().min(1).max(500), gst_number: optional(50), gst_code: z.preprocess(blankToNull, z.coerce.number().int().min(0).max(99).nullable().optional()), pan_number: optional(50), fssai_number: optional(50), license_number: optional(100), amount: z.coerce.number().finite().min(0).max(1e9), discount_type: z.coerce.number().int().min(0).max(2).default(0), discount_value: z.coerce.number().finite().min(0).max(1e9).default(0), gst: z.coerce.number().finite().min(0).max(100).default(0), start_date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/), end_date: z.string().regex(/^\d{2}-\d{2}-\d{4}$/), subscription_duration: z.coerce.number().int().min(1).max(3), subscription_amount: z.coerce.number().finite().min(0).max(1e9), subscription_discount_type: z.coerce.number().int().min(0).max(2).default(0), subscription_discount_value: z.coerce.number().finite().min(0).max(1e9).default(0), subscription_gst: z.coerce.number().finite().min(0).max(100).default(0), status: z.coerce.number().int().min(0).max(1), max_users: z.preprocess(blankToNull, z.coerce.number().int().min(1).max(10000).nullable().optional()), password, features: z.array(z.coerce.number().int().positive().safe()).max(100).default([]), sub_features: z.array(z.coerce.number().int().positive().safe()).max(500).default([]),
}).passthrough()
const clientSchema = schema.extend({ initial_payments: z.array(initialPayment).max(2).optional().default([]) }).passthrough()
function date(value: string) { const [d,m,y]=value.split('-').map(Number), result=new Date(Date.UTC(y!,m!-1,d)); if(result.getUTCFullYear()!==y||result.getUTCMonth()!==m!-1||result.getUTCDate()!==d) throw new ApiError(422,'Invalid calendar date.'); return result }
function numbers(value: unknown) { if (Array.isArray(value)) return value; if (typeof value === 'string') { try { const parsed=JSON.parse(value); return Array.isArray(parsed)?parsed:[] } catch { return value ? [value] : [] } } return [] }

export class ClientAdminService {
  readonly store: ClientAdminStore; readonly pageSize: number
  private readonly logos?: LogoStorage
  constructor(store: ClientAdminStore, pageSize=25, logos?:LogoStorage){if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('ADMIN_PAGE_SIZE is invalid.');this.store=store;this.pageSize=pageSize;this.logos=logos}
  input(raw: Record<string, unknown>, requirePassword=false) {
    const parsed=clientSchema.safeParse({...raw,features:numbers(raw.features),sub_features:numbers(raw.sub_features),initial_payments:numbers(raw.initial_payments)})
    if (!parsed.success) throw clientValidationError(parsed.error)
    if (requirePassword && !parsed.data.password) throw new ClientValidationError({ password: 'A password is required for a new client.' })
    const x=parsed.data,start=date(x.start_date),end=date(x.end_date)
    if (end <= start) throw new ClientValidationError({ end_date: 'End date must be after start date.' })
    if (x.alternate_mobile === x.mobile) throw new ClientValidationError({ alternate_mobile: 'Alternate mobile must differ from the primary mobile.' })
    if(x.discount_type===1&&x.discount_value>x.amount||x.discount_type===2&&x.discount_value>100||x.subscription_discount_type===1&&x.subscription_discount_value>x.subscription_amount||x.subscription_discount_type===2&&x.subscription_discount_value>100)throw new ApiError(422,'Invalid discount.')
    const value:ClientInput={businessName:x.business_name,businessTypeId:x.business_type_id,email:x.email.toLowerCase(),contactPerson:x.contact_person_name,mobile:x.mobile,alternateMobile:x.alternate_mobile??null,stateId:x.state_id,city:x.city,pincode:x.pincode,websiteUrl:x.website_url??null,address:x.address,gstNumber:x.gst_number??null,gstCode:x.gst_code??null,panNumber:x.pan_number??null,fssaiNumber:x.fssai_number??null,licenseNumber:x.license_number??null,amount:x.amount,discountType:x.discount_type,discountValue:x.discount_value,gst:x.gst,startDate:start,endDate:end,subscriptionDuration:x.subscription_duration,subscriptionAmount:x.subscription_amount,subscriptionDiscountType:x.subscription_discount_type,subscriptionDiscountValue:x.subscription_discount_value,subscriptionGst:x.subscription_gst,status:x.status,maxUsers:x.max_users??null,...(x.password?{password:x.password}:{})}
    const types=x.initial_payments.map(payment=>payment.payment_type)
    if(new Set(types).size!==types.length||x.initial_payments.some(payment=>payment.payment_mode!==1&&!payment.reference_number))throw new ApiError(422,'Invalid initial payment.')
    return {value,featureIds:x.features.map(BigInt),subFeatureIds:x.sub_features.map(BigInt),initialPayments:x.initial_payments.map(payment=>({amount:payment.paid_amount,mode:payment.payment_mode,reference:payment.reference_number??null,date:date(payment.payment_date),type:payment.payment_type}))}
  }
  async create(raw:Record<string,unknown>,actor:AdminIdentity,logo?:LogoFile){const x=this.input(raw,true);if(!await this.store.identityAvailable(x.value.email,x.value.mobile)||!await this.store.validateReferences(x.value))throw new ApiError(409,'Client identity or reference already exists.');if(logo&&!this.logos)throw new ApiError(503,'Logo storage is not configured.');let path:string|undefined;try{if(logo)path=await this.logos!.save(logo);return await this.store.create({...x.value,password:x.value.password!},actor,x.featureIds,x.subFeatureIds,path,x.initialPayments)}catch(error){if(path)await this.logos!.remove(path).catch(()=>{});if(error instanceof Error&&error.message==='INVALID_LOGO_CONTENT')throw new ApiError(422,'Invalid logo image.');if(error instanceof Error&&error.message==='INVALID_FEATURE_SELECTION')throw new ApiError(422,'Invalid feature selection.');throw error}}
  async update(id:bigint,raw:Record<string,unknown>,actor:AdminIdentity,logo?:LogoFile){
    const x=this.input(raw),withFeatures=Object.hasOwn(raw,'features')||Object.hasOwn(raw,'sub_features')
    if(!await this.store.identityAvailable(x.value.email,x.value.mobile,id)||!await this.store.validateReferences(x.value))throw new ApiError(409,'Client identity or reference already exists.')
    if(logo&&!this.logos)throw new ApiError(503,'Logo storage is not configured.')
    let path:string|undefined
    try{
      if(logo)path=await this.logos!.save(logo)
      const result=await this.store.update(id,x.value,actor,path,...(withFeatures?[x.featureIds,x.subFeatureIds] as const:[]))
      if(!result.updated){if(path)await this.logos!.remove(path).catch(()=>{});throw new ApiError(404,'Client not found.')}
      if(path&&result.oldLogo?.startsWith('uploads/business_logos/'))await this.logos!.remove(result.oldLogo).catch(()=>{})
    }catch(error){
      if(path&&!(error instanceof ApiError))await this.logos!.remove(path).catch(()=>{})
      if(error instanceof Error&&error.message==='INVALID_LOGO_CONTENT')throw new ApiError(422,'Invalid logo image.')
      if(error instanceof Error&&error.message==='INVALID_FEATURE_SELECTION')throw new ApiError(422,'Invalid feature selection.')
      throw error
    }
  }
  async setStatus(id:bigint,raw:unknown,actor:AdminIdentity){const parsed=z.object({status:z.coerce.number().int().min(0).max(1)}).safeParse(raw);if(!parsed.success)throw new ApiError(422,'Invalid client status.');if(!await this.store.setStatus(id,parsed.data.status,actor))throw new ApiError(404,'Client not found.')}
  async list(raw:Record<string,unknown>,contracts=false){const page=Math.max(1,Number(raw.page)||1),status=raw.status===''||raw.status==null?undefined:Number(raw.status),businessTypeId=Number(raw.business_type)||undefined,subscriptionDuration=contracts?Number(raw.amc_type)||undefined:undefined;return this.store.list({page,take:this.pageSize,...(typeof raw.search_str==='string'&&raw.search_str.trim()?{search:raw.search_str.trim().slice(0,100)}:{}),...(status===0||status===1?{status}:{}),...(businessTypeId?{businessTypeId}:{}),...(subscriptionDuration?{subscriptionDuration}:{})})}
  async updateFeatures(raw:Record<string,unknown>,actor:AdminIdentity){const clientId=Number(raw.user_id),features=numbers(raw.features).map(Number),subs=numbers(raw.sub_features).map(Number);if(!Number.isSafeInteger(clientId)||clientId<1||features.some(x=>!Number.isSafeInteger(x)||x<1)||subs.some(x=>!Number.isSafeInteger(x)||x<1))throw new ApiError(422,'Invalid feature selection.');try{if(!await this.store.updateFeatures(BigInt(clientId),features.map(BigInt),subs.map(BigInt),actor))throw new ApiError(404,'Client not found.')}catch(e){if(e instanceof ApiError)throw e;if(e instanceof Error&&e.message==='INVALID_FEATURE_SELECTION')throw new ApiError(422,'Invalid feature selection.');throw e}}
  async payment(raw:Record<string,unknown>,actor:AdminIdentity){const p=z.object({user_id:z.coerce.number().int().positive().safe(),paid_amount:z.coerce.number().positive().max(1e9),payment_mode:z.coerce.number().int().positive(),reference_number:z.string().trim().max(255).nullable().optional(),payment_date:z.string().regex(/^\d{2}-\d{2}-\d{4}$/),payment_type:z.coerce.number().int().min(1).max(2),extend_contract:z.coerce.number().int().min(0).max(1).default(0)}).safeParse(raw);if(!p.success||p.data.payment_mode!==1&&!p.data.reference_number)throw new ApiError(422,'Invalid payment.');if(!await this.store.storePayment({clientId:BigInt(p.data.user_id),amount:p.data.paid_amount,mode:p.data.payment_mode,reference:p.data.reference_number??null,date:date(p.data.payment_date),type:p.data.payment_type,extendContract:p.data.extend_contract===1},actor))throw new ApiError(404,'Client not found.')}
  async collections(raw:Record<string,unknown>){const from=typeof raw.from_date==='string'&&raw.from_date?date(raw.from_date):undefined,to=typeof raw.to_date==='string'&&raw.to_date?date(raw.to_date):undefined;if(from&&to&&to<from)throw new ApiError(422,'Invalid date range.');return this.store.collections(from,to,Math.max(1,Number(raw.page)||1),this.pageSize)}
}
