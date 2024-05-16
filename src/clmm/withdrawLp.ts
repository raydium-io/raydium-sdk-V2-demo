import { PublicKey } from '@solana/web3.js'
import {
  ApiV3PoolInfoConcentratedItem,
  getPdaPersonalPositionAddress,
  PositionInfoLayout,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'

export const withdrawLp = async () => {
  const raydium = await initSdk()
  // RAY-USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht' })
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem

  const balanceMints = raydium.account.tokenAccountRawInfos.filter((acc) => acc.accountInfo.amount.eq(new BN(1)))
  const allPositionKey = balanceMints.map(
    (acc) => getPdaPersonalPositionAddress(new PublicKey(poolInfo.programId), acc.accountInfo.mint).publicKey
  )

  const accountInfo = await raydium.connection.getMultipleAccountsInfo(allPositionKey)
  const allPosition: ReturnType<typeof PositionInfoLayout.decode>[] = []
  accountInfo.forEach((positionRes) => {
    if (!positionRes) return
    const position = PositionInfoLayout.decode(positionRes.data)
    const poolId = position.poolId.toBase58()
    if (poolId !== poolInfo.id) return
    allPosition.push(position)
  })

  if (!allPosition.length) throw new Error('use do not have position')

  const position = allPosition[0]!

  const { execute } = await raydium.clmm.decreaseLiquidity({
    poolInfo,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
      closePosition: true,
    },
    liquidity: position.liquidity,
    amountMinA: new BN(0),
    amountMinB: new BN(0),
    txVersion,
  })

  const { txId } = await execute()
  console.log('clmm position closed:', { txId })
}

/** uncomment code below to execute */
// withdrawLp()
