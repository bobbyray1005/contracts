pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';

// AttraceToken
contract AttraceToken is PausableToken {
    string public constant name = "Attrace";
    string public constant symbol = "ATTR";
    uint32 public constant decimals = 18;

    uint256 private initialSupply = 1000000000E18;

    // Token trading can start after ICO has ended
    bool public transfersEnabled = false;
    
    // Attrace can allow partical addresses (our crowdsale contract) to transfer tokens despite the lock up period.
    mapping (address => bool) public transferWhitelist;

    function AttraceToken() public {
      balances[msg.sender] = initialSupply; 
      totalSupply_ = initialSupply;
    }
    
    function transfer(address _to, uint256 _value) canTransfer(msg.sender) public returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) canTransfer(_from) public returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    modifier canTransfer(address _sender) {
      if (!transfersEnabled) {
          if (!transferWhitelist[_sender]) {
              revert();
          }
      }
      _;
    }

    modifier whenTransfersDisabled() {
      if (transfersEnabled) {
          revert();
      }
      _;
    }

    function setTransferWhitelistAddress(address addr, bool state) onlyOwner whenTransfersDisabled public {
      transferWhitelist[addr] = state;
    }
  
    // Attrace can enable token trading once
    function setTransfersEnabled() public onlyOwner {
      transfersEnabled = true;
    }

    /** Accessor functions for testing -- can be removed at deploy time **/
    function getAddressTransferWhitelistStatus(address addr) public view returns (bool) {
      return transferWhitelist[addr];
    }
}
