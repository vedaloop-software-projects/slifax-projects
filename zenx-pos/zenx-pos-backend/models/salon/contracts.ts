import type { Account } from '../auth/contracts.ts'
export type AppointmentServiceInput = { categoryId: bigint; subCategoryId: bigint | null; employeeId: bigint }
export type AppointmentInput = { customerName: string; mobile: string; date: Date; time: Date; remarks: string | null; services: AppointmentServiceInput[] }
export type SalonResult = 'created' | 'updated' | 'missing' | 'final' | 'category_missing' | 'subcategory_missing' | 'employee_missing' | 'product_missing' | 'variant_missing' | 'customer_missing' | 'payment_mode_missing' | 'empty' | 'total_mismatch' | 'payment_mismatch'
export type SalonEmployee = { id: bigint; clientId: bigint; employeeCode: string; employeeName: string; gender: number; mobile: string; categoryId: bigint; designationId: bigint; fromTime: Date | null; toTime: Date | null; weekOff: number | null; address: string | null; status: number; trash: number; createdBy: number; updatedBy: number; createdAt: Date | null; updatedAt: Date | null; categoryName: string; designationName: string }
export type EmployeeAppointment = { appointmentId: bigint; appointmentTime: Date; customerName: string; mobile: string; status: number; services: string[] }
export type EmployeeSchedule = { employeeId: bigint; employeeCode: string; employeeName: string; appointments: EmployeeAppointment[] }
export type TempServiceInput = { productId: bigint; variantId: bigint; qty: number; customerId: bigint | null; employeeId: bigint | null }
export type TempServiceRow = { tempId: bigint; productId: bigint; productFullName: string; productShortName: string; variantId: bigint; packSize: string; qty: number; price: number; amount: number; gstPercentage: number; gstAmount: number; discountPercentage: number; discountAmount: number }
export type TempSummary = { totalItems: number; subTotal: number; discountAmount: number; gstAmount: number; netAmount: number; items: TempServiceRow[] }
export type SalonPayment = { paymentModeId: bigint; amount: number; cashChange: number }
export type SalonBillInput = { customerId: bigint | null; additionalCharges: number; roundOffValue: number; totalAmount: number; payments: SalonPayment[] }
export interface SalonStore {
  book(account: Account, input: AppointmentInput): Promise<SalonResult>
  employees(clientId: bigint, categoryId: bigint, limit: number): Promise<{ rows: SalonEmployee[]; truncated: boolean } | 'category_missing'>
  appointments(clientId: bigint, date: Date, search: string | undefined, limit: number): Promise<{ rows: EmployeeSchedule[]; truncated: boolean }>
  updateStatus(account: Account, appointmentId: bigint, status: number): Promise<SalonResult>
  addTemp(account: Account, input: TempServiceInput): Promise<SalonResult>
  getTemp(account: Account): Promise<TempSummary | null>
  saveBill(account: Account, input: SalonBillInput): Promise<SalonResult | { billNo: number; billDate: Date }>
}
