import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import Decimal from 'decimal.js';

import { connection, initWallet } from '@/common/connection';
import { getATAAddress } from '@/common/programId';
import { printSimulate, sendAndConfirm } from '@/common/transaction';
import { divCeil } from '@/common/math';
import {
  DEV_CREATE_POOL_PROGRAM,
  DEV_CREATE_POOL_FEE_ACC,
} from './base/programId';
import { getCreatePoolKeys, getPdaPoolAuthority } from './base/pda';
import { CurveCalculator } from './curve/calculator';
import { getPoolInfo } from './base/poolInfo';

import {
  CreatePool,
  Deposit,
  Withdraw,
  SwapBaseIn,
  SwapBaseOut,
} from './instruction';

// create cpmm pool demo on "devnet"

export const createPoolDemo = async () => {
  // set up mints you want to create here
  const mintA = new PublicKey('6fGYxM6mp2hs83GohNNGk7krhjwX54wQ9dtmJPcNuLsL');
  const mintB = new PublicKey('Fmj7GewCt8nenL2SW7LW2dX56rXRSpC4KgaCPCCXnw9S');
  const [mintAAmount, mintBAmount] = [new BN(100), new BN(200)];

  const { owner, tokenAccounts } = await initWallet();
  const userVaultA = tokenAccounts.get(mintA.toBase58())?.publicKey;
  const userVaultB = tokenAccounts.get(mintB.toBase58())?.publicKey;

  if (!userVaultA)
    throw new Error(`user do not have ${mintA.toBase58()} token acc`);
  if (!userVaultB)
    throw new Error(`user do not have ${mintB.toBase58()} token acc`);

  const poolKeys = getCreatePoolKeys({
    programId: DEV_CREATE_POOL_PROGRAM,
    mintA,
    mintB,
  });

  const { transaction, error } = await sendAndConfirm({
    connection,
    owner,
    instructions: [
      CreatePool(
        DEV_CREATE_POOL_PROGRAM,
        owner.publicKey,
        poolKeys.configId,
        poolKeys.authority,
        poolKeys.poolId,
        mintA,
        mintB,
        poolKeys.lpMint,
        userVaultA,
        userVaultB,
        getATAAddress(owner.publicKey, poolKeys.lpMint).publicKey,
        poolKeys.vaultA,
        poolKeys.vaultB,
        DEV_CREATE_POOL_FEE_ACC,
        TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        poolKeys.observationId,
        mintAAmount,
        mintBAmount,
        new BN(0)
      ),
    ],
  });

  return {
    error,
    transaction: error
      ? printSimulate(owner.publicKey, transaction)
      : undefined,
    id: poolKeys.poolId.toBase58(),
    poolKeys,
  };
};

// set up pool id you want to deposit/withdraw here
const dwPoolId = new PublicKey('2k7WYybHrDZaAHF59ikfUrUVRDYceM7zFDLURrXgPGaw');
export const poolDepositDemo = async () => {
  const baseIn = true;
  const inputAmount = new BN(1000000);

  const { owner, tokenAccounts } = await initWallet();
  const poolInfo = await getPoolInfo({ connection, poolId: dwPoolId });

  const userVaultA = tokenAccounts.get(poolInfo.mintA.toBase58())?.publicKey;
  const userVaultB = tokenAccounts.get(poolInfo.mintB.toBase58())?.publicKey;
  const userLpAccount = tokenAccounts.get(poolInfo.mintLp.toBase58())
    ?.publicKey;

  if (!userVaultA)
    throw new Error(`user do not have ${poolInfo.mintA.toBase58()} token acc`);
  if (!userVaultB)
    throw new Error(`user do not have ${poolInfo.mintB.toBase58()} token acc`);
  if (!userLpAccount)
    throw new Error(`user do not have ${poolInfo.mintB.toBase58()} token acc`);

  let anotherAmount = new BN(0);
  anotherAmount = baseIn
    ? divCeil(inputAmount.mul(poolInfo.mintBReserve), poolInfo.mintAReserve)
    : divCeil(inputAmount.mul(poolInfo.mintAReserve), poolInfo.mintBReserve);

  const liquidity = inputAmount
    .mul(poolInfo.lpAmount)
    .div(baseIn ? poolInfo.mintAReserve : poolInfo.mintBReserve);

  const { transaction, error } = await sendAndConfirm({
    connection,
    owner,
    instructions: [
      Deposit(
        DEV_CREATE_POOL_PROGRAM,
        owner.publicKey,
        getPdaPoolAuthority(DEV_CREATE_POOL_PROGRAM).publicKey,
        dwPoolId,
        userLpAccount,
        userVaultA,
        userVaultB,
        poolInfo.vaultA,
        poolInfo.vaultB,
        poolInfo.mintA,
        poolInfo.mintB,
        poolInfo.mintLp,

        liquidity,
        baseIn ? inputAmount : anotherAmount,
        baseIn ? anotherAmount : inputAmount
      ),
    ],
  });

  return {
    error,
    transaction: error
      ? printSimulate(owner.publicKey, transaction)
      : undefined,
    baseIn,
    lpAmount: poolInfo.lpAmount.toString(),
    inputAmount: new Decimal(inputAmount.toString())
      .div(10 ** poolInfo.mintDecimalA)
      .toString(),
    outputAmount: new Decimal(anotherAmount.toString())
      .div(10 ** poolInfo.mintDecimalB)
      .toString(),
    liquidity: new Decimal(liquidity.toString())
      .div(10 ** poolInfo.lpDecimals)
      .toString(),
  };
};

export const poolWithdrawDemo = async () => {
  const { owner, tokenAccounts } = await initWallet();
  const poolInfo = await getPoolInfo({ connection, poolId: dwPoolId });

  const userVaultA = tokenAccounts.get(poolInfo.mintA.toBase58())?.publicKey;
  const userVaultB = tokenAccounts.get(poolInfo.mintB.toBase58())?.publicKey;
  const userLpAccount = tokenAccounts.get(poolInfo.mintLp.toBase58());

  if (!userVaultA)
    throw new Error(`user do not have ${poolInfo.mintA.toBase58()} token acc`);
  if (!userVaultB)
    throw new Error(`user do not have ${poolInfo.mintB.toBase58()} token acc`);
  if (!userLpAccount)
    throw new Error(`user do not have ${poolInfo.mintLp.toBase58()} token acc`);

  const userLpAmount = new BN(String(userLpAccount.amount || 0));

  const { transaction, error } = await sendAndConfirm({
    connection,
    owner,
    instructions: [
      Withdraw(
        DEV_CREATE_POOL_PROGRAM,
        owner.publicKey,
        getPdaPoolAuthority(DEV_CREATE_POOL_PROGRAM).publicKey,
        dwPoolId,
        userLpAccount.publicKey!,
        userVaultA,
        userVaultB,
        poolInfo.vaultA,
        poolInfo.vaultB,
        poolInfo.mintA,
        poolInfo.mintB,
        poolInfo.mintLp,

        userLpAmount,
        userLpAmount.mul(poolInfo.mintAReserve).div(poolInfo.lpAmount),
        userLpAmount.mul(poolInfo.mintBReserve).div(poolInfo.lpAmount)
      ),
    ],
  });

  return {
    error,
    transaction: error
      ? printSimulate(owner.publicKey, transaction)
      : undefined,
    balance: userLpAmount.toString(),
    A: userLpAmount
      .mul(poolInfo.mintAReserve)
      .div(poolInfo.lpAmount)
      .toString(),
    B: userLpAmount
      .mul(poolInfo.mintBReserve)
      .div(poolInfo.lpAmount)
      .toString(),
  };
};

export const swapTokenBaseInDemo = async () => {
  const { owner, tokenAccounts } = await initWallet();
  const poolState = await connection.getAccountInfo(dwPoolId);
  if (!poolState) throw new Error(`pool not found: ${dwPoolId.toBase58()}`);
  const poolInfo = await getPoolInfo({ connection, poolId: dwPoolId });

  const userVaultA = tokenAccounts.get(poolInfo.mintA.toBase58())?.publicKey;
  const userVaultB = tokenAccounts.get(poolInfo.mintB.toBase58())?.publicKey;
  if (!userVaultA)
    throw new Error(`user do not have ${poolInfo.mintA.toBase58()} token acc`);
  if (!userVaultB)
    throw new Error(`user do not have ${poolInfo.mintB.toBase58()} token acc`);

  const inputAmount = new BN(10000);

  // swap pool mintA for mintB
  const res = CurveCalculator.swap(
    inputAmount,
    poolInfo.mintAReserve,
    poolInfo.mintBReserve,
    poolInfo.config.tradeFeeRate
  );

  const { transaction, error } = await sendAndConfirm({
    connection,
    owner,
    instructions: [
      SwapBaseIn(
        DEV_CREATE_POOL_PROGRAM,
        owner.publicKey,
        getPdaPoolAuthority(DEV_CREATE_POOL_PROGRAM).publicKey,
        poolInfo.configId,
        dwPoolId,
        userVaultA,
        userVaultB,
        poolInfo.vaultA,
        poolInfo.vaultB,
        TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        poolInfo.mintA,
        poolInfo.mintB,
        poolInfo.observationId,

        inputAmount,
        res.destinationAmountSwapped
      ),
    ],
  });

  return {
    error,
    transaction: error
      ? printSimulate(owner.publicKey, transaction)
      : undefined,
    input: new Decimal(inputAmount.toString())
      .div(10 ** poolInfo.mintDecimalA)
      .toString(),
    poolReserve: {
      mintA: new Decimal(poolInfo.mintAReserve.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      mintB: new Decimal(poolInfo.mintBReserve.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
    },
    res: {
      newPoolMintAAmount: new Decimal(res.newSwapSourceAmount.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      newPoolMintBAmount: new Decimal(res.newSwapDestinationAmount.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
      swappedAmount: new Decimal(res.sourceAmountSwapped.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      outAmount: new Decimal(res.destinationAmountSwapped.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
      tradeFeeRate: res.tradeFee.toNumber() / 1000 + '%',
    },
  };
};

export const swapTokenBaseOutDemo = async () => {
  const { owner, tokenAccounts } = await initWallet();
  const poolInfo = await getPoolInfo({ connection, poolId: dwPoolId });

  const userVaultA = tokenAccounts.get(poolInfo.mintA.toBase58())?.publicKey;
  const userVaultB = tokenAccounts.get(poolInfo.mintB.toBase58())?.publicKey;
  if (!userVaultA)
    throw new Error(`user do not have ${poolInfo.mintA.toBase58()} token acc`);
  if (!userVaultB)
    throw new Error(`user do not have ${poolInfo.mintB.toBase58()} token acc`);

  const inputAmount = new BN(10000);

  // swap pool mintB for mintA
  const res = CurveCalculator.swap(
    inputAmount,
    poolInfo.mintBReserve,
    poolInfo.mintAReserve,
    poolInfo.config.tradeFeeRate
  );

  const { transaction, error } = await sendAndConfirm({
    connection,
    owner,
    instructions: [
      SwapBaseOut(
        DEV_CREATE_POOL_PROGRAM,
        owner.publicKey,
        getPdaPoolAuthority(DEV_CREATE_POOL_PROGRAM).publicKey,
        poolInfo.configId,
        dwPoolId,

        userVaultB,
        userVaultA,

        poolInfo.vaultB,
        poolInfo.vaultA,

        TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,

        poolInfo.mintB,
        poolInfo.mintA,

        poolInfo.observationId,

        inputAmount,
        res.destinationAmountSwapped
      ),
    ],
  });

  return {
    error,
    transaction: error
      ? printSimulate(owner.publicKey, transaction)
      : undefined,
    input: new Decimal(inputAmount.toString())
      .div(10 ** poolInfo.mintDecimalB)
      .toString(),
    poolReserve: {
      mintA: new Decimal(poolInfo.mintAReserve.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      mintB: new Decimal(poolInfo.mintBReserve.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
    },
    res: {
      newPoolMintAAmount: new Decimal(res.newSwapDestinationAmount.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      newPoolMintBAmount: new Decimal(res.newSwapSourceAmount.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
      swappedAmount: new Decimal(res.sourceAmountSwapped.toString())
        .div(10 ** poolInfo.mintDecimalB)
        .toFixed(poolInfo.mintDecimalB),
      outAmount: new Decimal(res.destinationAmountSwapped.toString())
        .div(10 ** poolInfo.mintDecimalA)
        .toFixed(poolInfo.mintDecimalA),
      tradeFeeRate: res.tradeFee.toNumber() / 1000 + '%',
    },
  };
};
