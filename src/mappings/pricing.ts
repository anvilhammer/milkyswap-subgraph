import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  FACTORY_ADDRESS,
  MILKYSWAP_WADA_USDC_PAIR_ADDRESS,
  MILKY_USDC_PAIR_ADDRESS,
  MILKY_USDC_LIQUIDITY_START,
  USDC_ADDRESS,
  WADA_ADDRESS,
} from '../constants'
import { Address, BigDecimal, BigInt, ethereum, log } from '@graphprotocol/graph-ts'

import { Factory as FactoryContract } from '../types/templates/Pair/Factory'
import { Pair as PairContract } from '../types/templates/Pair/Pair'
import { Pair, Token, Bundle } from '../types/schema'

export function getUSDRate(token: Address): BigDecimal {
  const usdc = BIG_DECIMAL_ONE

  if (token != USDC_ADDRESS) {
    const tokenPriceWADA = getWadaRate(token)

    const wadaPriceUSD = getWadaPrice()

    return wadaPriceUSD.times(tokenPriceWADA)
  }

  return usdc
}

export function getWadaRate(token: Address): BigDecimal {
  let wada: BigDecimal = BIG_DECIMAL_ONE

  if (token != WADA_ADDRESS) {
    const factory = FactoryContract.bind(FACTORY_ADDRESS)

    const address = factory.try_getPair(token, WADA_ADDRESS)

    if (address.reverted) {
      log.info('No WADA pair found for token at {}', [token.toHexString()])
      return BIG_DECIMAL_ZERO
    }

    if (address.value == ADDRESS_ZERO) {
      log.info('Adress ZERO...', [])
      return BIG_DECIMAL_ZERO
    }

    const pair = PairContract.bind(address.value)
    const reserves = pair.getReserves()

    wada =
      pair.token0() == WADA_ADDRESS
        ? reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value1.toBigDecimal())
        : reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value0.toBigDecimal())

    return wada.div(BIG_DECIMAL_1E18)
  }

  return wada
}

export function getMilkyPrice(block: ethereum.Block): BigDecimal {
  if (block.number.lt(MILKY_USDC_LIQUIDITY_START)) {
    return BIG_DECIMAL_ZERO
  } else {
    const pair = Pair.load(MILKY_USDC_PAIR_ADDRESS.toHexString())
    return pair.reserve1
      .times(BIG_DECIMAL_1E18)
      .div(pair.reserve0)
      .div(BIG_DECIMAL_1E6)
  }
}

export function getWadaPrice(): BigDecimal {
  const address = MILKYSWAP_WADA_USDC_PAIR_ADDRESS

  const pair = PairContract.bind(address)

  const reserves = pair.getReserves()

  const reserve0 = reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18)

  const reserve1 = reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18)

  const price = reserve1.div(reserve0).div(BIG_DECIMAL_1E6).times(BIG_DECIMAL_1E18)
  // log.debug('price', [`${price}`])
  return price
}

export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedWADA.times(bundle.wadaPrice)
  let price1 = token1.derivedWADA.times(bundle.wadaPrice)

  return tokenAmount0
    .times(price0)
    .plus(tokenAmount1.times(price1))
    .div(BigDecimal.fromString('2'))
}

export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedWADA.times(bundle.wadaPrice)
  let price1 = token1.derivedWADA.times(bundle.wadaPrice)

  return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
}