import express,{type NextFunction,type Request,type RequestHandler,type Response}from'express'
import multer from'multer'
import type{AdminIdentity}from'../../models/admin/contracts.ts'
import{ApiError}from'../auth/service.ts'
import{cookieValue,readAdminSession}from'./session.ts'
import{adminPage,formPage,resourcePage}from'./view.ts'
import type{ClientAdminService}from'./clients-service.ts'
import type{AdminService}from'./service.ts'
type H=(q:Request,s:Response)=>Promise<void>;const h=(f:H):RequestHandler=>(q,s,n)=>{void f(q,s).catch(n)};const ident=(v:string|string[])=>{if(Array.isArray(v)||!/^[1-9]\d*$/.test(v))throw new ApiError(422,'Invalid client id.');return BigInt(v)},json=(q:Request)=>q.accepts(['html','json'])==='json',rows=(x:unknown)=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='bigint'?v.toString():v))
export function createClientAdminRouter(adminService:AdminService,service:ClientAdminService,secret:string,rawPath='/admin'){
 const path='/'+rawPath.replace(/^\/+|\/+$/g,''),r=express.Router();r.use(express.urlencoded({extended:false,limit:'128kb'}));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:50},fileFilter:(_q,file,cb)=>{if(['image/jpeg','image/png','image/webp'].includes(file.mimetype))cb(null,true);else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE',file.fieldname))}})
 const auth:RequestHandler=(q,s,n)=>{void(async()=>{const session=readAdminSession(cookieValue(q.headers.cookie,'zenx_admin'),secret),identity=session&&await adminService.store.findAdminById(session.adminId);if(!session||!identity)throw new ApiError(401,'Admin authentication required.');s.locals.admin=identity;n()})().catch(n)}
 const actor=(s:Response)=>s.locals.admin as AdminIdentity
 r.get(path+'/prerequisites',auth,h(async(_q,s)=>{s.json({success:true,data:rows(await service.store.prerequisites())})}))
 const page=async(q:Request,s:Response,contracts=false)=>{const result=await service.list({...q.query,...q.body},contracts);if(json(q))s.json({success:true,data:rows(result.rows),meta:{total:result.total,pageSize:service.pageSize},...(result.summary?{summary:result.summary}:{})});else s.type('html').send(resourcePage(contracts?'Contract details':'Clients',rows(result.rows),path))}
 r.get(path+'/add_client',auth,h(async(_q,s)=>{await service.store.prerequisites();s.type('html').send(formPage('Add client',['business_name','business_type_id','email','contact_person_name','mobile','state_id','city','address','amount','start_date','end_date','subscription_duration','subscription_amount','status','password'],path+'/add/client',path))}))
 r.post(path+'/add/client',auth,upload.single('logo'),h(async(q,s)=>{const id=await service.create(q.body,actor(s),q.file?{buffer:q.file.buffer,mimeType:q.file.mimetype}:undefined);if(json(q))s.status(201).json({success:true,data:{id:id.toString()}});else s.redirect(303,path+'/clients')}))
 r.get(path+'/clients',auth,h((q,s)=>page(q,s)));r.post(path+'/clients',auth,h((q,s)=>page(q,s)));r.get(path+'/clients/refresh',auth,(_q,s)=>s.redirect(303,path+'/clients'))
 r.get(path+'/edit/client/:id',auth,h(async(q,s)=>{const row=await service.store.find(ident(q.params.id!));if(!row)throw new ApiError(404,'Client not found.');if(json(q))s.json({success:true,data:rows(row)});else s.type('html').send(formPage('Edit client',Object.keys(row).filter(x=>!['id','password'].includes(x)),path+'/update/client/'+q.params.id,path,row))}))
 r.post(path+'/update/client/:id',auth,upload.single('logo'),h(async(q,s)=>{await service.update(ident(q.params.id!),q.body,actor(s),q.file?{buffer:q.file.buffer,mimeType:q.file.mimetype}:undefined);if(json(q))s.json({success:true});else s.redirect(303,path+'/clients')}))
 r.post(path+'/client/:id/status',auth,h(async(q,s)=>{await service.setStatus(ident(q.params.id!),q.body,actor(s));s.json({success:true})}))
 r.get(path+'/delete/client/:id',auth,h(async(q,s)=>{if(!await service.store.find(ident(q.params.id!)))throw new ApiError(404,'Client not found.');if(json(q))s.json({success:true,message:'Confirmation required before deletion.'});else s.type('html').send(adminPage('Delete client',`<form method="post"><button>Delete</button></form>`,path))}))
 r.post(path+'/delete/client/:id',auth,h(async(q,s)=>{if(!await service.store.softDelete(ident(q.params.id!),actor(s)))throw new ApiError(404,'Client not found.');if(json(q))s.json({success:true});else s.redirect(303,path+'/clients')}))
 r.get(path+'/client/features/:id',auth,h(async(q,s)=>{const result=await service.store.features(ident(q.params.id!));if(!result)throw new ApiError(404,'Client not found.');s.json(rows(result))}))
 r.post(path+'/client/features/update',auth,h(async(q,s)=>{await service.updateFeatures(q.body,actor(s));if(json(q))s.json({success:true});else s.redirect(303,path+'/clients')}))
 r.get(path+'/contrat_details',auth,h((q,s)=>page(q,s,true)));r.post(path+'/contrat_details',auth,h((q,s)=>page(q,s,true)));r.get(path+'/contrat_details/refresh',auth,(_q,s)=>s.redirect(303,path+'/contrat_details'))
 r.get(path+'/get_client_payments/:id',auth,h(async(q,s)=>{const result=await service.store.payments(ident(q.params.id!));if(!result)throw new ApiError(404,'Client not found.');s.json(rows(result))}))
 r.post(path+'/store_client_payment',auth,h(async(q,s)=>{await service.payment(q.body,actor(s));if(json(q))s.json({success:true});else s.redirect(303,path+'/contrat_details')}))
 const collections=h(async(q,s)=>{const result=await service.collections({...q.query,...q.body});if(json(q))s.json({success:true,data:rows(result.rows),summary:{today:result.today,week:result.week,month:result.month,year:result.year},meta:{total:result.total,pageSize:service.pageSize}});else s.type('html').send(resourcePage('Collection details',rows(result.rows),path))});r.get(path+'/collection_details',auth,collections);r.post(path+'/collection_details',auth,collections);r.get(path+'/collection_details/refresh',auth,(_q,s)=>s.redirect(303,path+'/collection_details'))
 r.use((e:unknown,_q:Request,s:Response,n:NextFunction)=>{if(e instanceof multer.MulterError){s.status(e.code==='LIMIT_FILE_SIZE'?413:422).json({errors:e.code==='LIMIT_FILE_SIZE'?'Logo must be 2 MB or smaller.':'Logo must be a JPEG, PNG or WebP image.'});return}if(e instanceof ApiError){s.status(e.status).json({errors:e.message});return}n(e)});return r
}
