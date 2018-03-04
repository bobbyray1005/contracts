var AttraceToken = artifacts.require("./AttraceToken.sol");

module.exports = function(deployer, network, accounts) {
  console.log(deployer)
  console.log(network)
  console.log(accounts)
  deployer.deploy(AttraceToken)
};
