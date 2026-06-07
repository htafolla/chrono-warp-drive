import { http, fallback, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Dynamo', preference: 'all' }),
  ],
  transports: {
    [base.id]: fallback([
      http('https://mainnet.base.org', { timeout: 8000 }),
      http('https://base-rpc.publicnode.com', { timeout: 8000 }),
    ]),
  },
})
