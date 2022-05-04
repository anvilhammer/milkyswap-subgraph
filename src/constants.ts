import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const NULL_CALL_RESULT_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000001'

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')

export const BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')

export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')

export const BIG_DECIMAL_ONE = BigDecimal.fromString('1')

export const BIG_INT_ONE = BigInt.fromI32(1)

export const BIG_INT_TWO = BigInt.fromI32(2)

export const BIG_INT_ONE_HUNDRED = BigInt.fromI32(100)

export const BIG_INT_ONE_DAY_SECONDS = BigInt.fromI32(86400)

export const BIG_INT_ZERO = BigInt.fromI32(0)

export const LOCKUP_POOL_NUMBER = BigInt.fromI32(29)

export const LOCKUP_BLOCK_NUMBER = BigInt.fromI32(10959148)

export const UNISWAP_SUSHI_ETH_PAIR_FIRST_LIQUDITY_BLOCK = BigInt.fromI32(10750005)

export const ACC_MILKY_PRECISION = BigInt.fromString('1000000000000')

export const MASTER_MILKER_ADDRESS = Address.fromString('0xE1E1b4582760FcA9664d725412165c7cf04F5F44')

export const MASTER_MILKER_START_BLOCK = BigInt.fromI32(1944214)

export const FACTORY_ADDRESS = Address.fromString("0xD6Ab33Ad975b39A8cc981bBc4Aaf61F957A5aD29")

export const MILKYSWAP_WADA_USDC_PAIR_ADDRESS = Address.fromString("0x0B46AD9e9B749c9D500C81a4975B1599a872Ebe8")

export const MILKY_ADDRESS = Address.fromString("0x063A5E4cD5e15ac66ea47134Eb60e6b30A51B2bf")

export const USDC_ADDRESS = Address.fromString("0xAE83571000aF4499798d1e3b0fA0070EB3A3E3F9")

export const MILKY_USDC_PAIR_ADDRESS = Address.fromString("0xBc1741079541100f8F6200F15665039Ee633dB3D")

export const WADA_ADDRESS = Address.fromString("0xAE83571000aF4499798d1e3b0fA0070EB3A3E3F9")

export const MILKY_USDC_LIQUIDITY_START = BigInt.fromI32(2027113)