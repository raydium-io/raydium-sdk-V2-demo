import { PoolInfoLayout, SqrtPriceMath } from '@raydium-io/raydium-sdk-v2';
import Client from "@triton-one/yellowstone-grpc";
import base58 from "bs58";
import { grpcToken, grpcUrl } from "../config";

async function clmmPoolInfo() {
  const programId = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'

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
          filters: [{ datasize: `${PoolInfoLayout.span}` }],
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

async function callback(_data: any, programId: string) {
  const data = _data.account

  const formatData = PoolInfoLayout.decode(data.account.data)
  const pk = base58.encode(data.account.pubkey)

  console.log(pk, SqrtPriceMath.sqrtPriceX64ToPrice(formatData.sqrtPriceX64, formatData.mintDecimalsA, formatData.mintDecimalsB))
}

clmmPoolInfo()
