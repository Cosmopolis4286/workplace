export type PermissionMatrix = Record<string, Record<string, boolean>>

export interface PermissionMatrixChange {
  permissionId: string
  key: string
  granted: boolean
}

/**
 * Returns only values that differ from the last server snapshot.
 * This keeps the pending count accurate when an administrator toggles
 * a permission and then restores its original value before saving.
 */
export function getPermissionMatrixChanges(
  original: PermissionMatrix,
  draft: PermissionMatrix,
  keys: readonly string[],
): PermissionMatrixChange[] {
  const changes: PermissionMatrixChange[] = []

  for (const [permissionId, values] of Object.entries(draft)) {
    const originalValues = original[permissionId]

    for (const key of keys) {
      const granted = values[key] ?? false
      const originalGranted = originalValues?.[key] ?? false

      if (granted !== originalGranted) {
        changes.push({ permissionId, key, granted })
      }
    }
  }

  return changes
}
