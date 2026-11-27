// ZenxPOS AI product creation: from a product name, a full product draft (brand,
// category, sub-category, unit, pack size, HSN and GST) matched to the store's own masters.
// The model is a nearest-neighbour text classifier over word and letter-trigram features,
// trained on the built-in retail catalog plus the store's existing products.
import { BRAND_HINTS, CATALOG, KNOWN_BRANDS } from './catalog.ts'

export type Master = { id: number; name: string }
export type StoreMasters = { categories: Master[]; subCategories: (Master & { categoryId: number })[]; brands: Master[]; units: Master[]; taxes: (Master & { percent: number })[] }
export type StoreProduct = { name: string; category: string; subCategory: string | null; hsn: string; taxPercent: number | null }
export type Pick = { id: number | null; name: string }
export type ProductDraft = {
  fullName: string; shortName: string; packSize: string | null
  brand: Pick | null; category: Pick | null; subCategory: Pick | null; unit: Pick
  hsn: string | null; tax: (Pick & { percent: number }) | null
  confidence: 'high' | 'medium' | 'low'; learnedFrom: 'store' | 'catalog' | null; notes: string[]
}

export const words = (text: string) => text.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
const key = (text: string) => words(text).map(word => word.replace(/(ies)$/, 'y').replace(/(?<=[a-z]{3})s$/, '')).join(' ')
export const sameName = (a: string, b: string) => key(a) === key(b)

// ---------------------------------------------------------------- pack size and unit
const UNIT_WORDS: Record<string, string[]> = {
  kg: ['kg', 'kgs', 'kilo', 'kilogram', 'kilograms'], g: ['g', 'gm', 'gms', 'gram', 'grams', 'grm'],
  l: ['l', 'lt', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters'], ml: ['ml', 'mls'],
  pcs: ['pc', 'pcs', 'piece', 'pieces', 'nos', 'no', 'n', 'pack', 'pkt', 'packet', 'unit', 'units', 'each', 'ea'],
}
const unitKind = (word: string) => Object.keys(UNIT_WORDS).find(kind => UNIT_WORDS[kind].includes(word.toLowerCase())) ?? null

export function parsePack(name: string) {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(kgs?|kilo(?:grams?)?|gms?|grams?|grm|g|ltrs?|litres?|liters?|lt|l|mls?|pcs?|pieces?|nos|pkt|packets?|units?)\b/i)
  if (!match) return null
  const kind = unitKind(match[2])
  if (!kind) return null
  const label = { kg: 'kg', g: 'g', l: 'L', ml: 'ml', pcs: 'pcs' }[kind]!
  return { text: match[0], packSize: `${Number(match[1])} ${label}`, kind }
}

// Packed goods sell per piece; loose produce sells by weight.
function pickUnit(units: Master[], loose: boolean): Pick {
  const wanted = loose ? ['kg'] : ['pcs']
  for (const kind of wanted) {
    const found = units.find(unit => words(unit.name).some(word => UNIT_WORDS[kind].includes(word)))
    if (found) return { id: found.id, name: found.name }
  }
  return { id: null, name: loose ? 'Kg' : 'Pcs' }
}

// ---------------------------------------------------------------- brand
function findBrand(name: string, storeBrands: Master[]): Pick | null {
  const text = ` ${words(name).join(' ')} `
  const has = (brand: string) => { const phrase = words(brand).join(' '); return !!phrase && text.includes(` ${phrase} `) }
  const store = storeBrands.filter(brand => has(brand.name)).sort((a, b) => b.name.length - a.name.length)[0]
  if (store) return { id: store.id, name: store.name }
  const known = KNOWN_BRANDS.filter(has).sort((a, b) => b.length - a.length)[0]
  return known ? { id: null, name: known } : null
}

// ---------------------------------------------------------------- text model
type Doc = { label: string; phrase: string; vector: Map<string, number>; weight: number; hsn: string; gst: number | null; loose: boolean; store: boolean }

function rawFeatures(tokens: string[]) {
  const features = new Map<string, number>()
  for (const token of tokens) {
    if (/^\d/.test(token) || token.length < 2) continue
    features.set(`w:${token}`, (features.get(`w:${token}`) ?? 0) + 1)
    const padded = `#${token}#`
    for (let index = 0; index + 3 <= padded.length; index++) {
      const gram = `c:${padded.slice(index, index + 3)}`
      features.set(gram, (features.get(gram) ?? 0) + 0.3)
    }
  }
  return features
}

export class ProductModel {
  private docs: Doc[] = []
  private idf = new Map<string, number>()

  constructor(storeProducts: StoreProduct[]) {
    const raw: (Omit<Doc, 'vector'> & { features: Map<string, number> })[] = [
      ...CATALOG.flatMap(entry => entry.phrases.map(phrase => ({ label: `${entry.category}|${entry.subCategory}`, phrase, features: rawFeatures(words(phrase)), weight: 1, hsn: entry.hsn, gst: entry.gst, loose: !!entry.loose, store: false }))),
      ...storeProducts.filter(product => product.category).map(product => ({
        label: `${product.category}|${product.subCategory ?? ''}`, phrase: '', features: rawFeatures(words(product.name)), weight: 1.5,
        hsn: product.hsn, gst: product.taxPercent, loose: false, store: true,
      })),
    ]
    const documentFrequency = new Map<string, number>()
    for (const doc of raw) for (const feature of doc.features.keys()) documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1)
    for (const [feature, count] of documentFrequency) this.idf.set(feature, Math.log((raw.length + 1) / (count + 1)) + 1)
    this.docs = raw.map(({ features, ...doc }) => ({ ...doc, vector: this.weigh(features) }))
  }

  private weigh(features: Map<string, number>) {
    const vector = new Map<string, number>()
    let norm = 0
    for (const [feature, count] of features) {
      const value = count * (this.idf.get(feature) ?? 0)
      if (!value) continue
      vector.set(feature, value); norm += value * value
    }
    norm = Math.sqrt(norm) || 1
    for (const [feature, value] of vector) vector.set(feature, value / norm)
    return vector
  }

  // The k nearest examples, grouped by category|sub-category.
  classify(text: string, k = 7) {
    const query = this.weigh(rawFeatures(words(text)))
    const scored = this.docs.map(doc => {
      let similarity = 0
      for (const [feature, value] of query) similarity += value * (doc.vector.get(feature) ?? 0)
      return { doc, similarity: similarity * doc.weight }
    }).filter(item => item.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, k)
    const byLabel = new Map<string, { score: number; docs: Doc[] }>()
    for (const { doc, similarity } of scored) {
      const entry = byLabel.get(doc.label) ?? { score: 0, docs: [] }
      entry.score += similarity; entry.docs.push(doc)
      byLabel.set(doc.label, entry)
    }
    const ranked = [...byLabel].sort((a, b) => b[1].score - a[1].score)
    const total = ranked.reduce((sum, [, entry]) => sum + entry.score, 0)
    return { ranked, total, best: scored[0]?.similarity ?? 0 }
  }
}

const mostCommon = <T>(values: T[]) => {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export const cleanName = (name: string) => name.replace(/&/g, ' and ').replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------- draft
export function draftProduct(input: string, masters: StoreMasters, storeProducts: StoreProduct[], model = new ProductModel(storeProducts)): ProductDraft {
  const notes: string[] = []
  const pack = parsePack(input)
  const fullName = cleanName(input)
  const brand = findBrand(input, masters.brands)
  // Classify on the words that describe the item, not the brand or pack size.
  let text = ` ${words(input).join(' ')} `
  if (brand) text = text.replace(` ${words(brand.name).join(' ')} `, ' ')
  if (pack) text = text.replace(` ${words(pack.text).join(' ')} `, ' ')
  // Brands (and sub-brands such as Good Day) that say what the product is.
  const padded = ` ${words(input).join(' ')} `
  const hints = Object.entries(BRAND_HINTS).filter(([name]) => padded.includes(` ${words(name).join(' ')} `)).map(([, hint]) => hint)
  for (const [name] of Object.entries(BRAND_HINTS)) if (padded.includes(` ${words(name).join(' ')} `)) text = text.replace(` ${words(name).join(' ')} `, ' ')
  const { ranked, total, best } = model.classify(`${text} ${hints.join(' ')}`)
  const top = ranked[0]
  const confidence = !top || best < 0.18 ? 'low' : top[1].score / (total || 1) >= 0.6 && best >= 0.35 ? 'high' : 'medium'

  let category: Pick | null = null, subCategory: Pick | null = null, hsn: string | null = null, tax: ProductDraft['tax'] = null, loose = false
  let learnedFrom: ProductDraft['learnedFrom'] = null
  if (top && confidence !== 'low') {
    const [categoryName, subCategoryName] = top[0].split('|')
    const docs = top[1].docs
    learnedFrom = docs.some(doc => doc.store) ? 'store' : 'catalog'
    loose = docs.some(doc => doc.loose) && !pack
    // A store that keeps, say, "Ice creams" as its own category gets that, not the catalog's "Frozen Foods".
    const ownCategory = masters.categories.find(row => sameName(row.name, categoryName))
    const promoted = !ownCategory && subCategoryName ? masters.categories.find(row => sameName(row.name, subCategoryName)) : undefined
    const storeCategory = ownCategory ?? promoted
    category = storeCategory ? { id: storeCategory.id, name: storeCategory.name } : { id: null, name: categoryName }
    if (subCategoryName && !promoted) {
      const storeSub = storeCategory ? masters.subCategories.find(row => row.categoryId === storeCategory.id && sameName(row.name, subCategoryName)) : undefined
      subCategory = storeSub ? { id: storeSub.id, name: storeSub.name } : { id: null, name: subCategoryName }
    }
    hsn = mostCommon(docs.filter(doc => doc.store && doc.hsn).map(doc => doc.hsn)) ?? docs.find(doc => doc.hsn)?.hsn ?? null
  } else notes.push('Could not tell the category from the name. Pick it, or add a word like "biscuits" or "shampoo".')

  // GST: the rate the store already uses for this HSN, else the usual rate for it.
  if (hsn) {
    const storeRate = mostCommon(storeProducts.filter(product => product.hsn.slice(0, 4) === hsn!.slice(0, 4) && product.taxPercent !== null).map(product => product.taxPercent!))
    const usual = CATALOG.find(entry => entry.hsn === hsn)?.gst ?? null
    const percent = storeRate ?? usual
    if (percent !== null) {
      const storeTax = masters.taxes.find(row => row.percent === percent)
      tax = storeTax ? { id: storeTax.id, name: storeTax.name, percent } : { id: null, name: `GST ${percent}%`, percent }
      notes.push(storeRate !== undefined && storeRate !== null ? `GST ${percent}% is what you already charge on HSN ${hsn}.` : `GST ${percent}% is the usual rate for HSN ${hsn}. Please confirm.`)
    }
  }

  const unit = pickUnit(masters.units, loose)
  const created = [category, subCategory, brand, unit, tax].filter((item): item is Pick => !!item && item.id === null).map(item => item.name)
  if (created.length) notes.push(`Will be added to your masters: ${created.join(', ')}.`)

  // Short name for the bill: brand, what it is, and the pack size.
  const phrase = top?.[1].docs.map(doc => doc.phrase).filter(item => item && ` ${text} `.includes(` ${words(item).join(' ')} `)).sort((a, b) => b.length - a.length)[0]
  const kind = phrase ?? (top ? words(text).find(word => top[1].docs.some(doc => doc.vector.has(`w:${word}`))) : undefined)
  const title = (value: string) => value.replace(/\b[a-z]/g, letter => letter.toUpperCase())
  const shortParts = [brand?.name, kind ? title(kind) : null, pack?.packSize.replace(' ', '')].filter(Boolean) as string[]
  const shortName = fullName.length <= 30 ? fullName : cleanName(shortParts.length >= 2 ? shortParts.join(' ') : fullName).slice(0, 30).trim()

  return { fullName, shortName, packSize: pack?.packSize ?? null, brand, category, subCategory, unit, hsn, tax, confidence, learnedFrom, notes }
}
