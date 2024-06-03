import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'

const VALID_PROGRAM_ID = new Set([CLMM_PROGRAM_ID.toBase58(), DEVNET_PROGRAM_ID.CLMM.toBase58()])

export const isValidClmm = (id: string) => VALID_PROGRAM_ID.has(id)
