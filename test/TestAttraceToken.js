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
    assert.isAbove(tx.receipt.gasUsed, 0)
    assert.isBelow(tx.receipt.gasUsed, 60000)
  })

})