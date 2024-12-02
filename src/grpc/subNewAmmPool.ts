import { ApiPoolInfoV4, Market, MARKET_STATE_LAYOUT_V3, SPL_MINT_LAYOUT } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from '@solana/web3.js';
import Client from "@triton-one/yellowstone-grpc";
import base58 from "bs58";
import { connection, grpcToken, grpcUrl } from "../config";

async function subNewAmmPool() {
  const programId = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
  const createPoolFeeAccount = '7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5' // only mainnet, dev pls use 3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR

  const client = new Client(grpcUrl, grpcToken, undefined);
  const rpcConnInfo = await client.subscribe();

  rpcConnInfo.on("data", (data) => {
    callback(data, programId)
  });

  await new Promise<void>((resolve, reject) => {
    if (rpcConnInfo === undefined) throw Error('rpc conn error')
    rpcConnInfo.write({
      slots: {},
      accounts: {},
      transactions: {
        transactionsSubKey: {
          accountInclude: [createPoolFeeAccount],
          accountExclude: [],
          accountRequired: []
        }
      },
      transactionsStatus: {},
      blocks: {},
      blocksMeta: {},
      accountsDataSlice: [],
      entry: {},
      commitment: 1
    }, (err: Error) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error(reason);
    throw reason;
  });
}

async function callback(data: any, programId: string) {
  if (!data.filters.includes('transactionsSubKey')) return undefined

  const info = data.transaction
  if (info.transaction.meta.err !== undefined) return undefined

  const formatData: {
    updateTime: number, slot: number, txid: string, poolInfos: ApiPoolInfoV4[]
  } = {
    updateTime: new Date().getTime(),
    slot: info.slot,
    txid: base58.encode(info.transaction.signature),
    poolInfos: []
  }

  const accounts = info.transaction.transaction.message.accountKeys.map((i: Buffer) => base58.encode(i))
  for (const item of [...info.transaction.transaction.message.instructions, ...info.transaction.meta.innerInstructions.map((i: any) => i.instructions).flat()]) {
    if (accounts[item.programIdIndex] !== programId) continue

    if ([...(item.data as Buffer).values()][0] != 1) continue

    const keyIndex = [...(item.accounts as Buffer).values()]

    const startTime = new Date().getTime()
    console.log(new Date().toJSON(), 'new pool Id: ', accounts[keyIndex[4]]);

    const [baseMintAccount, quoteMintAccount, marketAccount] = await connection.getMultipleAccountsInfo([
      new PublicKey(accounts[keyIndex[8]]),
      new PublicKey(accounts[keyIndex[9]]),
      new PublicKey(accounts[keyIndex[16]]),
    ])

    if (baseMintAccount === null || quoteMintAccount === null || marketAccount === null) throw Error('get account info error')

    const baseMintInfo = SPL_MINT_LAYOUT.decode(baseMintAccount.data)
    const quoteMintInfo = SPL_MINT_LAYOUT.decode(quoteMintAccount.data)
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)

    formatData.poolInfos.push({
      id: accounts[keyIndex[4]],
      baseMint: accounts[keyIndex[8]],
      quoteMint: accounts[keyIndex[9]],
      lpMint: accounts[keyIndex[7]],
      baseDecimals: baseMintInfo.decimals,
      quoteDecimals: quoteMintInfo.decimals,
      lpDecimals: baseMintInfo.decimals,
      version: 4,
      programId: programId,
      authority: accounts[keyIndex[5]],
      openOrders: accounts[keyIndex[6]],
      targetOrders: accounts[keyIndex[12]],
      baseVault: accounts[keyIndex[10]],
      quoteVault: accounts[keyIndex[11]],
      withdrawQueue: PublicKey.default.toString(),
      lpVault: PublicKey.default.toString(),
      marketVersion: 3,
      marketProgramId: marketAccount.owner.toString(),
      marketId: accounts[keyIndex[16]],
      marketAuthority: Market.getAssociatedAuthority({ programId: marketAccount.owner, marketId: new PublicKey(accounts[keyIndex[16]]) }).publicKey.toString(),
      marketBaseVault: marketInfo.baseVault.toString(),
      marketQuoteVault: marketInfo.quoteVault.toString(),
      marketBids: marketInfo.bids.toString(),
      marketAsks: marketInfo.asks.toString(),
      marketEventQueue: marketInfo.eventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString()
    })
  }

  console.log(formatData)

  return formatData
}

subNewAmmPool()
