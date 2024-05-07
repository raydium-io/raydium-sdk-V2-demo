import { PublicKey } from '@solana/web3.js';
import { findProgramAddress } from '../../common/programId';

export const AUTH_SEED = Buffer.from('vault_and_lp_mint_auth_seed', 'utf8');
export const AMM_CONFIG_SEED = Buffer.from('amm_config', 'utf8');
export const POOL_SEED = Buffer.from('pool', 'utf8');
export const POOL_LP_MINT_SEED = Buffer.from('pool_lp_mint', 'utf8');
export const POOL_VAULT_SEED = Buffer.from('pool_vault', 'utf8');
export const OBSERVATION_SEED = Buffer.from('observation', 'utf8');

export function getPdaPoolAuthority(programId: PublicKey) {
  return findProgramAddress([AUTH_SEED], programId);
}

export function getPdaAmmConfigId(programId: PublicKey, index: number) {
  return findProgramAddress([AMM_CONFIG_SEED, u16ToBytes(index)], programId);
}

export function getPdaPoolId(
  programId: PublicKey,
  ammConfigId: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey
) {
  return findProgramAddress(
    [POOL_SEED, ammConfigId.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
    programId
  );
}

export function getPdaLpMint(programId: PublicKey, poolId: PublicKey) {
  return findProgramAddress([POOL_LP_MINT_SEED, poolId.toBuffer()], programId);
}

export function getPdaVault(
  programId: PublicKey,
  poolId: PublicKey,
  mint: PublicKey
) {
  return findProgramAddress(
    [POOL_VAULT_SEED, poolId.toBuffer(), mint.toBuffer()],
    programId
  );
}

export function getPdaObservationId(programId: PublicKey, poolId: PublicKey) {
  return findProgramAddress([OBSERVATION_SEED, poolId.toBuffer()], programId);
}

export function u16ToBytes(num: number) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

export function getCreatePoolKeys({
  programId,
  mintA,
  mintB,
}: {
  programId: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
}) {
  const configId = getPdaAmmConfigId(programId, 0).publicKey;
  const authority = getPdaPoolAuthority(programId).publicKey;
  const poolId = getPdaPoolId(programId, configId, mintA, mintB).publicKey;
  const lpMint = getPdaLpMint(programId, poolId).publicKey;
  const vaultA = getPdaVault(programId, poolId, mintA).publicKey;
  const vaultB = getPdaVault(programId, poolId, mintB).publicKey;
  const observationId = getPdaObservationId(programId, poolId).publicKey;

  return {
    poolId,
    configId,
    authority,
    lpMint,
    vaultA,
    vaultB,
    observationId,
  };
}
