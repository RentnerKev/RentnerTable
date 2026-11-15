import { AxeBuilder } from '@axe-core/playwright'
import { chromium, firefox, webkit } from '@playwright/test'

const [browserName, baseURL] = process.argv.slice(2)
if (!baseURL) throw new Error('A playground URL is required')
if (
    browserName !== 'chromium' &&
    browserName !== 'firefox' &&
    browserName !== 'webkit'
)
    throw new Error('An explicit test browser is required')
const browser = await { chromium, firefox, webkit }[browserName].launch()
try {
    const context = await browser.newContext({
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    await page.goto(baseURL)
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    await page
        .getByRole('button', { name: 'Move Kevin Sträßler', exact: true })
        .waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page
        .getByRole('button', { name: /^Filter Joined/ })
        .waitFor({ state: 'visible' })
    await page
        .getByRole('checkbox', { name: 'Select Kevin Sträßler', exact: true })
        .check()
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page
        .getByRole('menu', { name: 'Columns', exact: true })
        .waitFor({ state: 'visible' })
    const result = await new AxeBuilder({ page }).analyze()
    console.log(
        JSON.stringify(
            result.violations.map(({ id, nodes }) => ({
                id,
                targets: nodes.map(({ target }) => target),
            })),
        ),
    )
} finally {
    await browser.close()
}
