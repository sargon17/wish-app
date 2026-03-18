import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('merges class names and tailwind utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignores falsey values', () => {
    expect(cn('foo', false && 'bar', undefined, null)).toBe('foo')
  })
})
