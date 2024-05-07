# RAYDIUM SDK V2 demo

## Getting Started

### Installation

`yarn install`

this will install the dependencies for running the demo script

### Prerequisites

Modify `src/common/connection.ts` to fit your configuration

- `<YOUR_WALLET_SECRET_KEY>`: replace to your own one
- `<YOUR_RPC_URL>`: replace to your prefer one

### Usage

- `yarn test` run all demo functions
- `yarn test test/<SCRIPT_NAME>.test.ts` run the specific demo test script. e.g. yarn test test/cpmm/create-pool.test.ts
- `yarn test test/<FOLDER_NAME>` run the specific feature all demo test script. e.g. yarn test test/cpmm/\*

### Skip test

if you want to skip some test function, modify test function `it(` -> `it.skip(` in test/xxx.test.ts file.
