/**
 * Coalesce concurrent asynchronous work for the same key.
 * A different key may start a new operation without letting the previous
 * operation clear the newer one when it eventually settles.
 */
export function createKeyedSingleFlight<K, T>() {
  let current: { key: K; promise: Promise<T> } | null = null

  return (key: K, task: () => Promise<T>): Promise<T> => {
    if (current && Object.is(current.key, key)) return current.promise

    const promise = Promise.resolve()
      .then(task)
      .finally(() => {
        if (current?.promise === promise) current = null
      })

    current = { key, promise }
    return promise
  }
}
