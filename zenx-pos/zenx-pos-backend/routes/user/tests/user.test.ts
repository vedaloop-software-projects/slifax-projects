import assert from 'node:assert/strict'; import { once } from 'node:events'; import { createServer } from 'node:http'; import { test } from 'node:test'; import { compare, hash } from 'bcryptjs'
import type { AuthConfig } from '../../../models/auth/config.ts'; import type { Account, AuthStore, PermissionRow } from '../../../models/auth/contracts.ts'; import type { ManagedUserInput, ManagedUserRow, UserStore, UserWriteResult } from '../../../models/user/contracts.ts'
import { createAuthRouter } from '../../auth/router.ts'; import { AuthService } from '../../auth/service.ts'; import { createApp } from '../../system/app.ts'; import { createUserRouter } from '../router.ts'; import { UserService } from '../service.ts'
const account: Account = { user: { id: 3n, clientId: 7n, name: 'Admin', mobile: '9876543210', email: 'admin@example.com', passwordHash: null, roleId: 4, isAdmin: 1, updatedAt: null }, client: { id: 7n, businessTypeId: 2, businessName: 'Store', logo: null, address: '', city: '', startDate: new Date('2025-01-01'), endDate: new Date('2030-12-31') }, businessType: 'Retail', roleTitle: 'Admin' }
class MemoryAuth implements AuthStore { permissions: PermissionRow[] = [{ featureId: 1n, feature: 'Users', featurePriority: 1, subFeatureId: null, subFeature: null, subFeaturePriority: null, view: 1, add: 1, edit: 1 }]; async findAccountByLogin(v:string){return v===account.user.email?account:null} async findAccountByIdentity(){return account} async listPermissions(){return this.permissions} async getProfile(){return null} async recordAudit(){} async changePassword(){return new Date()} }
class MemoryUsers implements UserStore { rows: ManagedUserRow[]=[{id:8n,roleId:2n,roleName:'Cashier',name:'Kumar',email:'k@example.com',mobile:'9123456789',maxDiscountPercentage:10,status:1}]; result:UserWriteResult='saved'; saved?:ManagedUserInput
 async createUser(_a:Account,v:ManagedUserInput){this.saved=v;return this.result} async updateUser(_a:Account,_id:bigint,v:ManagedUserInput){this.saved=v;return this.result} async getUser(c:bigint,id:bigint){return c===7n?this.rows.find(x=>x.id===id)??null:null} async listUsers(_c:bigint,_f:{search?:string;status?:number;page:number;perPage:number}){return {rows:this.rows,total:this.rows.length}} }
async function api(action:(base:string,token:string,s:MemoryUsers,a:MemoryAuth)=>Promise<void>){const a=new MemoryAuth(),s=new MemoryUsers();account.user.passwordHash=await hash('Valid1!',4);const cfg:AuthConfig={jwtSecret:new TextEncoder().encode('user-test-secret-with-at-least-32-bytes'),jwtIssuer:'test',jwtAudience:'test',jwtLifetime:'1h',publicBaseUrl:''},auth=new AuthService(a,cfg),server=createServer(createApp(undefined,[createAuthRouter(auth),createUserRouter(auth,new UserService(s,a))]));server.listen(0,'127.0.0.1');await once(server,'listening');const addr=server.address();assert.ok(addr&&typeof addr!=='string');try{const base=`http://127.0.0.1:${addr.port}/api`,l=await fetch(`${base}/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobileEmail:account.user.email,password:'Valid1!'})}),b=await l.json() as any;await action(base,b.data.user.token,s,a)}finally{server.closeAllConnections();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()))}}
const post=(b:string,p:string,t:string,v:unknown)=>fetch(`${b}/${p}`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(v)})
test('managed users hash passwords and validate duplicate, role and protected results',async()=>api(async(b,t,s)=>{const v={roleId:2,name:'Kumar',email:'K@Example.com',mobile:'9123456789',password:'Strong1!',maxDiscountPercentage:10,status:1};assert.equal((await post(b,'addUser',t,v)).status,200);assert.ok(s.saved?.passwordHash&&await compare('Strong1!',s.saved.passwordHash));assert.equal(s.saved?.email,'k@example.com');s.result='role_missing';assert.equal((await post(b,'addUser',t,v)).status,422);s.result='protected';assert.equal((await post(b,'updateUser',t,{...v,id:8,password:null})).status,403)}))
test('managed user list and detail are bounded and omit password data',async()=>api(async(b,t)=>{const list=await(await post(b,'getUsers',t,{searchStr:null,status:null,page:null})).json() as any;assert.equal(list.data.pagination.perPage,25);assert.equal(list.data.users[0].roleName,'Cashier');assert.equal('password' in list.data.users[0],false);const one=await(await post(b,'getUserById',t,{id:8})).json() as any;assert.equal(one.data.mobile,'9123456789')}))
test('managed user endpoints enforce grants and stronger passwords',async()=>api(async(b,t,_s,a)=>{const v={roleId:2,name:'Kumar',email:'k@example.com',mobile:'9123456789',password:'short',maxDiscountPercentage:10,status:1};assert.equal((await post(b,'addUser',t,v)).status,422);a.permissions[0]!.view=0;account.user.isAdmin=0;assert.equal((await post(b,'getUsers',t,{searchStr:null,status:null,page:1})).status,403);account.user.isAdmin=1}))

test('primary admins manage users without depending on editable role grants',async()=>{
 const primary={...account,user:{...account.user,isAdmin:1}};const auth=new MemoryAuth();auth.permissions=[];const users=new MemoryUsers();
 await new UserService(users,auth).update(primary,{id:8,roleId:2,name:'Kumar',email:'k@example.com',mobile:'9123456789',password:'Updated123!',maxDiscountPercentage:10,status:0});
 assert.equal(users.saved?.status,0);assert.ok(users.saved?.passwordHash&&await compare('Updated123!',users.saved.passwordHash));
 const list=await new UserService(users,auth).many(primary,{searchStr:null,status:null,page:1});assert.equal(list.canManageUsers,true);assert.equal(list.users[0]?.canEdit,true)
});
test('secondary admins cannot create or alter users despite full role permissions',async()=>{
 const secondary={...account,user:{...account.user,isAdmin:0},roleTitle:'Admin'};const users=new MemoryUsers(),service=new UserService(users,new MemoryAuth());
 const value={id:8,roleId:2,name:'Kumar',email:'k@example.com',mobile:'9123456789',password:'Updated123!',maxDiscountPercentage:10,status:0};
 await assert.rejects(()=>service.update(secondary,value),(error:any)=>error.status===403&&/primary admin/.test(error.message));
 await assert.rejects(()=>service.add(secondary,value),(error:any)=>error.status===403&&/primary admin/.test(error.message));assert.equal(users.saved,undefined);
 const list=await service.many(secondary,{searchStr:null,status:null,page:1});assert.equal(list.canManageUsers,false);assert.equal(list.users[0]?.canEdit,false)
});
test('database mutation guards enforce primary status and allow managing another admin',async()=>{
 const {PrismaUserStore}=await import('../../../models/user/prisma-store.ts');let updated:any;let primary=true;let targetId=8n;
 const tx={clientUsers:{findFirst:async({where}:any)=>{
 assert.equal(where.client_id,7n);
 if(where.is_admin===1)return primary?{id:3n}:null;
 if(where.id===targetId)return{id:targetId,is_admin:1};return null;
 },update:async({data}:any)=>{updated=data}},clientRoles:{findFirst:async()=>({id:2n})},audits:{create:async()=>({})}};
 const fake={$transaction:async(fn:any)=>fn(tx)};const store=new PrismaUserStore(fake as any);const value={roleId:2n,name:'Another admin',email:'other@example.com',mobile:'9123456789',status:0,maxDiscountPercentage:10};
 assert.equal(await store.updateUser(account,8n,value),'saved');assert.equal(updated.status,0);
 updated=undefined;primary=false;assert.equal(await store.updateUser(account,8n,value),'primary_required');assert.equal(updated,undefined);
 primary=true;targetId=3n;assert.equal(await store.updateUser(account,3n,value),'self_protected')
});

test('invalid user requests identify every rejected field without exposing the password', async () => api(async (base, token, store) => {
  const password = 'sample';
  const response = await post(base, 'addUser', token, { roleId: 2, name: 'Ab', email: 'k@example.com', mobile: '9123456789', password, maxDiscountPercentage: 101, status: 1 });
  assert.equal(response.status, 422);
  const result = await response.json() as any;
  assert.deepEqual(Object.keys(result.fieldErrors).sort(), ['maxDiscountPercentage', 'name', 'password']);
  assert.match(result.errors, /Full name|Password|Max\. discount/);
  assert.match(result.fieldErrors.password, /8-72/);
  assert.match(result.fieldErrors.maxDiscountPercentage, /0 to 100/);
  assert.equal(JSON.stringify(result).includes(password), false);
  assert.equal(store.saved, undefined);
}));

test('user requests normalize surrounding whitespace and preserve numeric strings and decimal discounts', async () => api(async (base, token, store) => {
  const response = await post(base, 'addUser', token, { roleId: '2', name: "  O'Neil  ", email: ' K@Example.com ', mobile: ' 9123456789 ', password: 'Staff123', maxDiscountPercentage: '12.5', status: '1' });
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal(store.saved?.name, "O'Neil");
  assert.equal(store.saved?.email, 'k@example.com');
  assert.equal(store.saved?.mobile, '9123456789');
  assert.equal(store.saved?.roleId, 2n);
  assert.equal(store.saved?.maxDiscountPercentage, 12.5);
}));

test('omitting the password on edit preserves the current password', async () => api(async (base, token, store) => {
  const response = await post(base, 'updateUser', token, { id: 8, roleId: 2, name: 'Kumar', email: 'k@example.com', mobile: '9123456789', maxDiscountPercentage: 0, status: 0 });
  assert.equal(response.status, 200);
  assert.equal(store.saved?.passwordHash, undefined);
  assert.equal(store.saved?.status, 0);
}));

test('duplicate identity and unavailable roles identify the field while preserving HTTP status codes', async () => api(async (base, token, store) => {
  const values = { roleId: 2, name: 'Kumar', email: 'k@example.com', mobile: '9123456789', password: 'Staff123', maxDiscountPercentage: 10, status: 1 };
  for (const [result, code, field] of [['email_duplicate', 400, 'email'], ['mobile_duplicate', 400, 'mobile'], ['role_missing', 422, 'roleId']] as const) {
    store.result = result;
    const response = await post(base, 'addUser', token, values);
    assert.equal(response.status, code);
    assert.equal(typeof (await response.json() as any).fieldErrors[field], 'string');
  }
}));
