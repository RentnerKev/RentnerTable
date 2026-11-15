import { isRecord } from '../lib/runtime.ts'
import { registryPackagePath } from './registry.ts'
import type { TrustedPublisherRequest } from './Types/registry.types.ts'

export async function verifyTrustedPublisher(
    packageName: string,
    { requestUrl, requestToken, request = fetch }: TrustedPublisherRequest,
): Promise<void> {
    const packagePath = registryPackagePath(packageName)
    const issuer = new URL(requestUrl)
    if (
        issuer.protocol !== 'https:' ||
        !issuer.hostname.endsWith('.actions.githubusercontent.com') ||
        issuer.username ||
        issuer.password ||
        issuer.port ||
        !requestToken ||
        /[\r\n]/.test(requestToken)
    )
        throw new Error('Invalid GitHub OIDC request')
    issuer.searchParams.set('audience', 'npm:registry.npmjs.org')
    try {
        const identity = await request(issuer.href, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${requestToken}`,
                Accept: 'application/json',
            },
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
        })
        const payload: unknown = identity.ok ? await identity.json() : undefined
        if (
            !isRecord(payload) ||
            typeof payload.value !== 'string' ||
            !payload.value
        )
            throw new Error('Missing OIDC identity')
        const exchange = await request(
            `https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/${packagePath}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${payload.value}`,
                    Accept: 'application/json',
                },
                redirect: 'error',
                signal: AbortSignal.timeout(30_000),
            },
        )
        const result: unknown = exchange.ok ? await exchange.json() : undefined
        if (
            !isRecord(result) ||
            typeof result.token !== 'string' ||
            !result.token
        )
            throw new Error('Publisher not authorized')
        // The short-lived token proves this workflow is trusted; never store or log it.
    } catch {
        throw new Error('npm Trusted Publisher verification failed')
    }
}
