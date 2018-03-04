pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import '../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol';

// AttraceToken
contract AttraceToken is StandardToken, Pausable {
    string public constant name = "Attrace";
    string public constant symbol = "ATTR";
    uint32 public constant decimals = 18;

    uint256 private initialSupply = 1000000000E18;

    // Token trading can start after ICO has ended
    bool    private released = false;             
    
    // Allowed addresses to transfer tokens regardless of the lock down period. Presale, crowdsale and Attrace project for initial token distribution.
    mapping (address => bool) public transferWhitelist;

    function AttraceToken() public {
      balances[msg.sender] = initialSupply; 
      totalSupply_ = initialSupply;
    }
    
    function transfer(address _to, uint256 _value) canTransfer(msg.sender) whenNotPaused public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from) whenNotPaused public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    modifier canTransfer(address _sender) {
      if (!released) {
          if (!transferWhitelist[_sender]) {
              revert();
          }
      }
      _;
    }

    // Owner can allow a particular address (a crowdsale contract) to transfer tokens despite the lock up period
    function setTransferWhitelist(address addr, bool state) onlyOwner whenNotReleased public {
      transferWhitelist[addr] = state;
    }

    modifier whenNotReleased() {
      if (released == true) {
          revert();
      }
      _;
    }
  
    // Owner can release the tokens after trading once
    function releaseTokenTransfer() public onlyOwner {
      released = true;
    }

    // // Attrace project will enable the token for trading after the ICO has ended
    // modifier isIncubated() {
    //   require(incubated == true);
    //   require(block.timestamp > incubationTime);
    //   _;
    // }

    // function incubate(uint256 _incubationTime) onlyOwner public {
    //   require(incubated == false);
    //   require(_incubationTime > block.timestamp);
    //   incubated = true;
    //   incubationTime = _incubationTime;
    // }
}
