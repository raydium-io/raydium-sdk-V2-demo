import { AMM_V4, AMM_STABLE, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'

const VALID_PROGRAM_ID = new Set([
  AMM_V4.toBase58(),
  AMM_STABLE.toBase58(),
  DEVNET_PROGRAM_ID.AmmV4.toBase58(),
  DEVNET_PROGRAM_ID.AmmStable.toBase58(),
])

export const isValidAmm = (id: string) => VALID_PROGRAM_ID.has(id)
