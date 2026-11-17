import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { renderToString } from 'react-dom/server'
import { hydrationTree } from './nativeHydration.fixture.tsx'

async function enable(page: Page) {
    await page.goto('/')
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    const handle = page.getByRole('button', {
        name: 'Move Kevin Sträßler',
        exact: true,
    })
    await expect(handle).toBeEnabled()
    return handle
}

async function point(handle: Locator) {
    await handle.scrollIntoViewIfNeeded()
    const box = await handle.boundingBox()
    if (!box) throw new Error('Drag handle has no geometry')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function pointer(
    page: Page,
    type: string,
    id: number,
    x: number,
    y: number,
) {
    await page.locator('body').dispatchEvent(type, {
        pointerId: id,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
    })
}

test('touch hold, tolerance, foreign pointer ownership, cancellation and mobile drop use real layout', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const handle = await enable(page)
    const start = await point(handle)
    const preview = page.locator('[data-rentner-row-preview]')
    await handle.dispatchEvent('pointerdown', {
        pointerId: 41,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: start.x,
        clientY: start.y,
    })
    await pointer(page, 'pointermove', 41, start.x, start.y + 9)
    await page.waitForTimeout(210)
    await expect(preview).toHaveCount(0)
    await handle.dispatchEvent('pointerdown', {
        pointerId: 42,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: start.x,
        clientY: start.y,
    })
    await expect(preview).toBeVisible()
    await expect(handle).toHaveAttribute('aria-pressed', 'true')
    await pointer(page, 'pointercancel', 99, start.x, start.y)
    await expect(preview).toBeVisible()
    await pointer(page, 'pointercancel', 42, start.x, start.y)
    await expect(preview).toHaveCount(0)
    await expect(handle).toBeFocused()
    await handle.dispatchEvent('pointerdown', {
        pointerId: 43,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: start.x,
        clientY: start.y,
    })
    await expect(preview).toBeVisible()
    const destination = await page
        .locator('tr[data-row-id="alex"]')
        .boundingBox()
    if (!destination) throw new Error('Target row has no geometry')
    await pointer(
        page,
        'pointermove',
        43,
        start.x,
        destination.y + destination.height / 2,
    )
    await pointer(
        page,
        'pointerup',
        43,
        start.x,
        destination.y + destination.height / 2,
    )
    await expect(
        page.locator('table > tbody[data-sortable-row]').first(),
    ).toHaveAttribute('data-sortable-row', 'alex')
    await expect(
        page.locator('table > tbody[data-sortable-row]').nth(1),
    ).toHaveAttribute('data-sortable-row', 'kevin')
    await expect(preview).toHaveCount(0)
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
})

test('expanded groups transform by full height, capture pointer, autoscroll both boundaries and respect reduced motion', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const handle = await enable(page)
    await page
        .getByRole('button', {
            name: 'Expand details for Kevin Sträßler',
            exact: true,
        })
        .click()
    const table = page.getByRole('table')
    await table.evaluate((element) => {
        if (element.parentElement)
            element.parentElement.style.maxHeight = '400px'
    })
    await table.scrollIntoViewIfNeeded()
    const viewport = table.locator('..')
    const bounds = await viewport.boundingBox()
    const group = table.locator('tbody[data-sortable-row="kevin"]')
    const sourceHeight = await group.evaluate(
        (element) => element.getBoundingClientRect().height,
    )
    const start = await point(handle)
    if (!bounds) throw new Error('Scroll viewport has no geometry')
    await handle.evaluate((element) =>
        element.addEventListener(
            'pointerdown',
            (event) => {
                element.dataset.testPointerId = String(event.pointerId)
            },
            { once: true },
        ),
    )
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, bounds.y + bounds.height - 6, { steps: 12 })
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    expect(
        await handle.evaluate((element) =>
            element.hasPointerCapture(Number(element.dataset.testPointerId)),
        ),
    ).toBe(true)
    await expect
        .poll(() => viewport.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(20)
    const other = table.locator('tbody[data-sortable-row="alex"]')
    await expect
        .poll(() =>
            other.evaluate(
                (element) =>
                    new DOMMatrix(getComputedStyle(element).transform).m42,
            ),
        )
        .toBeCloseTo(-sourceHeight, 0)
    await expect(other).toHaveCSS('transition-property', 'none')
    await expect(group).toHaveCSS('opacity', '0')
    await expect
        .poll(() =>
            viewport.evaluate(
                (element) =>
                    element.scrollHeight -
                    element.clientHeight -
                    element.scrollTop,
            ),
        )
        .toBeLessThanOrEqual(1)
    const previewBox = await page
        .locator('[data-rentner-row-preview]')
        .boundingBox()
    expect(previewBox?.y).toBeGreaterThanOrEqual(bounds.y)
    expect(
        (previewBox?.y ?? 0) + (previewBox?.height ?? 0),
    ).toBeLessThanOrEqual(bounds.y + bounds.height + 3)
    await page.mouse.move(start.x, bounds.y + 5, { steps: 6 })
    await expect
        .poll(() => viewport.evaluate((element) => element.scrollTop))
        .toBe(0)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(group).not.toHaveAttribute('data-dragging')
    await expect(handle).toBeFocused()
})

test('translated instructions and live announcements, animation, blur and disabled guards remain available', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await enable(page)
    await page.getByRole('button', { name: 'Deutsch', exact: true }).click()
    const handle = page.getByRole('button', {
        name: 'Kevin Sträßler verschieben',
        exact: true,
    })
    const description = await handle.getAttribute('aria-describedby')
    expect(description).toBeTruthy()
    expect(
        await page.evaluate(
            (id) => document.getElementById(id ?? '')?.textContent,
            description,
        ),
    ).toContain('Leertaste')
    await handle.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'Kevin Sträßler aufgenommen.',
    )
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'Position 2 von 10',
    )
    await expect(
        page.locator('table > tbody[data-sortable-row="alex"]'),
    ).toHaveCSS('transition-duration', '0.2s')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'abgebrochen',
    )
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page
        .getByRole('button', { name: 'Loading state', exact: true })
        .click()
    await expect(page.locator('[data-row-drag-handle]')).toHaveCount(0)
    await page
        .getByRole('button', { name: 'Loading state', exact: true })
        .click()
    await page.getByRole('button', { name: 'Error state', exact: true }).click()
    await expect(page.locator('[data-row-drag-handle]')).toHaveCount(0)
})

test('Chromium real mobile touch capture, hold, reorder and cancellation', async ({
    page,
    context,
    browserName,
}) => {
    test.skip(
        browserName !== 'chromium',
        'Physical touch injection requires the Chromium CDP protocol; portable pointer behavior is checked in every engine.',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    const handle = await enable(page)
    const start = await point(handle)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 1,
    })
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: start.x, y: start.y, id: 1 }],
    })
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    const destination = await page
        .locator('tr[data-row-id="alex"]')
        .boundingBox()
    if (!destination) throw new Error('Target row has no geometry')
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
            { x: start.x, y: destination.y + destination.height / 2, id: 1 },
        ],
    })
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
    })
    await expect(
        page.locator('table > tbody[data-sortable-row]').nth(1),
    ).toHaveAttribute('data-sortable-row', 'kevin')
    const second = await point(handle)
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: second.x, y: second.y, id: 2 }],
    })
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchCancel',
        touchPoints: [],
    })
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(handle).toHaveAttribute('aria-pressed', 'false')
})

test('server-rendered native rows hydrate without recovery and expose instructions', async ({
    page,
}) => {
    const markup = renderToString(hydrationTree(), {
        identifierPrefix: 'native-test-',
    })
    await page.goto('/')
    const fixturePath = fileURLToPath(
        new URL('./nativeHydration.fixture.tsx', import.meta.url),
    )
    const browserFixture = execFileSync(
        'bun',
        [
            '--no-env-file',
            'build',
            fixturePath,
            '--target',
            'browser',
            '--format',
            'iife',
            '--minify',
        ],
        { encoding: 'utf8', maxBuffer: 5_000_000 },
    )
    await page.addScriptTag({ content: browserFixture })
    const errors = await page.evaluate(
        (serverMarkup) => window.hydrateNativeFixture(serverMarkup),
        markup,
    )
    expect(errors).toEqual([])
    const handle = page
        .locator('[data-native-hydration]')
        .getByRole('button', { name: 'Move Hydrated Alpha', exact: true })
    await expect(handle).toBeVisible()
    const description = await handle.getAttribute('aria-describedby')
    expect(
        await page.evaluate(
            (id) => Boolean(document.getElementById(id ?? '')),
            description,
        ),
    ).toBe(true)
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
})

test('Tab completes keyboard reorder, preserves focus and leaves later tab navigation usable', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    const handle = await enable(page)
    await handle.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(handle).toHaveAttribute('aria-pressed', 'false')
    await expect(handle).toBeFocused()
    await expect(
        page.locator('table > tbody[data-sortable-row]').nth(1),
    ).toHaveAttribute('data-sortable-row', 'kevin')
    await page.keyboard.press('Tab')
    await expect(handle).not.toBeFocused()
    await handle.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await page.setViewportSize({ width: 1400, height: 1200 })
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
})

test('drag previews retain scoped CSS tokens and stay in an iframe owner document', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    const handle = await enable(page)
    await page.locator('[data-rentner-data-table]').evaluate((element) => {
        element.style.setProperty('--rentner-surface', 'rgb(247, 241, 220)')
        element.style.setProperty('--rentner-foreground', 'rgb(12, 34, 56)')
    })
    await handle.focus()
    await page.keyboard.press('Space')
    const preview = page.locator('[data-rentner-row-preview]')
    await expect(preview).toHaveCSS('background-color', 'rgb(247, 241, 220)')
    await expect(preview.locator('table')).toHaveCSS(
        'background-color',
        'rgb(247, 241, 220)',
    )
    await expect(preview.locator('table')).toHaveCSS('color', 'rgb(12, 34, 56)')
    await expect(
        preview.locator('xpath=ancestor::*[@data-rentner-data-table]'),
    ).toHaveCount(1)
    await page.keyboard.press('Escape')
    const markup = renderToString(hydrationTree(), {
        identifierPrefix: 'native-test-',
    })
    const fixturePath = fileURLToPath(
        new URL('./nativeHydration.fixture.tsx', import.meta.url),
    )
    const browserFixture = execFileSync(
        'bun',
        [
            '--no-env-file',
            'build',
            fixturePath,
            '--target',
            'browser',
            '--format',
            'iife',
            '--minify',
        ],
        { encoding: 'utf8', maxBuffer: 5_000_000 },
    )
    await page.evaluate(() => {
        const iframe = document.createElement('iframe')
        iframe.name = 'native-drag-frame'
        iframe.width = '600'
        iframe.height = '400'
        document.body.appendChild(iframe)
    })
    const frame = page.frame('native-drag-frame')
    if (!frame) throw new Error('Frame fixture missing')
    await frame.addScriptTag({ content: browserFixture })
    expect(
        await frame.evaluate(
            (serverMarkup) => window.hydrateNativeFixture(serverMarkup),
            markup,
        ),
    ).toEqual([])
    const iframeHandle = frame.getByRole('button', {
        name: 'Move Hydrated Alpha',
        exact: true,
    })
    await iframeHandle.focus()
    await page.keyboard.press('Space')
    await expect(frame.locator('[data-rentner-row-preview]')).toBeVisible()
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    const description = await iframeHandle.getAttribute('aria-describedby')
    expect(
        await frame.evaluate(
            (id) => Boolean(document.getElementById(id ?? '')),
            description,
        ),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(frame.locator('[data-rentner-row-preview]')).toHaveCount(0)
})

test('non-overflowing viewport clamps previews and outer scroll ancestors remain reachable', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 2000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const handle = await enable(page)
    const viewport = page.locator('[data-rentner-table-container]')
    expect(
        await viewport.evaluate(
            (element) => element.scrollHeight <= element.clientHeight,
        ),
    ).toBe(true)
    const bounds = await viewport.boundingBox()
    const start = await point(handle)
    if (!bounds) throw new Error('Viewport fixture missing')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x, bounds.y + bounds.height + 100, { steps: 8 })
    const preview = page.locator('[data-rentner-row-preview]')
    await expect(preview).toBeVisible()
    const previewBounds = await preview.boundingBox()
    expect(
        (previewBounds?.y ?? 0) + (previewBounds?.height ?? 0),
    ).toBeLessThanOrEqual(bounds.y + bounds.height + 3)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.locator('[data-rentner-data-table]').evaluate((element) => {
        const wrapper = document.createElement('div')
        wrapper.dataset.testOuterScroll = ''
        wrapper.style.height = '460px'
        wrapper.style.overflow = 'auto'
        element.replaceWith(wrapper)
        wrapper.appendChild(element)
        const spacer = document.createElement('div')
        spacer.style.height = '400px'
        wrapper.appendChild(spacer)
        const inner = element.querySelector<HTMLElement>(
            '[data-rentner-table-container]',
        )
        if (inner) inner.style.maxHeight = '220px'
    })
    const outer = page.locator('[data-test-outer-scroll]')
    const outerBounds = await outer.boundingBox()
    const nextStart = await point(handle)
    if (!outerBounds) throw new Error('Outer scroll fixture missing')
    await page.mouse.move(nextStart.x, nextStart.y)
    await page.mouse.down()
    await page.mouse.move(nextStart.x, outerBounds.y + outerBounds.height - 4, {
        steps: 10,
    })
    await expect(preview).toBeVisible()
    await expect
        .poll(() => outer.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(40)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(preview).toHaveCount(0)
})
