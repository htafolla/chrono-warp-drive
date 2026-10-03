interface ChronoTestGlobal {
  __chronoWarpRedisTestClient?: { enabled: true; client: unknown }
}

function testGlobal(): ChronoTestGlobal {
  return globalThis as ChronoTestGlobal
}

/** Vitest injects a Redis client without opening a real connection. `null` means Redis is down. */
export function setRedisClientForTests(client: unknown | null): void {
  testGlobal().__chronoWarpRedisTestClient = { enabled: true, client }
}

export function clearRedisClientForTests(): void {
  delete testGlobal().__chronoWarpRedisTestClient
}
