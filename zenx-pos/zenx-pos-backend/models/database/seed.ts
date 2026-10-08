import { randomBytes, randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { loadDatabaseConfig } from './config.ts'
import { createDatabase } from './client.ts'

const generatedPassword=()=>`Zx1!${randomBytes(18).toString('base64url')}`
const generatedMobile=()=>`9${String(randomInt(0,1_000_000_000)).padStart(9,'0')}`
const adminPassword=generatedPassword()
const shopPassword=generatedPassword()
const values={
  adminName:'Super Admin', adminMobile:generatedMobile(), shopName:'Demo Shop', ownerName:'Demo Owner',
  shopEmail:`demo-${randomBytes(6).toString('hex')}@zenxpos.local`, shopMobile:generatedMobile(),
}

const featureNames=['Master','Products','Customers','Billing','KOT','Users','Workforce','Expense','Coupons','Kit','Stock Adjustment','Transfer In','Transfer Out','Happy Hours','Discounts','Salon Appointments','Settings','Hot Keys'] as const
const config=loadDatabaseConfig()
if(!config)throw new Error('DATABASE_URL is required.')
const database=createDatabase(config)
let adminCreated=false,shopUserCreated=false
try{
  const result=await database.prisma.$transaction(async tx=>{
    const now=new Date(),adminHash=await bcrypt.hash(adminPassword,12),shopHash=await bcrypt.hash(shopPassword,12)
    const existingAdmin=await tx.admins.findFirst({where:{name:values.adminName,trash:0}})
    const admin=existingAdmin
      ? await tx.admins.update({where:{id:existingAdmin.id},data:{status:1,trash:0,updated_at:now}})
      : await tx.admins.create({data:{name:values.adminName,mobile:values.adminMobile,password:adminHash,status:1,trash:0,created_by:0,updated_by:0,created_at:now,updated_at:now}})
    adminCreated=!existingAdmin

    let businessType=await tx.businessTypes.findFirst({where:{business_type:'Retail',trash:0}})
    businessType=businessType
      ? await tx.businessTypes.update({where:{id:businessType.id},data:{display_name:'Retail',status:1,updated_by:Number(admin.id),updated_at:now}})
      : await tx.businessTypes.create({data:{business_type:'Retail',display_name:'Retail',status:1,trash:0,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}})
    let state=await tx.states.findFirst({where:{state_name:'Tamil Nadu',trash:0}})
    state=state
      ? await tx.states.update({where:{id:state.id},data:{status:1,updated_by:Number(admin.id),updated_at:now}})
      : await tx.states.create({data:{state_name:'Tamil Nadu',status:1,trash:0,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}})

    const featureRows=[]
    for(let priority=1;priority<=featureNames.length;priority++){
      const name=featureNames[priority-1]!
      const existing=await tx.features.findFirst({where:{feature:name,trash:0}})
      featureRows.push(existing
        ? await tx.features.update({where:{id:existing.id},data:{status:1,priority,updated_by:Number(admin.id),updated_at:now}})
        : await tx.features.create({data:{feature:name,status:1,trash:0,priority,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}}))
    }

    const existingClient=await tx.users.findFirst({where:{business_name:values.shopName,trash:0}})
    const client=existingClient
      ? await tx.users.update({where:{id:existingClient.id},data:{business_type_id:Number(businessType.id),contact_person:values.ownerName,state_id:Number(state.id),city:'Chennai',pincode:600001,address:'Demo address, Chennai',start_date:new Date('2026-01-01T00:00:00.000Z'),end_date:new Date('2035-12-31T00:00:00.000Z'),subscription_duration:3,status:1,trash:0,updated_by:Number(admin.id),updated_at:now}})
      : await tx.users.create({data:{name:values.ownerName,business_name:values.shopName,business_type_id:Number(businessType.id),email:values.shopEmail,mobile:values.shopMobile,contact_person:values.ownerName,state_id:Number(state.id),city:'Chennai',pincode:600001,address:'Demo address, Chennai',amount:0,discount_type:0,discount_value:0,gst:18,gst_value:0,final_amount:0,subscription_duration:3,subscription_amount:0,subscription_discount_type:0,subscription_discount_value:0,subscription_gst:18,subscription_gst_value:0,subscription_final_amount:0,paid_amount:0,start_date:new Date('2026-01-01T00:00:00.000Z'),end_date:new Date('2035-12-31T00:00:00.000Z'),status:1,trash:0,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}})
    let role=await tx.clientRoles.findFirst({where:{client_id:client.id,role_title:'Admin',trash:0}})
    role=role
      ? await tx.clientRoles.update({where:{id:role.id},data:{status:1,updated_by:Number(admin.id),updated_at:now}})
      : await tx.clientRoles.create({data:{client_id:client.id,role_title:'Admin',status:1,trash:0,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}})
    const roleId=Number(role.id)
    if(!Number.isSafeInteger(roleId))throw new Error('Seed role ID exceeds the supported range.')
    const existingShopUser=await tx.clientUsers.findFirst({where:{client_id:client.id,is_admin:1,trash:0}})
    const shopUser=existingShopUser
      ? await tx.clientUsers.update({where:{id:existingShopUser.id},data:{name:values.ownerName,role_id:roleId,is_admin:1,status:1,trash:0,updated_by:Number(admin.id),updated_at:now}})
      : await tx.clientUsers.create({data:{client_id:client.id,name:values.ownerName,email:values.shopEmail,mobile:values.shopMobile,password:shopHash,role_id:roleId,max_discount_percentage:100,is_admin:1,status:1,trash:0,created_by:Number(admin.id),updated_by:Number(admin.id),created_at:now,updated_at:now}})
    shopUserCreated=!existingShopUser

    for(const feature of featureRows){
      const entitlement=await tx.clientFeatures.findFirst({where:{client_id:client.id,feature_id:feature.id,sub_feature_id:0n}})
      if(entitlement)await tx.clientFeatures.update({where:{id:entitlement.id},data:{status:1,updated_by:Number(shopUser.id),updated_at:now}})
      else await tx.clientFeatures.create({data:{client_id:client.id,feature_id:feature.id,sub_feature_id:0n,status:1,created_by:Number(shopUser.id),updated_by:Number(shopUser.id),created_at:now,updated_at:now}})
      const grant=await tx.clientRoleFeatures.findFirst({where:{client_id:client.id,role_id:role.id,feature_id:feature.id,sub_feature_id:0n}})
      if(grant)await tx.clientRoleFeatures.update({where:{id:grant.id},data:{is_add:1,is_edit:1,is_view:1,status:1,trash:0,updated_by:Number(shopUser.id),updated_at:now}})
      else await tx.clientRoleFeatures.create({data:{client_id:client.id,role_id:role.id,feature_id:feature.id,sub_feature_id:0n,is_add:1,is_edit:1,is_view:1,status:1,trash:0,created_by:Number(shopUser.id),updated_by:Number(shopUser.id),created_at:now,updated_at:now}})
    }

    let cash=await tx.paymentModes.findFirst({where:{client_id:client.id,payment_mode:'Cash',trash:0}})
    cash=cash?await tx.paymentModes.update({where:{id:cash.id},data:{status:1,allow_change:1,updated_by:Number(shopUser.id),updated_at:now}}):await tx.paymentModes.create({data:{client_id:client.id,payment_mode:'Cash',allow_change:1,status:1,trash:0,created_by:Number(shopUser.id),updated_by:Number(shopUser.id),created_at:now,updated_at:now}})
    const gst=await tx.taxes.findFirst({where:{client_id:client.id,tax_code:'GST18',trash:0}})
    if(gst)await tx.taxes.update({where:{id:gst.id},data:{tax_name:'GST 18%',tax_percent:18,status:1,updated_by:Number(shopUser.id),updated_at:now}})
    else await tx.taxes.create({data:{client_id:client.id,tax_code:'GST18',tax_name:'GST 18%',tax_percent:18,status:1,trash:0,created_by:Number(shopUser.id),updated_by:Number(shopUser.id),created_at:now,updated_at:now}})
    const settings=await tx.billingSettings.findFirst({where:{client_id:client.id}})
    if(settings)await tx.billingSettings.update({where:{id:settings.id},data:{payment_mode_id:Number(cash.id),updated_by:Number(shopUser.id),updated_at:now}})
    else await tx.billingSettings.create({data:{client_id:client.id,bill_prefix:'INV',bill_caption:'Thank you',payment_mode_id:Number(cash.id),refund_days:'0',created_by:Number(shopUser.id),updated_by:Number(shopUser.id),created_at:now,updated_at:now}})
    return{adminId:admin.id,adminMobile:admin.mobile,clientId:client.id,userId:shopUser.id,shopEmail:shopUser.email,shopMobile:shopUser.mobile,features:featureRows.length}
  },{maxWait:30_000,timeout:120_000})
  console.log(`Seed complete: admin=${result.adminId}, client=${result.clientId}, user=${result.userId}, features=${result.features}.`)
  console.log(`Super-admin login: ${result.adminMobile}${adminCreated?` / ${adminPassword}`:' (existing password unchanged)'}`)
  console.log(`Shop login: ${result.shopEmail} or ${result.shopMobile}${shopUserCreated?` / ${shopPassword}`:' (existing password unchanged)'}`)
  if(adminCreated||shopUserCreated)console.log('Save the generated password(s) now; only their bcrypt hashes are stored in the database.')
}finally{await database.close()}
