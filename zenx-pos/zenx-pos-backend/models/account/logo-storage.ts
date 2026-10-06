import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { LogoFile, LogoStorage } from './contracts.ts'

function extension(file: LogoFile) {
  const bytes = file.buffer
  if (file.mimeType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if ((file.mimeType === 'image/jpeg' || file.mimeType === 'image/jpg') && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (file.mimeType === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp'
  throw new Error('INVALID_LOGO_CONTENT')
}

export class DiskLogoStorage implements LogoStorage {
  private readonly root: string
  constructor(root: string) { this.root = resolve(root) }

  async save(file: LogoFile) {
    const directory = resolve(this.root, 'uploads', 'business_logos')
    await mkdir(directory, { recursive: true })
    const name = `${randomUUID()}.${extension(file)}`
    await writeFile(resolve(directory, name), file.buffer, { flag: 'wx' })
    return `uploads/business_logos/${name}`
  }

  async remove(path: string) {
    const target = resolve(this.root, path.replaceAll('/', sep))
    if (!target.startsWith(this.root + sep)) throw new Error('Logo path leaves upload root.')
    await rm(target, { force: true })
  }
}
