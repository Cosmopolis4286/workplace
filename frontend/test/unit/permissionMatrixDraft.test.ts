import { describe, expect, it } from 'vitest'
import { getPermissionMatrixChanges } from '../../utils/permissionMatrixDraft'

describe('getPermissionMatrixChanges', () => {
  it('returns only values that differ from the server snapshot', () => {
    const original = { permission1: { ADMIN: true, NORMAL: false } }
    const draft = { permission1: { ADMIN: false, NORMAL: true } }

    expect(getPermissionMatrixChanges(original, draft, ['ADMIN', 'NORMAL'])).toEqual([
      { permissionId: 'permission1', key: 'ADMIN', granted: false },
      { permissionId: 'permission1', key: 'NORMAL', granted: true },
    ])
  })

  it('removes a pending change when the original value is restored', () => {
    const original = { permission1: { ADMIN: true } }
    const restoredDraft = { permission1: { ADMIN: true } }

    expect(getPermissionMatrixChanges(original, restoredDraft, ['ADMIN'])).toEqual([])
  })

  it('treats missing values as denied and ignores rows absent from the draft', () => {
    const original = { permission1: { ADMIN: false } }
    const draft = {
      permission1: { ADMIN: true },
      permission2: {},
    }

    expect(getPermissionMatrixChanges(original, draft, ['ADMIN', 'NORMAL'])).toEqual([
      { permissionId: 'permission1', key: 'ADMIN', granted: true },
    ])
  })
})
