export class Redis {
  constructor(_url?: string) {}
  async publish(): Promise<number> { return 0 }
  async subscribe(): Promise<void> {}
  on(): void {}
  async quit(): Promise<void> {}
}

export default Redis
