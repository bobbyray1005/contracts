const AttraceToken = artifacts.require("AttraceToken")
const totalSupply = 1000000000000000000000000000

contract('Test Attrace ERC20 token', async (accounts) => {
  it("It should seed the initial supply to the AttraceProject", async () => {
     const instance = await AttraceToken.deployed()
     const balance = await instance.balanceOf.call(accounts[0])
     assert.equal(balance.valueOf(), totalSupply)
  })

  it("A new instance should hold the right initial values", async () => {
    const instance = await AttraceToken.new()
    const balance = await instance.balanceOf.call(accounts[0])
    assert.equal(balance.valueOf(), totalSupply)
    const name = await instance.name.call()
    assert.equal(name, 'Attrace')
    const symbol = await instance.symbol.call()
    assert.equal(symbol, 'ATTR')
    const decimals = await instance.decimals.call()
    assert.equal(decimals.valueOf(), 18)
    const transfersEnabled = await instance.transfersEnabled.call()
    assert.equal(transfersEnabled, false)
  })

  it("AttraceProject should be able to whitelist himself and others", async () => {
    const instance = await AttraceToken.new()
    await instance.setTransferWhitelistAddress(accounts[0], true)
    let status = await instance.getAddressTransferWhitelistStatus(accounts[0])
    assert.equal(status, true)
    await instance.setTransferWhitelistAddress(accounts[1], true)
    status = await instance.getAddressTransferWhitelistStatus(accounts[1])
    assert.equal(status, true)
  })

  it("Others should not be able to whitelist AttraceProject", async () => {
    const instance = await AttraceToken.new()
    try {
      await instance.setTransferWhitelistAddress(accounts[0], true, { from: accounts[1] })
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("Others should not be able to whitelist self", async () => {
    const instance = await AttraceToken.new()
    try {
      await instance.setTransferWhitelistAddress(accounts[1], true, { from: accounts[1] })
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("Others should not be able to whitelist others", async () => {
    const instance = await AttraceToken.new()
    try {
      await instance.setTransferWhitelistAddress(accounts[2], true, { from: accounts[1] })
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("Unless whitelisted, even AttraceProject can't transfer tokens", async () => {
    const instance = await AttraceToken.new()
    try {
      await instance.transfer(accounts[1], 1000)
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("When whitelisted, AttraceProject can transfer tokens", async () => {
    const instance = await AttraceToken.new()
    await instance.setTransferWhitelistAddress(accounts[0], true)
    await instance.transfer(accounts[1], 1000)
    let balance = await instance.balanceOf(accounts[1])
    assert.equal(balance, 1000)
  })

  it("Unless whitelisted or transfer lock removed, others can't transfer tokens", async () => {
    const instance = await AttraceToken.new()
    await instance.setTransferWhitelistAddress(accounts[0], true)
    await instance.transfer(accounts[1], 1000)
    try {
      await instance.transferFrom(accounts[1], accounts[2], 1000)
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("AttraceProject can enable transfer of tokens", async () => {
    const instance = await AttraceToken.new()
    let status  = await instance.transfersEnabled.call()
    assert.equal(status, false)
    await instance.setTransfersEnabled()
    status  = await instance.transfersEnabled.call()
    assert.equal(status, true)
    let incubationTime = await instance.incubationTime.call()
    assert.isAbove(incubationTime.toNumber(), Date.now()/1000 - 10)
    assert.isBelow(incubationTime.toNumber(), Date.now()/1000 + 10)
  })

  it("After enabling transfers, anybody can transfer their tokens", async () => {
    const instance = await AttraceToken.new()
    await instance.setTransfersEnabled()
    await instance.transfer(accounts[1], 20000)
    let balance = await instance.balanceOf(accounts[1])
    assert.equal(balance, 20000)
    await instance.transfer(accounts[2], 10000, { from: accounts[1] })
    let balance1 = await instance.balanceOf(accounts[1]) 
    assert.equal(balance1, 10000)
    let balance2 = await instance.balanceOf(accounts[2])
    assert.equal(balance2, 10000)
  })

  it("Transferring tokens should cost a sane amount of GAS (currently < 60000)", async () => {
    const instance = await AttraceToken.new()
    await instance.setTransfersEnabled()
    const tx = await instance.transfer(accounts[1], 20000)
    // console.log('HASH', hash)
    assert.isAbove(tx.receipt.gasUsed, 20000)
    assert.isBelow(tx.receipt.gasUsed, 60000)
  })

  it("AttraceProject should be able to set vesting plans before ICO and plans should be saved", async () => {
    const instance = await AttraceToken.new()
    const tx = await instance.setAddressVestingPlan(accounts[1], 1000000000*0.22*0.25)
    const amount = await instance.getAddressVestingPlanLockedAmountRemaining(accounts[1])
    assert.equal(amount.toNumber(), 55000000)
    const total = await instance.getAddressVestingPlanTotalAmountLocked(accounts[1])
    assert.equal(total.toNumber(), 55000000)
    const stage = await instance.getAddressVestingPlanStage(accounts[1])
    assert.equal(stage.toNumber(), 4)
  })

  it("Others can never set vesting plans", async () => {
    const instance = await AttraceToken.new()
    try {
      await instance.setAddressVestingPlan(accounts[1], 1000000000*0.22*0.25, { from: accounts[1] })
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  it("Nobody should not be able to set or change vesting plans after ICO", async () => {
    const instance = await AttraceToken.new()
    const tx = await instance.setAddressVestingPlan(accounts[1], 1000000000*0.22*0.25)
    await instance.setTransfersEnabled() // ICO
    // Validate attrace
    try {
      await instance.setAddressVestingPlan(accounts[2], 10000)
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
    // Validate others
    try {
      await instance.setAddressVestingPlan(accounts[2], 10000, { from: accounts[2] })
      await instance.setAddressVestingPlan(accounts[2], 10000, { from: accounts[1] })
      assert.fail("unreachable")
    } catch (e) {
      expect(e.message).to.have.string('revert')
    }
  })

  // web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [12345], id: 0})
  // { id: 0, jsonrpc: '2.0', result: 12345 }
  // > web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
  // > web3.eth.getBlock(web3.eth.blockNumber).timestamp
  // it("Vested tokens should not release in the first 6 months")

})