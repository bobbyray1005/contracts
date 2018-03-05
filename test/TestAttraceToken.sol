pragma solidity ^0.4.18;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/AttraceToken.sol";

contract TestAttraceToken {

  function testInitialBalanceUsingDeployedContract() public {
    AttraceToken attr = AttraceToken(DeployedAddresses.AttraceToken());
    uint expected = 1000000000E18;
    Assert.equal(attr.balanceOf(tx.origin), expected, "Owner should have correct ATTR balance initially");
  }

}