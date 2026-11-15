import assert from 'node:assert/strict'
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import manifest from '../../package.json' with { type: 'json' }
import playground from '../../playground/package.json' with { type: 'json' }

const root = fileURLToPath(new URL('../../', import.meta.url))
const temporary = mkdtempSync(join(tmpdir(), 'rentnertable-consumer-'))

function verifyTemporaryDirectory() {
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()))
    assert.ok(basename(temporary).startsWith('rentnertable-consumer-'))
}

verifyTemporaryDirectory()
const run = (args: string[], cwd = temporary) => {
    const result = Bun.spawnSync(args, { cwd, stdout: 'pipe', stderr: 'pipe' })
    assert.equal(
        result.exitCode,
        0,
        `${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
    )
}

try {
    run(
        ['bun', 'pm', 'pack', '--ignore-scripts', '--destination', temporary],
        root,
    )
    const artifact = join(temporary, `rentnerkev-table-${manifest.version}.tgz`)
    assert.ok(existsSync(artifact), 'The actual npm tarball must exist')
    const react =
        process.env.CONSUMER_REACT_VERSION ?? manifest.devDependencies.react
    await Bun.write(
        join(temporary, 'package.json'),
        JSON.stringify({
            name: 'rentnertable-packed-consumer',
            private: true,
            type: 'module',
            dependencies: {
                '@rentnerkev/table': `file:${artifact}`,
                react,
                'react-dom': react,
            },
            devDependencies: {
                typescript: manifest.devDependencies.typescript,
                '@types/react': manifest.devDependencies['@types/react'],
                '@types/react-dom':
                    manifest.devDependencies['@types/react-dom'],
                vite: playground.dependencies.vite,
                '@tailwindcss/vite':
                    playground.dependencies['@tailwindcss/vite'],
                tailwindcss: playground.dependencies.tailwindcss,
            },
        }),
    )
    run(['bun', 'install', '--ignore-scripts'])
    const installed = join(temporary, 'node_modules/@rentnerkev/table')
    for (const [entry, target] of Object.entries(manifest.exports)) {
        for (const file of typeof target === 'string'
            ? [target]
            : Object.values(target)) {
            assert.ok(
                existsSync(join(installed, file)),
                `Export ${entry} must exist: ${file}`,
            )
        }
    }
    for (const path of [
        'playground',
        'src',
        'dist/tests',
        'scripts',
        '.github',
    ]) {
        assert.ok(
            !existsSync(join(installed, path)),
            `${path} must not leak into the package`,
        )
    }

    await Bun.write(
        join(temporary, 'consumer.tsx'),
        `
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Table, DataTable, createTableColumnHelper } from '@rentnerkev/table'
import { Table as DirectTable } from '@rentnerkev/table/table'
import { DataTable as DirectDataTable } from '@rentnerkev/table/data-table'
import type { TableProps, DataTableProps } from '@rentnerkev/table/types'
type Person = { id: string; name: string; age: number }
const helper = createTableColumnHelper<Person>()
const columns = helper.columns([
    helper.accessor('name', { header: 'Name', cell: (cell) => cell.getValue().toUpperCase() }),
    helper.accessor('age', { header: 'Age' }),
])
const props: TableProps<Person> = { data: [{ id: 'one', name: 'Alex', age: 24 }], columns, caption: 'People' }
const markup = renderToString(createElement(Table<Person>, props))
if (!markup.includes('ALEX') || !markup.includes('<table')) throw new Error('SSR table missing')
if (Table !== DirectTable) throw new Error('Subpath exports differ')
const rich: DataTableProps<Person> = { data: props.data, columns, getRowId: (row) => row.id, title: 'People', selectable: true }
const richMarkup = renderToString(createElement(DataTable<Person>, rich))
if (!richMarkup.includes('ALEX') || !richMarkup.includes('data-rentner-data-table')) throw new Error('SSR data table missing')
if (DataTable !== DirectDataTable) throw new Error('Data table subpath differs')
`,
    )
    await Bun.write(
        join(temporary, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: {
                strict: true,
                noEmit: true,
                skipLibCheck: true,
                target: 'ESNext',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                jsx: 'react-jsx',
                lib: ['ESNext', 'DOM'],
            },
            include: ['consumer.tsx'],
        }),
    )
    run(['bun', 'run', '--bun', 'tsc', '--noEmit'])
    const build = await Bun.build({
        entrypoints: [join(temporary, 'consumer.tsx')],
        target: 'node',
        format: 'esm',
        external: [
            'react',
            'react-dom/server',
            '@rentnerkev/table',
            '@rentnerkev/table/table',
            '@rentnerkev/table/data-table',
        ],
    })
    assert.ok(build.success, build.logs.join('\n'))
    const output = build.outputs[0]
    assert.ok(output, 'The Node consumer must produce a bundle')
    await Bun.write(join(temporary, 'consumer.mjs'), output)
    run(['node', 'consumer.mjs'])

    await Bun.write(
        join(temporary, 'index.html'),
        '<html><body><div id="root"></div><script type="module" src="/browser.tsx"></script></body></html>',
    )
    await Bun.write(
        join(temporary, 'browser.tsx'),
        `
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DataTable } from '@rentnerkev/table/data-table'
import './styles.css'
const root = document.getElementById('root')
if (root) createRoot(root).render(createElement(DataTable, { data: [], columns: [], getRowId: (_row: object, index: number) => String(index), title: 'People' }))
`,
    )
    await Bun.write(
        join(temporary, 'styles.css'),
        "@import 'tailwindcss';\n@import '@rentnerkev/table/tailwind.css';\n",
    )
    await Bun.write(
        join(temporary, 'vite.config.ts'),
        `import { defineConfig } from 'vite'\nimport tailwindcss from '@tailwindcss/vite'\nexport default defineConfig({ plugins: [tailwindcss()] })\n`,
    )
    run(['bun', 'run', '--bun', 'vite', 'build'])
    const assets = join(temporary, 'dist/assets')
    const cssFile = readdirSync(assets).find((name) => name.endsWith('.css'))
    assert.ok(cssFile, 'The installed CSS entry must compile')
    const css = readFileSync(join(assets, cssFile), 'utf8')
    assert.ok(
        css.includes('--rentner-accent'),
        'Shared theme tokens must reach the consumer',
    )
    assert.ok(
        css.includes('.border-collapse'),
        'Tailwind must discover classes in the packaged dist files',
    )
    const map = JSON.parse(
        readFileSync(
            join(installed, 'dist/shared/Table/Components/Table.js.map'),
            'utf8',
        ),
    )
    assert.ok(
        map.sourcesContent?.every((source: string) => source.length > 0),
        'Source maps must include their sources',
    )
    console.log(
        'Packed consumer passed: native Node ESM, SSR, TypeScript, subpath exports, Vite browser build and packaged Tailwind styles.',
    )
} finally {
    verifyTemporaryDirectory()
    rmSync(temporary, { recursive: true, force: true })
}
