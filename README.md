# Vitalik currency.sol bytecode verification research

This repo documents an attempt to reproduce the deployed bytecode for:

- Contract: `0xa2e3680acaf5d2298697bdc016cf75a929385463`
- Deployer: `0x1db3439a222c519ab44bb1144fc28167b4fa6ee6` (Vitalik Buterin)
- Deployment block: `530996`
- Deployment date: `2015-11-12`

## Result

We did not get an exact bytecode match with any archived `soljson` release or nightly build from Sep-Dec 2015.

What we found:

1. The on-chain creation bytecode starts with `6000603f53...`.
2. Archived `soljson` builds generate constructors starting with `60606040525b...`.
3. This mismatch is consistent across:
   - stable releases from `0.1.1` to `0.3.6`
   - nightlies from Sep-Dec 2015
   - optimization on and off

This strongly suggests the contract was compiled with a native C++ solc build from that era, not with archived `soljson` JavaScript binaries.

## Files

- `currency.sol`
  - source candidate from `ethereum/dapp-bin/standardized_contract_apis/currency.sol`
- `cwrap-compile.js`
  - compiles source against selected early soljson versions
- `nightly-compile.js`
  - compiles against Sep-Dec 2015 nightlies and checks for prefix matches

## Run

```bash
node cwrap-compile.js
node nightly-compile.js
```

## Notes for Etherscan manual review

- We can provide source parity evidence and function selector parity.
- Exact compiler reconstruction appears blocked by missing historical native C++ build artifacts.
- Manual verification path is likely required for this contract.
