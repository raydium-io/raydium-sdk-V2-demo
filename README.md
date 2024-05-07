# RAYDIUM SDK V1 demo

## About the project
This project is for [RAYDIUM SDK](https://github.com/raydium-io/raydium-sdk) demonstration

## Getting Started
### Installation

`yarn install`

this will install the dependencies for running the demo script

### Prerequisites
Modify `config.ts.template` to fit your configuration, and rename it to `config.ts`

- `<YOUR_WALLET_SECRET_KEY>`: replace to your own one
- `<YOUR_RPC_URL>`: replace to your prefer one

### Usage

- `yarn clean` clean up the old scripts (you don't need this for the very first time)
- `yarn build` build the scripts
- `yarn start js/src/<SCRIPT_NAME>` run the specific demo script
- `yarn ammv3-market 2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv 10 20` run ammv3 market maker, arguments 0: poolId, 1: create position deviation, 2: close position deviation, remember to replace rpc url and secret key in code and uncomment `closePositionTx` and `createPositionTx` code part

![image](https://github.com/raydium-io/raydium-sdk-V1-demo/assets/6680106/95ddb134-fd02-40eb-a868-3effcfdb2d5e)



you can simply combine the command to run a demo, e.g

`yarn clean && yarn build && yarn start js/src/stakeFarm.js`

