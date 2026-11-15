import { expect, test, mock } from 'bun:test'
import { verifyTrustedPublisher } from '../../../.github/scripts/release/trusted-publisher.ts'

const identity = {
    requestUrl:
        'https://vstoken.actions.githubusercontent.com/job/identity?api-version=2',
    requestToken: 'runner-fixture',
}

test('verifies package-scoped OIDC trust without publishing or returning credentials', async () => {
    const requests: { url: string; init: RequestInit }[] = []
    const result = await verifyTrustedPublisher('@rentnerkev/table', {
        ...identity,
        request: async (url, init) => {
            requests.push({ url, init })
            return Response.json(
                requests.length === 1
                    ? { value: 'identity-fixture' }
                    : { token: 'exchange-fixture' },
            )
        },
    })
    expect(result).toBeUndefined()
    expect(requests).toHaveLength(2)
    expect(
        new URL(requests[0]?.url ?? 'https://invalid.test').searchParams.get(
            'audience',
        ),
    ).toBe('npm:registry.npmjs.org')
    expect(requests[1]?.url).toBe(
        'https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@rentnerkev%2Ftable',
    )
    expect(requests[1]?.init.method).toBe('POST')
    expect(requests[1]?.init.headers).toEqual({
        Authorization: 'Bearer identity-fixture',
        Accept: 'application/json',
    })
    expect(requests.every(({ init }) => init.redirect === 'error')).toBe(true)
})

test('refuses unrelated registries and OIDC origins before sending credentials', async () => {
    const request = mock(async () => Response.json({ value: 'fixture' }))
    await Promise.all(
        [
            'https://evil.invalid/identity',
            'http://vstoken.actions.githubusercontent.com/identity',
            'https://vstoken.actions.githubusercontent.com.evil.invalid/identity',
            'https://user@vstoken.actions.githubusercontent.com/identity',
        ].map((requestUrl) =>
            expect(
                verifyTrustedPublisher('@rentnerkev/table', {
                    ...identity,
                    requestUrl,
                    request,
                }),
            ).rejects.toThrow('Invalid GitHub OIDC request'),
        ),
    )
    await expect(
        verifyTrustedPublisher('@other/table', { ...identity, request }),
    ).rejects.toThrow('Unexpected public registry')
    expect(request).toHaveBeenCalledTimes(0)
})

test('fails closed for missing identities, denied exchanges and invalid token responses', async () => {
    await Promise.all(
        [
            [new Response('denied', { status: 403 })],
            [Response.json({ value: '' })],
            [
                Response.json({ value: 'fixture' }),
                new Response('denied', { status: 401 }),
            ],
            [Response.json({ value: 'fixture' }), Response.json({ token: '' })],
        ].map(async (responses) => {
            let index = 0
            await expect(
                verifyTrustedPublisher('@rentnerkev/table', {
                    ...identity,
                    request: async () =>
                        responses[index++] ??
                        new Response(null, { status: 500 }),
                }),
            ).rejects.toThrow('npm Trusted Publisher verification failed')
        }),
    )
})

test('does not expose credential-bearing transport errors', async () => {
    await expect(
        verifyTrustedPublisher('@rentnerkev/table', {
            ...identity,
            request: () =>
                Promise.reject(
                    new Error('Authorization: Bearer private-fixture'),
                ),
        }),
    ).rejects.toThrow(/^npm Trusted Publisher verification failed$/)
})
