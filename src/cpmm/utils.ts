import { CREATE_CPMM_POOL_PROGRAM, DEV_CREATE_CPMM_POOL_PROGRAM } from '@raydium-io/raydium-sdk-v2'

const VALID_PROGRAM_ID = new Set([CREATE_CPMM_POOL_PROGRAM.toBase58(), DEV_CREATE_CPMM_POOL_PROGRAM.toBase58()])

export const isValidCpmm = (id: string) => VALID_PROGRAM_ID.has(id)
