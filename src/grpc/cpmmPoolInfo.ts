import { CpmmPoolInfoLayout, splAccountLayout } from "@raydium-io/raydium-sdk-v2";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Client from "@triton-one/yellowstone-grpc";
import base58 from "bs58";
import Decimal from "decimal.js";
import { grpcToken, grpcUrl } from "../config";

async function cpmmPoolInfo() {
  const programId = 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
  const auth = 'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL'

  const client = new Client(grpcUrl, grpcToken, undefined);
  const rpcConnInfo = await client.subscribe();

  rpcConnInfo.on("data", (data) => {
    callback(data, programId)
  });

  await new Promise<void>((resolve, reject) => {
    if (rpcConnInfo === undefined) throw Error('rpc conn error')
    rpcConnInfo.write({
      slots: {},
      accounts: {
        ammUpdate: {
          owner: [programId],
          account: [],
          filters: [{ datasize: `${CpmmPoolInfoLayout.span}` }],
          nonemptyTxnSignature: true,
        },
        vaultUpdate: {
          owner: [TOKEN_PROGRAM_ID.toString()],
          account: [],
          filters: [{ memcmp: { offset: `${splAccountLayout.offsetOf('owner')}`, base58: auth } }],
          nonemptyTxnSignature: true,
        },
        vault2022Update: {
          owner: [TOKEN_2022_PROGRAM_ID.toString()],
          account: [],
          filters: [{ memcmp: { offset: `${splAccountLayout.offsetOf('owner')}`, base58: auth } }],
          nonemptyTxnSignature: true,
        },
      },
      transactions: {},
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

const vaultToPoolId: { [key: string]: { poolId: string, type: 'base' | 'quote' } } = {}
const poolInfoCache: { [key: string]: { poolInfo: ReturnType<typeof CpmmPoolInfoLayout.decode>, vaultA: ReturnType<typeof splAccountLayout.decode> | undefined, vaultB: ReturnType<typeof splAccountLayout.decode> | undefined } } = {}

async function callback(_data: any, programId: string) {
  if (_data.filters.includes('ammUpdate')) {
    const data = _data.account

    const formatData = CpmmPoolInfoLayout.decode(data.account.data)
    const pk = base58.encode(data.account.pubkey)

    poolInfoCache[pk] = { poolInfo: formatData, vaultA: undefined, vaultB: undefined }
    vaultToPoolId[formatData.vaultA.toString()] = { poolId: pk, type: 'base' }
    vaultToPoolId[formatData.vaultB.toString()] = { poolId: pk, type: 'quote' }
  } else if (_data.filters.includes('vaultUpdate') || _data.filters.includes('vault2022Update')) {
    const data = _data.account

    const formatData = splAccountLayout.decode(data.account.data)
    const pk = base58.encode(data.account.pubkey)

    if (vaultToPoolId[pk] === undefined) return

    const _poolType = vaultToPoolId[pk]

    if (_poolType.type === 'base') {
      poolInfoCache[_poolType.poolId].vaultA = formatData
    } else {
      poolInfoCache[_poolType.poolId].vaultB = formatData
    }

    if (poolInfoCache[_poolType.poolId].vaultA === undefined || poolInfoCache[_poolType.poolId].vaultB === undefined) return

    const vaultA = new Decimal(poolInfoCache[_poolType.poolId].vaultA!.amount.sub(poolInfoCache[_poolType.poolId].poolInfo.fundFeesMintA).sub(poolInfoCache[_poolType.poolId].poolInfo.protocolFeesMintA).toString()).div(10 ** poolInfoCache[_poolType.poolId].poolInfo.mintDecimalA)
    const vaultB = new Decimal(poolInfoCache[_poolType.poolId].vaultB!.amount.sub(poolInfoCache[_poolType.poolId].poolInfo.fundFeesMintB).sub(poolInfoCache[_poolType.poolId].poolInfo.protocolFeesMintB).toString()).div(10 ** poolInfoCache[_poolType.poolId].poolInfo.mintDecimalB)
    console.log(_poolType.poolId, vaultA, vaultB, vaultB.div(vaultA))
  }
}

cpmmPoolInfo()
