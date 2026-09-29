import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'

const objectHash = (kind: 'blob' | 'tree', body: Buffer): Buffer =>
  createHash('sha1').update(`${kind} ${body.length}\0`).update(body).digest()

// Git's tree SHA, including paths, executable bits and symlink targets. Used
// solely to compare an existing install against its official GitHub lock entry.
export const gitTreeHash = (directory: string): string => {
  const visit = (path: string): Buffer => {
    const names = readdirSync(path).sort((a, b) => {
      const left = a + (lstatSync(join(path, a)).isDirectory() ? '/' : '')
      const right = b + (lstatSync(join(path, b)).isDirectory() ? '/' : '')
      return Buffer.compare(Buffer.from(left), Buffer.from(right))
    })
    const entries = names.map((name) => {
      const target = join(path, name)
      const stat = lstatSync(target)
      let mode: string
      let hash: Buffer
      if (stat.isDirectory()) { mode = '40000'; hash = visit(target) }
      else if (stat.isSymbolicLink()) { mode = '120000'; hash = objectHash('blob', Buffer.from(readlinkSync(target))) }
      else if (stat.isFile()) { mode = stat.mode & 0o111 ? '100755' : '100644'; hash = objectHash('blob', readFileSync(target)) }
      else throw new Error(`Unsupported skill entry for Git tree verification: ${name}`)
      return Buffer.concat([Buffer.from(`${mode} ${name}\0`), hash])
    })
    return objectHash('tree', Buffer.concat(entries))
  }
  if (!lstatSync(directory).isDirectory()) throw new Error('Canonical skill is not a regular directory')
  return visit(directory).toString('hex')
}
