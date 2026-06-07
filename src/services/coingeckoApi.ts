export async function fetchEthPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  )
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`)
  const data = await res.json()
  const price = data?.ethereum?.usd
  if (!price || price <= 0) throw new Error('Invalid price data from CoinGecko')
  return price
}
