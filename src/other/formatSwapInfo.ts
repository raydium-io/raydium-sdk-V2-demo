import { AMM_V4, CLMM_PROGRAM_ID, CREATE_CPMM_POOL_PROGRAM } from "@raydium-io/raydium-sdk-v2";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from '@solana/web3.js';
import { connection } from "../config";

function checkProgramId(id: PublicKey) {
  if (id.equals(AMM_V4)) return 'ammV4'
  if (id.equals(CLMM_PROGRAM_ID)) return 'clmm'
  if (id.equals(CREATE_CPMM_POOL_PROGRAM)) return 'cpmm'
  return undefined
}

export async function formatSwapInfo(txid: string) {
  const txinfo = await connection.getParsedTransaction(txid, { maxSupportedTransactionVersion: 0 })

  if (txinfo === null) throw Error('fetch tx info error')

  if (txinfo.meta?.err) throw Error('tx error')

  for (let indexIns = 0; indexIns < txinfo.transaction.message.instructions.length; indexIns++) {
    const itemIns = txinfo.transaction.message.instructions[indexIns]

    const innerIns = ((txinfo.meta?.innerInstructions ?? []).find(i => i.index === indexIns)?.instructions ?? []) as any[]

    const type = checkProgramId(itemIns.programId)

    if (type && innerIns.length >= 2 && innerIns[0].programId.equals(TOKEN_PROGRAM_ID) && innerIns[1].programId.equals(TOKEN_PROGRAM_ID)) {
      const transfer1 = innerIns[0]
      const transfer2 = innerIns[1]
      const transferSource1 = transfer1.parsed.info.source

      const transferAmount1 = transfer1.parsed.info.amount ?? transfer1.parsed.info.tokenAmount.amount
      const transferAmount2 = transfer2.parsed.info.amount ?? transfer2.parsed.info.tokenAmount.amount

      if (type === 'ammV4') {
        // @ts-ignore
        const swapType = itemIns.accounts[4].toString() === transferSource1 ? 'A to B' : 'B to A'

        console.log({
          type,
          // @ts-ignore
          poolId: itemIns.accounts[1].toString(),

          inputAmount: swapType === 'A to B' ? transferAmount1 : transferAmount2,
          outputAmount: swapType === 'A to B' ? transferAmount1 : transferAmount2,
        })
      } else {
        console.log({
          type,
          // @ts-ignore
          poolId: itemIns.accounts[type === 'clmm' ? 2 : 3].toString(),

          inputAmount: transferAmount1,
          outputAmount: transferAmount2,
        })
      }
    }

    for (let innerIndexIns = 0; innerIndexIns < innerIns.length; innerIndexIns++) {
      const innerItemIns = innerIns[innerIndexIns]

      const lastInnerItemIns = innerIns.slice(innerIndexIns + 1)

      const innerType = checkProgramId(innerItemIns.programId)

      if (innerType && lastInnerItemIns.length >= 2 && lastInnerItemIns[0].programId.equals(TOKEN_PROGRAM_ID) && lastInnerItemIns[1].programId.equals(TOKEN_PROGRAM_ID)) {
        const transfer1 = lastInnerItemIns[0]
        const transfer2 = lastInnerItemIns[1]
        const transferSource1 = transfer1.parsed.info.source

        const transferAmount1 = transfer1.parsed.info.amount ?? transfer1.parsed.info.tokenAmount.amount
        const transferAmount2 = transfer2.parsed.info.amount ?? transfer2.parsed.info.tokenAmount.amount

        if (innerType === 'ammV4') {
          // @ts-ignore
          const swapType = innerItemIns.accounts[4].toString() === transferSource1 ? 'A to B' : 'B to A'

          console.log({
            type: innerType,
            // @ts-ignore
            poolId: innerItemIns.accounts[1].toString(),

            inputAmount: swapType === 'A to B' ? transferAmount1 : transferAmount2,
            outputAmount: swapType === 'A to B' ? transferAmount1 : transferAmount2,
          })
        } else {
          console.log({
            type: innerType,
            // @ts-ignore
            poolId: innerItemIns.accounts[innerType === 'clmm' ? 2 : 3].toString(),

            inputAmount: transferAmount1,
            outputAmount: transferAmount2,
          })
        }
      }
    }
  }
}
