import { afterEach, expect, test } from 'bun:test'
import {
    mkdtempSync,
    mkdirSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
    getPackageDocumentation,
    getPackageExamples,
    getPackageInfo,
    searchPackageDocumentation,
} from '../../ai.ts'

type Ai = typeof import('../../ai.ts')
const temporary: string[] = []
afterEach(() => {
    for (const root of temporary.splice(0)) {
        if (
            dirname(resolve(root)) !== resolve(tmpdir()) ||
            !basename(root).startsWith('rentnertable-ai-')
        )
            throw new Error('Unexpected fixture directory')
        rmSync(root, { recursive: true, force: true })
    }
})

async function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'rentnertable-ai-'))
    temporary.push(root)
    mkdirSync(join(root, 'dist'))
    mkdirSync(join(root, 'docs'))
    const write = (path: string, content: string) =>
        writeFileSync(join(root, path), content)
    write(
        'dist/ai.ts',
        readFileSync(new URL('../../ai.ts', import.meta.url), 'utf8'),
    )
    write(
        'package.json',
        JSON.stringify({
            name: '@rentnerkev/table',
            version: '1.2.3',
            description: 'Fixture table',
            license: 'MIT',
            homepage: 'https://example.invalid',
            repository: { type: 'git', url: 'fixture' },
            peerDependencies: { react: '^19' },
            privateField: 'excluded',
            exports: {
                '.': { types: './dist/index.d.ts', import: './dist/index.js' },
                './types': { types: './dist/types.d.ts' },
                './ai': { types: './dist/ai.d.ts', import: './dist/ai.js' },
                './theme.css': './theme.css',
            },
        }),
    )
    write('README.md', '# Fixture table\nLiteral [.*] search\n')
    write(
        'docs/usage.md',
        '# Usage\nUse TableColumnSettings.\n```tsx\n<TableColumnSettings />\n```\n',
    )
    write('dist/index.js', "throw new Error('UI evaluated')")
    write(
        'dist/index.d.ts',
        "export { TableColumnSettings } from './column.js'\nexport type { TableColumnSettingsProps as ColumnSettingsProps } from './types.js'\nexport * from './public.js'\n",
    )
    write(
        'dist/column.d.ts',
        "import type { TableColumnSettingsProps } from './types.js'\nexport declare function TableColumnSettings(props: TableColumnSettingsProps): unknown\n",
    )
    write(
        'dist/types.d.ts',
        "import type { Internal } from './internal.js'\nexport interface TableColumnSettingsProps { id: string; value: Internal }\n",
    )
    write(
        'dist/internal.d.ts',
        "import type { TableColumnSettingsProps } from './types.js'\nexport interface Internal { nested?: TableColumnSettingsProps }\n",
    )
    write('dist/public.d.ts', 'export declare const publicHelper: string\n')
    const ai = (await import(
        pathToFileURL(join(root, 'dist/ai.ts')).href
    )) as Ai
    return { root, write, ai }
}

test('reads real package metadata and fixed packaged documentation without loading UI', () => {
    const manifest = JSON.parse(
        readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
    )
    expect(getPackageInfo().name).toBe(manifest.name)
    expect(getPackageInfo().version).toBe(manifest.version)
    expect(getPackageInfo().exports).toEqual(manifest.exports)
    expect(getPackageDocumentation('readme').path).toBe('README.md')
    expect(getPackageDocumentation().content).toContain('RentnerTable')
    expect(getPackageExamples().length).toBeGreaterThan(0)
    expect(searchPackageDocumentation('tanstack').length).toBeGreaterThan(0)
})

test('collects public declarations, aliases and star exports with cycle-safe local dependencies', async () => {
    const { ai } = await fixture()
    const api = ai.getPackageApi()
    expect(api.package).toBe('@rentnerkev/table')
    expect(api.version).toBe('1.2.3')
    expect(Object.keys(api.subpaths)).toEqual(['.', './types'])
    expect(api.declarations).toHaveLength(5)
    expect(
        api.declarations.every(
            (file) =>
                file.path.startsWith('dist/') && file.path.endsWith('.d.ts'),
        ),
    ).toBe(true)
    for (const symbol of [
        'TableColumnSettings',
        'ColumnSettingsProps',
        'publicHelper',
    ])
        expect(
            ai.getPackageApi({ subpath: '.', symbol }).declarations.length,
        ).toBeGreaterThan(0)
    expect(
        ai.getPackageApi({
            subpath: './types',
            symbol: 'TableColumnSettingsProps',
        }).declarations,
    ).toHaveLength(2)
    expect(() =>
        ai.getPackageApi({ subpath: '.', symbol: 'Internal' }),
    ).toThrow('Unknown public symbol')
    expect(ai.getPackageInfo()).not.toHaveProperty('privateField')
})

test('rejects arbitrary document paths, symbols, non-public subpaths and prototype keys', async () => {
    const { ai } = await fixture()
    for (const document of [
        '../package.json',
        'package.json',
        'file:///etc/passwd',
        '__proto__',
    ])
        expect(() => ai.getPackageDocumentation(document as 'usage')).toThrow(
            'Unknown package document',
        )
    for (const subpath of [
        './ai',
        './theme.css',
        '../package.json',
        '__proto__',
        'constructor',
    ])
        expect(() => ai.getPackageApi({ subpath })).toThrow(
            'Unknown public subpath',
        )
    for (const symbol of ['../private', 'a.b', 'some-name', ''])
        expect(() => ai.getPackageApi({ symbol })).toThrow(
            'Invalid public symbol',
        )
    expect(() => ai.getPackageApi({ symbol: 'MissingPublicSymbol' })).toThrow(
        'Unknown public symbol',
    )
})

test('rejects declaration imports and manifest entries escaping packaged dist', async () => {
    const { ai, write, root } = await fixture()
    write('private.d.ts', 'export declare const privateValue: string')
    write('dist/index.d.ts', "export * from '../private.js'")
    expect(() => ai.getPackageApi({ subpath: '.' })).toThrow(
        'Declaration must remain inside packaged dist',
    )
    const manifest = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8'),
    )
    manifest.exports['.'].types = './private.d.ts'
    write('package.json', JSON.stringify(manifest))
    expect(() => ai.getPackageApi({ subpath: '.' })).toThrow(
        'Declaration must remain inside packaged dist',
    )
})

test('rejects symlinked declaration directories escaping packaged dist', async () => {
    const { ai, write, root } = await fixture()
    const outside = join(root, 'private')
    mkdirSync(outside)
    write('private/leak.d.ts', 'export declare const leak: string')
    symlinkSync(
        outside,
        join(root, 'dist/linked'),
        process.platform === 'win32' ? 'junction' : 'dir',
    )
    write('dist/index.d.ts', "export * from './linked/leak.js'")
    expect(() => ai.getPackageApi({ subpath: '.' })).toThrow(
        'Declaration must remain inside packaged dist',
    )
})

test('searches literally with line numbers and returns exact fenced examples', async () => {
    const { ai } = await fixture()
    expect(ai.searchPackageDocumentation(' [.*] ')).toEqual([
        { path: 'README.md', line: 2, text: 'Literal [.*] search' },
    ])
    expect(ai.searchPackageDocumentation('TABLECOLUMNSETTINGS')).toHaveLength(2)
    expect(ai.searchPackageDocumentation('   ')).toEqual([])
    expect(ai.searchPackageDocumentation('unmatched.*')).toEqual([])
    expect(ai.getPackageExamples()).toEqual([
        { language: 'tsx', code: '<TableColumnSettings />' },
    ])
})

test('AI entry has no UI module evaluation and browser UI graph excludes node filesystem access', async () => {
    const { ai } = await fixture()
    expect(
        ai.getPackageApi({ symbol: 'TableColumnSettings' }).declarations.length,
    ).toBeGreaterThan(0)
    const build = await Bun.build({
        entrypoints: [
            fileURLToPath(new URL('../../index.ts', import.meta.url)),
        ],
        target: 'browser',
        format: 'esm',
        packages: 'external',
    })
    expect(build.success).toBe(true)
    const javascript = await Promise.all(
        build.outputs.map((output) => output.text()),
    )
    expect(javascript.join('\n')).not.toContain('node:fs')
    expect(javascript.join('\n')).not.toContain('getPackageDocumentation')
})
