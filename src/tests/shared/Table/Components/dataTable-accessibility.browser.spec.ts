import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'

const execute = promisify(execFile)
const scanner = fileURLToPath(
    new URL('./scanTableAccessibility.ts', import.meta.url),
)

test('keeps filters, selection, and popup menus accessible', async ({
    browserName,
    baseURL,
}) => {
    if (!baseURL) throw new Error('The table playground URL must be configured')
    // Isolate axe from the test worker: Firefox can terminate its scan tab on Windows.
    const result = await execute('bun', [scanner, browserName, baseURL], {
        timeout: 25_000,
        maxBuffer: 1_000_000,
    })
    expect(result.stdout.trim()).toBe('[]')
})
