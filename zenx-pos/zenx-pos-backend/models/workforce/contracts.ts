import type { Account } from '../auth/contracts.ts'
export type WorkforceResult = 'saved'|'missing'|'category_missing'|'designation_missing'|'code_duplicate'|'mobile_duplicate'|'name_duplicate'
export type Designation = { id:bigint; name:string; status:number }
export type EmployeeInput = { code:string; name:string; gender:number; mobile:string; categoryId:bigint; designationId:bigint; fromTime:Date; toTime:Date; weekOff:number|null; address:string|null; status:number }
export type Employee = EmployeeInput & { id:bigint; categoryName:string; designationName:string }
export interface WorkforceStore {
 createDesignation(account:Account,value:{name:string;status:number}):Promise<WorkforceResult>; updateDesignation(account:Account,id:bigint,value:{name:string;status:number}):Promise<WorkforceResult>
 getDesignation(clientId:bigint,id:bigint):Promise<Designation|null>; listDesignations(clientId:bigint,filters:{search?:string;status?:number;page:number;perPage:number}):Promise<{rows:Designation[];total:number}>
 createEmployee(account:Account,value:EmployeeInput):Promise<WorkforceResult>; updateEmployee(account:Account,id:bigint,value:EmployeeInput):Promise<WorkforceResult>
 getEmployee(clientId:bigint,id:bigint):Promise<Employee|null>; listEmployees(clientId:bigint,filters:{search?:string;categoryId?:bigint;designationId?:bigint;status?:number;page:number;perPage:number}):Promise<{rows:Employee[];total:number}>
}
