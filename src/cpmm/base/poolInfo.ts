import { Connection, PublicKey } from '@solana/web3.js';
import { AccountLayout } from '@solana/spl-token';
import { CpmmPoolInfoLayout, CpmmConfigInfoLayout } from './layout';
import { CpmmPoolInfoInterface, CpmmConfigInfoInterface } from './interface';
import BN from 'bn.js';

export const getPoolInfo = async ({
  connection,
  poolId,
}: {
  connection: Connection;
  poolId: PublicKey;
}) => {
  const poolState = await connection.getAccountInfo(poolId);
  if (!poolState) throw new Error(`pool not found: ${poolId.toBase58()}`);
  const poolInfo = CpmmPoolInfoLayout.decode(
    poolState.data
  ) as CpmmPoolInfoInterface;

  const poolVaultAState = await connection.getAccountInfo(poolInfo.vaultA);
  const poolVaultBState = await connection.getAccountInfo(poolInfo.vaultB);

  if (!poolVaultAState) throw new Error(`pool vaultA info not found`);
  if (!poolVaultBState) throw new Error(`pool vaultB info not found`);

  const poolReserve = {
    mintA: new BN(AccountLayout.decode(poolVaultAState.data).amount.toString())
      .sub(poolInfo.protocolFeesMintA)
      .sub(poolInfo.fundFeesMintA),
    mintB: new BN(AccountLayout.decode(poolVaultBState.data).amount.toString())
      .sub(poolInfo.protocolFeesMintB)
      .sub(poolInfo.fundFeesMintB),
  };

  const configState = await connection.getAccountInfo(poolInfo.configId);

  if (!configState)
    throw new Error(`pool config not found: ${poolInfo.configId.toBase58()}`);
  const config = CpmmConfigInfoLayout.decode(
    configState.data
  ) as CpmmConfigInfoInterface;

  return {
    ...poolInfo,
    config,
    mintAReserve: poolReserve.mintA,
    mintBReserve: poolReserve.mintB,
  };
};
