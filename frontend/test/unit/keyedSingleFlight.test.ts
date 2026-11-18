import { describe, expect, it, vi } from 'vitest'
import { createKeyedSingleFlight } from '../../utils/keyedSingleFlight'

describe('createKeyedSingleFlight', () => {
  it('comparte la misma promesa para llamadas concurrentes con la misma clave', async () => {
    const singleFlight = createKeyedSingleFlight<string, boolean>()
    let resolveTask!: (value: boolean) => void
    const task = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveTask = resolve
        }),
    )

    const first = singleFlight('session-1', task)
    const second = singleFlight('session-1', task)

    expect(first).toBe(second)
    expect(task).toHaveBeenCalledTimes(0)

    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(1)
    resolveTask(true)

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
  })

  it('permite una nueva clave y evita que la promesa anterior borre la nueva', async () => {
    const singleFlight = createKeyedSingleFlight<number, string>()
    let resolveFirst!: (value: string) => void
    let resolveSecond!: (value: string) => void
    const firstTask = () =>
      new Promise<string>((resolve) => {
        resolveFirst = resolve
      })
    const secondTask = () =>
      new Promise<string>((resolve) => {
        resolveSecond = resolve
      })

    const first = singleFlight(1, firstTask)
    const second = singleFlight(2, secondTask)
    resolveFirst('old')
    await expect(first).resolves.toBe('old')

    const secondDuplicate = singleFlight(2, secondTask)
    expect(secondDuplicate).toBe(second)
    resolveSecond('new')
    await expect(second).resolves.toBe('new')
  })

  it('libera la clave cuando la operación termina', async () => {
    const singleFlight = createKeyedSingleFlight<string, number>()
    const task = vi.fn().mockResolvedValue(1)

    await expect(singleFlight('session-1', task)).resolves.toBe(1)
    await expect(singleFlight('session-1', task)).resolves.toBe(1)

    expect(task).toHaveBeenCalledTimes(2)
  })
})
