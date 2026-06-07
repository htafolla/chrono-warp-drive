import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                      bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                      bg-red-500 hover:bg-red-400 text-white transition-colors"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg
                      bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img alt={chain.name ?? 'Chain icon'} src={chain.iconUrl} className="w-4 h-4" />
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                      bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {account.displayName}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
