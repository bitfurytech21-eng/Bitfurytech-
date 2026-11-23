export const MANUAL_PAYMENT_METHODS = [
  {
    id: "USDT (TRC20)",
    label: "USDT",
    network: "TRON (TRC20)",
    detail: "Stablecoin transfer",
  },
  {
    id: "Bitcoin (BTC)",
    label: "Bitcoin",
    network: "Bitcoin Mainnet",
    detail: "On-chain BTC transfer",
  },
  {
    id: "Ethereum (ETH)",
    label: "Ethereum",
    network: "Ethereum Mainnet (ERC20)",
    detail: "On-chain ETH transfer",
  },
  {
    id: "Bank Wire",
    label: "Bank wire",
    network: "SWIFT / Fedwire",
    detail: "Manual bank settlement",
  },
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];
