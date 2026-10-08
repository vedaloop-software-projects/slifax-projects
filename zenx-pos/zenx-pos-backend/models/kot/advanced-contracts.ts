import type { Account } from '../auth/contracts.ts'

export const advancedKotOperations = ['addMoreItems','updateKotItemPreparing','updateKotItemReady','updateKotItemServed','cancelKotItem','addToTemp','getKotTempBillItems','applyCoupon','applyBillDiscount','saveTableBill','addDirectBillItem','saveTakeawayBill','KotClearTempBill','KotSuspendBill','KotResumeSuspendedBill','getKotDayCloseReport','kotDayClose','kotOveringBill','getKotPrint'] as const
export type AdvancedKotOperation = typeof advancedKotOperations[number]
export interface KotAdvancedStore { execute(operation: AdvancedKotOperation, account: Account, payload: Record<string, unknown>): Promise<unknown> }
