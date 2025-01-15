import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID, TickUtils, Raydium } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import cron from 'node-cron'
import Decimal from 'decimal.js'

let raydium: Raydium | undefined
const poolId = process.argv[2]
const createDeviation = !isNaN(Number(process.argv[3])) ? Number(process.argv[3]) : 10
const closeDeviation = !isNaN(Number(process.argv[4])) ? Number(process.argv[4]) : 5

async function checkPosition() {
  if (!poolId) {
    console.log('please provide pool id')
    return
  }

  if (!raydium) raydium = await initSdk()

  const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
  if (data.poolInfo) {
    console.log('running time:', Date.now())
    console.log(`\nConcentrated pool: ${poolId}`)
    console.log(`\nclose deviation setting: ${closeDeviation}%, create deviation setting: ${createDeviation}%`)
    const currentPrice = new Decimal(data.poolInfo.price)
    const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID })
    const poolPositions = allPosition.filter((p) => p.poolId.toBase58() === poolId)

    poolPositions.forEach(async (position, idx) => {
      const priceLower = TickUtils.getTickPrice({
        poolInfo: data.poolInfo,
        tick: position.tickLower,
        baseIn: true,
      }).price
      const priceUpper = TickUtils.getTickPrice({
        poolInfo: data.poolInfo,
        tick: position.tickUpper,
        baseIn: true,
      }).price

      console.log(
        `\n===== position ${idx + 1} =====\n`,
        `current price: ${currentPrice}\n`,
        `priceLower: ${priceLower.toString()}\n`,
        `priceUpper: ${priceUpper.toString()}`
      )
      const currentPositionMid = priceLower.add(priceUpper).div(2)
      const [closeLow, closeUp] = [
        currentPrice.mul((100 - closeDeviation) / 100),
        currentPrice.mul((100 + closeDeviation) / 100),
      ]

      if (currentPositionMid < closeLow || currentPositionMid > closeUp) {
        console.log('\n⛔ close position triggered!')
        console.log(`closeLower:${closeLow}\ncurrentPosition:${currentPositionMid}\ncloseUpper: ${closeUp}`)

        /* close position here */
        // const { execute: executeClose } = await raydium!.clmm.decreaseLiquidity({
        //   poolInfo: data.poolInfo,
        //   poolKeys: data.poolKeys,
        //   ownerPosition: position,
        //   ownerInfo: {
        //     useSOLBalance: true,
        //     // if liquidity wants to decrease doesn't equal to position liquidity, set closePosition to false
        //     closePosition: true,
        //   },
        //   liquidity: position.liquidity,
        //   amountMinA: new BN(0),
        //   amountMinB: new BN(0),
        //   txVersion,
        //   // optional: set up priority fee here
        //   // computeBudgetConfig: {
        //   //   units: 600000,
        //   //   microLamports: 46591500,
        //   // },
        // })
        // await executeClose({ sendAndConfirm: true })

        const [recreateLower, recreateUpper] = [
          currentPrice.mul((100 - createDeviation) / 100),
          currentPrice.mul((100 + createDeviation) / 100),
        ]
        console.log('\n ✅ create new position')
        console.log(`priceLower:${recreateLower}\npriceUpper: ${recreateUpper}`)

        /* create position here */
        // const { tick: lowerTick } = TickUtils.getPriceAndTick({
        //   poolInfo: data.poolInfo,
        //   price: recreateLower,
        //   baseIn: true,
        // })
        // const { tick: upperTick } = TickUtils.getPriceAndTick({
        //   poolInfo: data.poolInfo,
        //   price: recreateUpper,
        //   baseIn: true,
        // })

        // const inputAmount = new BN(10000)
        // const epochInfo = await raydium!.fetchEpochInfo()
        // const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
        //   poolInfo: data.poolInfo,
        //   slippage: 0,
        //   inputA: true,
        //   tickUpper: Math.max(lowerTick, upperTick),
        //   tickLower: Math.min(lowerTick, upperTick),
        //   amount: inputAmount,
        //   add: true,
        //   amountHasFee: true,
        //   epochInfo,
        // })

        // const { execute: executeOpen } = await raydium!.clmm.openPositionFromBase({
        //   poolInfo: data.poolInfo,
        //   poolKeys: data.poolKeys,
        //   tickUpper: Math.max(lowerTick, upperTick),
        //   tickLower: Math.min(lowerTick, upperTick),
        //   base: 'MintA',
        //   ownerInfo: {
        //     useSOLBalance: true,
        //   },
        //   baseAmount: inputAmount,
        //   otherAmountMax: res.amountSlippageB.amount,
        //   txVersion,
        //   // optional: set up priority fee here
        //   //   computeBudgetConfig: {
        //   //     units: 600000,
        //   //     microLamports: 100000,
        //   //   },
        // })
        // await executeOpen({ sendAndConfirm: true })

        return
      }
      console.log('position in range, no action needed')
    })
  }
}

// run every minutes
const job = cron.schedule('*/1 * * * *', checkPosition, {
  scheduled: false,
})

if (poolId) {
  checkPosition()
  job.start()
} else {
  console.log('please provide pool id')
}
