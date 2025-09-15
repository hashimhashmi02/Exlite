export type AssetSym = "BTC" | "ETH" | "SOL";
export const DEFAULT_ASSETS: { symbol: AssetSym; name: string; imageUrl?: string }[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
];
