import type { Member } from '../Types/playground.types.ts'

export function createDemoMembers(seeds: readonly Member[]): Member[] {
    return Array.from({ length: 48 }, (_, index) => {
        const seed = seeds[index % seeds.length]
        if (!seed) throw new Error('Demo members require at least one seed')
        if (index < seeds.length) return { ...seed }
        return {
            ...seed,
            id: `${seed.id}-${index + 1}`,
            name: `${seed.name} ${index + 1}`,
            email: `${seed.id}.${index + 1}@example.com`,
            projects: index % 12,
            active: index % 4 !== 0,
            createdAt: `2026-${index % 2 === 0 ? '10' : '11'}-${String((index % 14) + 1).padStart(2, '0')}`,
        }
    })
}
