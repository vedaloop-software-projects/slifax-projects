export const successResponse = <T>(message: string, data: T) => ({ success: true as const, message, data })
