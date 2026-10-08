import { Router, type RequestHandler, type Response } from 'express'
import { authenticate, type AuthenticatedLocals } from '../../middlewares/auth/authenticate.ts'
import { ApiError, type AuthService } from '../auth/service.ts'
import type { MasterService } from './service.ts'

type AsyncHandler = (request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => Promise<void>
function handle(action: AsyncHandler): RequestHandler { return (request, response, next) => { void action(request, response).catch(next) } }
const jsonOnly: RequestHandler = (request, response, next) => {
  if (!request.is('application/json')) { response.status(400).json({ errors: 'Content-Type must be application/json.' }); return }
  next()
}

export function createMasterRouter(auth: AuthService, service: MasterService) {
  const router = Router()
  const protectedRoute = authenticate(auth)
  const account = (response: Response) => (response.locals as AuthenticatedLocals).account
  router.get('/features', protectedRoute, handle(async (_request, response) => {
    response.json({ success: true, message: 'Features fetched successfully.', data: await service.features() })
  }))
  router.post('/addCategory', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addCategory(account(response), request.body)
    response.json({ success: true, message: 'Category added successfully.', data: null })
  }))
  router.post('/updateCategory', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateCategory(account(response), request.body)
    response.json({ success: true, message: 'Category updated successfully.', data: null })
  }))
  router.post('/getCategories', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Categories fetched successfully.', data: await service.categories(account(response), request.body) })
  }))
  router.post('/getCategoryById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Category details fetched successfully.', data: await service.category(account(response), request.body) })
  }))
  router.post('/addSubCategory', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addSubCategory(account(response), request.body)
    response.json({ success: true, message: 'Sub category added successfully.', data: null })
  }))
  router.post('/updateSubCategory', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateSubCategory(account(response), request.body)
    response.json({ success: true, message: 'Sub category updated successfully.', data: null })
  }))
  router.post('/getSubCategories', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Sub categories fetched successfully.', data: await service.subCategories(account(response), request.body) })
  }))
  router.post('/getSubCategoryById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Sub category details fetched successfully.', data: await service.subCategory(account(response), request.body) })
  }))
  router.post('/addBrand', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addBrand(account(response), request.body)
    response.json({ success: true, message: 'Brand added successfully.', data: null })
  }))
  router.post('/updateBrand', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateBrand(account(response), request.body)
    response.json({ success: true, message: 'Brand updated successfully.', data: null })
  }))
  router.post('/getBrands', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Brands fetched successfully.', data: await service.brands(account(response), request.body) })
  }))
  router.post('/getBrandById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Brand details fetched successfully.', data: await service.brand(account(response), request.body) })
  }))
  router.post('/addColour', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addColour(account(response), request.body)
    response.json({ success: true, message: 'Colour added successfully.', data: null })
  }))
  router.post('/updateColour', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateColour(account(response), request.body)
    response.json({ success: true, message: 'Colour updated successfully.', data: null })
  }))
  router.post('/getColours', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Colours fetched successfully.', data: await service.colours(account(response), request.body) })
  }))
  router.post('/getColourById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Colour details fetched successfully.', data: await service.colour(account(response), request.body) })
  }))
  router.post('/addSize', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addSize(account(response), request.body)
    response.json({ success: true, message: 'Size added successfully.', data: null })
  }))
  router.post('/updateSize', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateSize(account(response), request.body)
    response.json({ success: true, message: 'Size updated successfully.', data: null })
  }))
  router.post('/getSizes', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Sizes fetched successfully.', data: await service.sizes(account(response), request.body) })
  }))
  router.post('/getSizeById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Size details fetched successfully.', data: await service.size(account(response), request.body) })
  }))
  router.post('/addUnitType', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addUnitType(account(response), request.body)
    response.json({ success: true, message: 'Unit Type added successfully.', data: null })
  }))
  router.post('/updateUnitType', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateUnitType(account(response), request.body)
    response.json({ success: true, message: 'Unit Type updated successfully.', data: null })
  }))
  router.post('/getUnitTypes', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Unit Types fetched successfully.', data: await service.unitTypes(account(response), request.body) })
  }))
  router.post('/getUnitTypeById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Unit Type details fetched successfully.', data: await service.unitType(account(response), request.body) })
  }))
  router.post('/addTeam', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addTeam(account(response), request.body)
    response.json({ success: true, message: 'Team added successfully.', data: null })
  }))
  router.post('/updateTeam', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updateTeam(account(response), request.body)
    response.json({ success: true, message: 'Team updated successfully.', data: null })
  }))
  router.post('/getTeams', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Teams fetched successfully.', data: await service.teams(account(response), request.body) })
  }))
  router.post('/getTeamById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Team details fetched successfully.', data: await service.team(account(response), request.body) })
  }))
  router.post('/addPaymentMode', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.addPaymentMode(account(response), request.body)
    response.json({ success: true, message: 'Payment mode added successfully.', data: null })
  }))
  router.post('/updatePaymentMode', protectedRoute, jsonOnly, handle(async (request, response) => {
    await service.updatePaymentMode(account(response), request.body)
    response.json({ success: true, message: 'Payment Mode updated successfully.', data: null })
  }))
  router.post('/getPaymentModes', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Payment modes fetched successfully.', data: await service.paymentModes(account(response), request.body) })
  }))
  router.post('/getPaymentModeById', protectedRoute, jsonOnly, handle(async (request, response) => {
    response.json({ success: true, message: 'Payment Mode details fetched successfully.', data: await service.paymentMode(account(response), request.body) })
  }))
  router.post('/addTax', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addTax(account(response), request.body); response.json({ success: true, message: 'Tax added successfully.', data: null }) }))
  router.post('/updateTax', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateTax(account(response), request.body); response.json({ success: true, message: 'Tax updated successfully.', data: null }) }))
  router.post('/getTaxes', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Taxes fetched successfully.', data: await service.taxes(account(response), request.body) }) }))
  router.post('/getTaxById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Tax details fetched successfully.', data: await service.tax(account(response), request.body) }) }))
  router.post('/addSalesMan', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addSalesMan(account(response), request.body); response.json({ success: true, message: 'Sales man added successfully.', data: null }) }))
  router.post('/updateSalesMan', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateSalesMan(account(response), request.body); response.json({ success: true, message: 'Sales man updated successfully.', data: null }) }))
  router.post('/getSalesMans', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Sales mans fetched successfully.', data: await service.salesMans(account(response), request.body) }) }))
  router.post('/getSalesManById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Sales man details fetched successfully.', data: await service.salesMan(account(response), request.body) }) }))
  router.post('/addFloor', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addFloor(account(response), request.body); response.json({ success: true, message: 'Floor added successfully.', data: null }) }))
  router.post('/updateFloor', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateFloor(account(response), request.body); response.json({ success: true, message: 'Floor updated successfully.', data: null }) }))
  router.post('/getFloors', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Floors fetched successfully.', data: await service.floors(account(response), request.body) }) }))
  router.post('/getFloorById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Floor details fetched successfully.', data: await service.floor(account(response), request.body) }) }))
  router.post('/addTableType', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addTableType(account(response), request.body); response.json({ success: true, message: 'Table Type added successfully.', data: null }) }))
  router.post('/updateTableType', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateTableType(account(response), request.body); response.json({ success: true, message: 'Table Type updated successfully.', data: null }) }))
  router.post('/getTableTypes', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Table Types fetched successfully.', data: await service.tableTypes(account(response), request.body) }) }))
  router.post('/getTableTypeById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Table Type details fetched successfully.', data: await service.tableType(account(response), request.body) }) }))
  router.post('/addTable', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addTable(account(response), request.body); response.json({ success: true, message: 'Table added successfully.', data: null }) }))
  router.post('/updateTable', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateTable(account(response), request.body); response.json({ success: true, message: 'Table updated successfully.', data: null }) }))
  router.post('/getTables', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Tables fetched successfully.', data: await service.tables(account(response), request.body) }) }))
  router.post('/getTableById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Table details fetched successfully.', data: await service.table(account(response), request.body) }) }))
  router.post('/addRole', protectedRoute, jsonOnly, handle(async (request, response) => { await service.addRole(account(response), request.body); response.json({ success: true, message: 'Role added successfully.', data: null }) }))
  router.post('/updateRole', protectedRoute, jsonOnly, handle(async (request, response) => { await service.updateRole(account(response), request.body); response.json({ success: true, message: 'Role updated successfully.', data: null }) }))
  router.post('/getRoles', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Roles fetched successfully.', data: await service.roles(account(response), request.body) }) }))
  router.post('/getRoleById', protectedRoute, jsonOnly, handle(async (request, response) => { response.json({ success: true, message: 'Role details fetched successfully.', data: await service.role(account(response), request.body) }) }))
  router.use((error: unknown, _request: unknown, response: Response, next: (error: unknown) => void) => {
    if (error instanceof ApiError) { response.status(error.status).json({ errors: error.message }); return }
    next(error)
  })
  return router
}
