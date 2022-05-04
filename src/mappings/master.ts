import {
    AddCall,
    Deposit,
    DevCall,
    EmergencyWithdraw,
    MassUpdatePoolsCall,
    MasterMilker as MasterMilkerContract,
    OwnershipTransferred,
    SetCall,
    UpdatePoolCall,
    Withdraw,
  } from '../types/MasterMilker/MasterMilker'
  import { Address, BigDecimal, BigInt, dataSource, ethereum, log } from '@graphprotocol/graph-ts'
  import {
    BIG_DECIMAL_1E12,
    BIG_DECIMAL_1E18,
    BIG_DECIMAL_ZERO,
    BIG_INT_ONE,
    BIG_INT_ONE_DAY_SECONDS,
    BIG_INT_ZERO,
    MASTER_MILKER_ADDRESS,
    MASTER_MILKER_START_BLOCK,
  } from '../constants'
  import { History, MasterMilker, Pool, PoolHistory, FarmUser } from '../types/schema'
  import { getMilkyPrice, getUSDRate } from './pricing'
  
  import { ERC20 as ERC20Contract } from '../types/MasterMilker/ERC20'
  import { Pair as PairContract } from '../types/MasterMilker/Pair'
  
  function getMasterMilker(block: ethereum.Block): MasterMilker {
    let masterMilker = MasterMilker.load(MASTER_MILKER_ADDRESS.toHex())
  
    if (masterMilker === null) {
      const contract = MasterMilkerContract.bind(MASTER_MILKER_ADDRESS)
      masterMilker = new MasterMilker(MASTER_MILKER_ADDRESS.toHex())
      masterMilker.bonusMultiplier = contract.BONUS_MULTIPLIER()
      masterMilker.bonusEndBlock = contract.bonusEndBlock()
      masterMilker.devaddr = contract.devaddr()
      masterMilker.owner = contract.owner()
      // poolInfo ...
      masterMilker.startBlock = contract.startBlock()
      masterMilker.milky = contract.milky()
      masterMilker.milkyPerBlock = contract.milkyPerBlock()
      masterMilker.totalAllocPoint = contract.totalAllocPoint()
      // userInfo ...
      masterMilker.poolCount = BIG_INT_ZERO
  
      masterMilker.slpBalance = BIG_DECIMAL_ZERO
      masterMilker.slpAge = BIG_DECIMAL_ZERO
      masterMilker.slpAgeRemoved = BIG_DECIMAL_ZERO
      masterMilker.slpDeposited = BIG_DECIMAL_ZERO
      masterMilker.slpWithdrawn = BIG_DECIMAL_ZERO
  
      masterMilker.updatedAt = block.timestamp
  
      masterMilker.save()
    }
  
    return masterMilker as MasterMilker
  }
  
  export function getPool(id: BigInt, block: ethereum.Block): Pool {
    let pool = Pool.load(id.toString())
  
    if (pool === null) {
      const masterMilker = getMasterMilker(block)
  
      const masterMilkerContract = MasterMilkerContract.bind(MASTER_MILKER_ADDRESS)
      const poolLength = masterMilkerContract.poolLength()
  
      if (id >= poolLength) {
        return null
      }
  
      // Create new pool.
      pool = new Pool(id.toString())
  
      // Set relation
      pool.owner = masterMilker.id
  
      const poolInfo = masterMilkerContract.poolInfo(masterMilker.poolCount)
  
      pool.pair = poolInfo.value0
      pool.allocPoint = poolInfo.value1
      pool.lastRewardBlock = poolInfo.value2
      pool.accMilkyPerShare = poolInfo.value3
  
      // Total supply of LP tokens
      pool.balance = BIG_INT_ZERO
      pool.userCount = BIG_INT_ZERO
  
      pool.slpBalance = BIG_DECIMAL_ZERO
      pool.slpAge = BIG_DECIMAL_ZERO
      pool.slpAgeRemoved = BIG_DECIMAL_ZERO
      pool.slpDeposited = BIG_DECIMAL_ZERO
      pool.slpWithdrawn = BIG_DECIMAL_ZERO
  
      pool.timestamp = block.timestamp
      pool.block = block.number
  
      pool.updatedAt = block.timestamp
      pool.entryUSD = BIG_DECIMAL_ZERO
      pool.exitUSD = BIG_DECIMAL_ZERO
      pool.milkyHarvested = BIG_DECIMAL_ZERO
      pool.milkyHarvestedUSD = BIG_DECIMAL_ZERO
      pool.save()
    }
  
    return pool as Pool
  }
  
  function getHistory(owner: string, block: ethereum.Block): History {
    const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
  
    const id = owner.concat(day.toString())
  
    let history = History.load(id)
  
    if (history === null) {
      history = new History(id)
      history.owner = owner
      history.slpBalance = BIG_DECIMAL_ZERO
      history.slpAge = BIG_DECIMAL_ZERO
      history.slpAgeRemoved = BIG_DECIMAL_ZERO
      history.slpDeposited = BIG_DECIMAL_ZERO
      history.slpWithdrawn = BIG_DECIMAL_ZERO
      history.timestamp = block.timestamp
      history.block = block.number
    }
  
    return history as History
  }
  
  function getPoolHistory(pool: Pool, block: ethereum.Block): PoolHistory {
    const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)
  
    const id = pool.id.concat(day.toString())
  
    let history = PoolHistory.load(id)
  
    if (history === null) {
      history = new PoolHistory(id)
      history.pool = pool.id
      history.slpBalance = BIG_DECIMAL_ZERO
      history.slpAge = BIG_DECIMAL_ZERO
      history.slpAgeRemoved = BIG_DECIMAL_ZERO
      history.slpDeposited = BIG_DECIMAL_ZERO
      history.slpWithdrawn = BIG_DECIMAL_ZERO
      history.timestamp = block.timestamp
      history.block = block.number
      history.entryUSD = BIG_DECIMAL_ZERO
      history.exitUSD = BIG_DECIMAL_ZERO
      history.milkyHarvested = BIG_DECIMAL_ZERO
      history.milkyHarvestedUSD = BIG_DECIMAL_ZERO
    }
  
    return history as PoolHistory
  }
  
  export function getUser(pid: BigInt, address: Address, block: ethereum.Block): FarmUser {
    const uid = address.toHex()
    const id = pid.toString().concat('-').concat(uid)
  
    let user = FarmUser.load(id)
  
    if (user === null) {
      user = new FarmUser(id)
      user.pool = null
      user.address = address
      user.amount = BIG_INT_ZERO
      user.rewardDebt = BIG_INT_ZERO
      user.milkyHarvested = BIG_DECIMAL_ZERO
      user.milkyHarvestedUSD = BIG_DECIMAL_ZERO
      user.entryUSD = BIG_DECIMAL_ZERO
      user.exitUSD = BIG_DECIMAL_ZERO
      user.timestamp = block.timestamp
      user.block = block.number
      user.save()
    }
  
    return user as FarmUser
  }
  
  export function add(event: AddCall): void {
    const masterMilker = getMasterMilker(event.block)
  
    log.info('Add pool #{}', [masterMilker.poolCount.toString()])
  
    const pool = getPool(masterMilker.poolCount, event.block)
  
    if (pool === null) {
      log.error('Pool added with id greater than poolLength, pool #{}', [masterMilker.poolCount.toString()])
      return
    }
  
    // Update MasterMilker.
    masterMilker.totalAllocPoint = masterMilker.totalAllocPoint.plus(pool.allocPoint)
    masterMilker.poolCount = masterMilker.poolCount.plus(BIG_INT_ONE)
    masterMilker.save()
  }
  
  // Calls
  export function set(call: SetCall): void {
    // log.info('Set pool id: {} allocPoint: {}', [
    //   call.inputs._pid.toString(),
    //   call.inputs._allocPoint.toString(),
    // ])
  
    const pool = getPool(call.inputs._pid, call.block)
  
    const masterMilker = getMasterMilker(call.block)
  
    // Update mastermilker
    masterMilker.totalAllocPoint = masterMilker.totalAllocPoint.plus(call.inputs._allocPoint.minus(pool.allocPoint))
    masterMilker.save()
  
    // // Update pool
    // pool.allocPoint = call.inputs._allocPoint
    // pool.save()
  }
  
  // export function massUpdatePools(call: MassUpdatePoolsCall): void {
  //   log.info('Mass update pools', [])
  // }
  
  export function updatePool(call: UpdatePoolCall): void {
    // log.info('Update pool id {}', [call.inputs._pid.toString()])
  
    const masterMilker = MasterMilkerContract.bind(MASTER_MILKER_ADDRESS)
    const poolInfo = masterMilker.poolInfo(call.inputs._pid)
    const pool = getPool(call.inputs._pid, call.block)
    pool.lastRewardBlock = poolInfo.value2
    pool.accMilkyPerShare = poolInfo.value3
    pool.save()
  }
  
  export function dev(call: DevCall): void {
    log.info('Dev changed to {}', [call.inputs._devaddr.toHex()])
  
    const masterMilker = getMasterMilker(call.block)
  
    masterMilker.devaddr = call.inputs._devaddr
  
    masterMilker.save()
  }
  
  // Events
  export function deposit(event: Deposit): void {
    // if (event.params.amount == BIG_INT_ZERO) {
    //   log.info('Deposit zero transaction, input {} hash {}', [
    //     event.transaction.input.toHex(),
    //     event.transaction.hash.toHex(),
    //   ])
    // }
  
    const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)
  
    /*log.info('{} has deposited {} slp tokens to pool #{}', [
      event.params.user.toHex(),
      event.params.amount.toString(),
      event.params.pid.toString(),
    ])*/
  
    const masterMilkerContract = MasterMilkerContract.bind(MASTER_MILKER_ADDRESS)
  
    const poolInfo = masterMilkerContract.poolInfo(event.params.pid)
  
    const pool = getPool(event.params.pid, event.block)
  
    const poolHistory = getPoolHistory(pool, event.block)
  
    const pairContract = PairContract.bind(poolInfo.value0)
    pool.balance = pairContract.balanceOf(MASTER_MILKER_ADDRESS)
  
    pool.lastRewardBlock = poolInfo.value2
    pool.accMilkyPerShare = poolInfo.value3
  
    const poolDays = event.block.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    pool.slpAge = pool.slpAge.plus(poolDays.times(pool.slpBalance))
  
    pool.slpDeposited = pool.slpDeposited.plus(amount)
    pool.slpBalance = pool.slpBalance.plus(amount)
  
    pool.updatedAt = event.block.timestamp
  
    const userInfo = masterMilkerContract.userInfo(event.params.pid, event.params.user)
  
    const user = getUser(event.params.pid, event.params.user, event.block)
  
    // If not currently in pool and depositing SLP
    if (!user.pool && event.params.amount.gt(BIG_INT_ZERO)) {
      user.pool = pool.id
      pool.userCount = pool.userCount.plus(BIG_INT_ONE)
    }
  
    // Calculate MILKY being paid out
    if (event.block.number.gt(MASTER_MILKER_START_BLOCK) && user.amount.gt(BIG_INT_ZERO)) {
      const pending = user.amount
        .toBigDecimal()
        .times(pool.accMilkyPerShare.toBigDecimal())
        .div(BIG_DECIMAL_1E12)
        .minus(user.rewardDebt.toBigDecimal())
        .div(BIG_DECIMAL_1E18)
      // log.info('Deposit: User amount is more than zero, we should harvest {} milky', [pending.toString()])
      if (pending.gt(BIG_DECIMAL_ZERO)) {
        // log.info('Harvesting {} MILKY', [pending.toString()])
        const milkyHarvestedUSD = pending.times(getMilkyPrice(event.block))
        user.milkyHarvested = user.milkyHarvested.plus(pending)
        user.milkyHarvestedUSD = user.milkyHarvestedUSD.plus(milkyHarvestedUSD)
        pool.milkyHarvested = pool.milkyHarvested.plus(pending)
        pool.milkyHarvestedUSD = pool.milkyHarvestedUSD.plus(milkyHarvestedUSD)
        poolHistory.milkyHarvested = pool.milkyHarvested
        poolHistory.milkyHarvestedUSD = pool.milkyHarvestedUSD
      }
    }
  
    user.amount = userInfo.value0
    user.rewardDebt = userInfo.value1
  
    if (event.params.amount.gt(BIG_INT_ZERO)) {
      const reservesResult = pairContract.try_getReserves()
      if (!reservesResult.reverted) {
        const totalSupply = pairContract.totalSupply()
  
        const share = amount.div(totalSupply.toBigDecimal())
  
        const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)
  
        const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)
  
        const token0PriceUSD = getUSDRate(pairContract.token0())
  
        const token1PriceUSD = getUSDRate(pairContract.token1())
  
        const token0USD = token0Amount.times(token0PriceUSD)
  
        const token1USD = token1Amount.times(token1PriceUSD)
  
        const entryUSD = token0USD.plus(token1USD)
  
        // log.info(
        //   'Token {} priceUSD: {} reserve: {} amount: {} / Token {} priceUSD: {} reserve: {} amount: {} - slp amount: {} total supply: {} share: {}',
        //   [
        //     token0.symbol(),
        //     token0PriceUSD.toString(),
        //     reservesResult.value.value0.toString(),
        //     token0Amount.toString(),
        //     token1.symbol(),
        //     token1PriceUSD.toString(),
        //     reservesResult.value.value1.toString(),
        //     token1Amount.toString(),
        //     amount.toString(),
        //     totalSupply.toString(),
        //     share.toString(),
        //   ]
        // )
  
        // log.info('User {} has deposited {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
        //   user.address.toHex(),
        //   amount.toString(),
        //   token0Amount.toString(),
        //   token0.symbol(),
        //   token0USD.toString(),
        //   token1Amount.toString(),
        //   token1.symbol(),
        //   token1USD.toString(),
        //   entryUSD.toString(),
        // ])
  
        user.entryUSD = user.entryUSD.plus(entryUSD)
  
        pool.entryUSD = pool.entryUSD.plus(entryUSD)
  
        poolHistory.entryUSD = pool.entryUSD
      }
    }
  
    user.save()
    pool.save()
  
    const masterMilker = getMasterMilker(event.block)
  
    const masterMilkerDays = event.block.timestamp.minus(masterMilker.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    masterMilker.slpAge = masterMilker.slpAge.plus(masterMilkerDays.times(masterMilker.slpBalance))
  
    masterMilker.slpDeposited = masterMilker.slpDeposited.plus(amount)
    masterMilker.slpBalance = masterMilker.slpBalance.plus(amount)
  
    masterMilker.updatedAt = event.block.timestamp
    masterMilker.save()
  
    const history = getHistory(MASTER_MILKER_ADDRESS.toHex(), event.block)
    history.slpAge = masterMilker.slpAge
    history.slpBalance = masterMilker.slpBalance
    history.slpDeposited = history.slpDeposited.plus(amount)
    history.save()
  
    poolHistory.slpAge = pool.slpAge
    poolHistory.slpBalance = pool.balance.divDecimal(BIG_DECIMAL_1E18)
    poolHistory.slpDeposited = poolHistory.slpDeposited.plus(amount)
    poolHistory.userCount = pool.userCount
    poolHistory.save()
  }
  
  export function withdraw(event: Withdraw): void {
    // if (event.params.amount == BIG_INT_ZERO && User.load(event.params.user.toHex()) !== null) {
    //   log.info('Withdrawal zero transaction, input {} hash {}', [
    //     event.transaction.input.toHex(),
    //     event.transaction.hash.toHex(),
    //   ])
    // }
  
    const amount = event.params.amount.divDecimal(BIG_DECIMAL_1E18)
  
    // log.info('{} has withdrawn {} slp tokens from pool #{}', [
    //   event.params.user.toHex(),
    //   amount.toString(),
    //   event.params.pid.toString(),
    // ])
  
    if (event.block.number == BigInt.fromI32(14098817) && event.params.pid == BigInt.fromI32(344)) {
      return
    }
  
    const masterMilkerContract = MasterMilkerContract.bind(MASTER_MILKER_ADDRESS)
  
    const poolInfo = masterMilkerContract.poolInfo(event.params.pid)
  
    const pool = getPool(event.params.pid, event.block)
  
    const poolHistory = getPoolHistory(pool, event.block)
  
    const pairContract = PairContract.bind(poolInfo.value0)
    pool.balance = pairContract.balanceOf(MASTER_MILKER_ADDRESS)
    pool.lastRewardBlock = poolInfo.value2
    pool.accMilkyPerShare = poolInfo.value3
  
    const poolDays = event.block.timestamp.minus(pool.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    const poolAge = pool.slpAge.plus(poolDays.times(pool.slpBalance))
    const poolAgeRemoved = poolAge.div(pool.slpBalance).times(amount)
    pool.slpAge = poolAge.minus(poolAgeRemoved)
    pool.slpAgeRemoved = pool.slpAgeRemoved.plus(poolAgeRemoved)
    pool.slpWithdrawn = pool.slpWithdrawn.plus(amount)
    pool.slpBalance = pool.slpBalance.minus(amount)
    pool.updatedAt = event.block.timestamp
  
    const user = getUser(event.params.pid, event.params.user, event.block)
  
    if (event.block.number.gt(MASTER_MILKER_START_BLOCK) && user.amount.gt(BIG_INT_ZERO)) {
      const pending = user.amount
        .toBigDecimal()
        .times(pool.accMilkyPerShare.toBigDecimal())
        .div(BIG_DECIMAL_1E12)
        .minus(user.rewardDebt.toBigDecimal())
        .div(BIG_DECIMAL_1E18)
      // log.info('Withdraw: User amount is more than zero, we should harvest {} milky - block: {}', [
      //   pending.toString(),
      //   event.block.number.toString(),
      // ])
      // log.info('MILKY PRICE {}', [getMilkyPrice(event.block).toString()])
      if (pending.gt(BIG_DECIMAL_ZERO)) {
        // log.info('Harvesting {} MILKY (CURRENT MILKY PRICE {})', [
        //   pending.toString(),
        //   getMilkyPrice(event.block).toString(),
        // ])
        const milkyHarvestedUSD = pending.times(getMilkyPrice(event.block))
        user.milkyHarvested = user.milkyHarvested.plus(pending)
        user.milkyHarvestedUSD = user.milkyHarvestedUSD.plus(milkyHarvestedUSD)
        pool.milkyHarvested = pool.milkyHarvested.plus(pending)
        pool.milkyHarvestedUSD = pool.milkyHarvestedUSD.plus(milkyHarvestedUSD)
        poolHistory.milkyHarvested = pool.milkyHarvested
        poolHistory.milkyHarvestedUSD = pool.milkyHarvestedUSD
      }
    }
  
    const userInfo = masterMilkerContract.userInfo(event.params.pid, event.params.user)
  
    user.amount = userInfo.value0
    user.rewardDebt = userInfo.value1
  
    if (event.params.amount.gt(BIG_INT_ZERO)) {
      const reservesResult = pairContract.try_getReserves()
  
      if (!reservesResult.reverted) {
        const totalSupply = pairContract.totalSupply()
  
        const share = amount.div(totalSupply.toBigDecimal())
  
        const token0Amount = reservesResult.value.value0.toBigDecimal().times(share)
  
        const token1Amount = reservesResult.value.value1.toBigDecimal().times(share)
  
        const token0PriceUSD = getUSDRate(pairContract.token0())
  
        const token1PriceUSD = getUSDRate(pairContract.token1())
  
        const token0USD = token0Amount.times(token0PriceUSD)
  
        const token1USD = token1Amount.times(token1PriceUSD)
  
        const exitUSD = token0USD.plus(token1USD)
  
        pool.exitUSD = pool.exitUSD.plus(exitUSD)
  
        poolHistory.exitUSD = pool.exitUSD
  
        // log.info('User {} has withdrwn {} SLP tokens {} {} (${}) and {} {} (${}) at a combined value of ${}', [
        //   user.address.toHex(),
        //   amount.toString(),
        //   token0Amount.toString(),
        //   token0USD.toString(),
        //   pairContract.token0().toHex(),
        //   token1Amount.toString(),
        //   token1USD.toString(),
        //   pairContract.token1().toHex(),
        //   exitUSD.toString(),
        // ])
  
        user.exitUSD = user.exitUSD.plus(exitUSD)
      } else {
        log.info("Withdraw couldn't get reserves for pair {}", [poolInfo.value0.toHex()])
      }
    }
  
    // If SLP amount equals zero, remove from pool and reduce userCount
    if (user.amount.equals(BIG_INT_ZERO)) {
      user.pool = null
      pool.userCount = pool.userCount.minus(BIG_INT_ONE)
    }
  
    user.save()
    pool.save()
  
    const masterMilker = getMasterMilker(event.block)
  
    const days = event.block.timestamp.minus(masterMilker.updatedAt).divDecimal(BigDecimal.fromString('86400'))
    const slpAge = masterMilker.slpAge.plus(days.times(masterMilker.slpBalance))
    const slpAgeRemoved = slpAge.div(masterMilker.slpBalance).times(amount)
    masterMilker.slpAge = slpAge.minus(slpAgeRemoved)
    masterMilker.slpAgeRemoved = masterMilker.slpAgeRemoved.plus(slpAgeRemoved)
  
    masterMilker.slpWithdrawn = masterMilker.slpWithdrawn.plus(amount)
    masterMilker.slpBalance = masterMilker.slpBalance.minus(amount)
    masterMilker.updatedAt = event.block.timestamp
    masterMilker.save()
  
    const history = getHistory(MASTER_MILKER_ADDRESS.toHex(), event.block)
    history.slpAge = masterMilker.slpAge
    history.slpAgeRemoved = history.slpAgeRemoved.plus(slpAgeRemoved)
    history.slpBalance = masterMilker.slpBalance
    history.slpWithdrawn = history.slpWithdrawn.plus(amount)
    history.save()
  
    poolHistory.slpAge = pool.slpAge
    poolHistory.slpAgeRemoved = poolHistory.slpAgeRemoved.plus(slpAgeRemoved)
    poolHistory.slpBalance = pool.balance.divDecimal(BIG_DECIMAL_1E18)
    poolHistory.slpWithdrawn = poolHistory.slpWithdrawn.plus(amount)
    poolHistory.userCount = pool.userCount
    poolHistory.save()
  }
  
  export function emergencyWithdraw(event: EmergencyWithdraw): void {
    log.info('User {} emergancy withdrawal of {} from pool #{}', [
      event.params.user.toHex(),
      event.params.amount.toString(),
      event.params.pid.toString(),
    ])
  
    const pool = getPool(event.params.pid, event.block)
  
    const pairContract = PairContract.bind(pool.pair as Address)
    pool.balance = pairContract.balanceOf(MASTER_MILKER_ADDRESS)
    pool.save()
  
    // Update user
    const user = getUser(event.params.pid, event.params.user, event.block)
    user.amount = BIG_INT_ZERO
    user.rewardDebt = BIG_INT_ZERO
  
    user.save()
  }
  
  export function ownershipTransferred(event: OwnershipTransferred): void {
    log.info('Ownership transfered from previous owner: {} to new owner: {}', [
      event.params.previousOwner.toHex(),
      event.params.newOwner.toHex(),
    ])
  }