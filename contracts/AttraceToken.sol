pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/ERC20/PausableToken.sol';
import '../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol';

// AttraceToken
contract AttraceToken is PausableToken {
    string public constant name = "Attrace";
    string public constant symbol = "ATTR";
    uint32 public constant decimals = 18;

    uint256 private initialSupply = 1000000000E18;

    // Token trading can start after ICO has ended
    bool public transfersEnabled = false;
    
    // Attrace can allow partical addresses (our crowdsale contract) to transfer tokens despite the lock up period.
    mapping (address => bool) private transferWhitelist;

    // Block timestamp lock up is removed
    uint256 public incubationTime;

    // A VestingPlan defines a locked amount of Attrace, which will only unlock in stages after a certain period of time is passed.
    struct VestingPlan {
      uint64 totalAmountLocked;       // Total amount of ATTR that was locked initially
      uint64 lockedAmountRemaining;   // Total amount of ATTR that is still locked
      uint8  stage;                   // Stage at which the plan currently is at
    }

    // Tokens of founders & advisors are under vesting and can only be used in chunks after lockup times pass.
    mapping (address => VestingPlan) private vestingPlans;

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

    modifier amountIsLockfree(address _sender, uint256 amount) {
      if (transfersEnabled) {
        if (vestingPlans[_sender].lockedAmountRemaining >= 0) {
          if ((balances[_sender] - SafeMath.mul(vestingPlans[_sender].lockedAmountRemaining, 18)) <= 0) {
            revert();
          } 
        }
      }
      _;
    }

    modifier whenTransfersEnabled(bool _status) {
      if (transfersEnabled != _status) {
        revert();
      }
      _;
    }

    // Before incubation, AttraceProject can whitelist some addresses that can transfer coins (presale, crowdsale, initial distribution)
    function setTransferWhitelistAddress(address addr, bool state) onlyOwner whenTransfersEnabled(false) public {
      require(addr != address(0));
      transferWhitelist[addr] = state;
    }

    // AttraceProject can set vesting plans before incubation
    function setAddressVestingPlan(address addr, uint64 lockedAmountInATTR) onlyOwner whenTransfersEnabled(false) public {
      require(addr != address(0));
      require(lockedAmountInATTR >= 1);
      vestingPlans[addr] = VestingPlan({ 
        lockedAmountRemaining: lockedAmountInATTR,
        totalAmountLocked: lockedAmountInATTR,
        stage: 4
      });
    }
  
    // AttraceProject can call once to enable trading
    // TODO fat-finger gutfeeling tells to make this a two-phase commit
    function setTransfersEnabled() public onlyOwner {
      transfersEnabled = true;
      incubationTime = block.timestamp;
    }

    // To be called for updating vesting plan for an address, to be called directly or by AttraceProject
    function updateVestingPlan(address _addr) whenTransfersEnabled(true) public returns (uint64) {
      require(_addr != address(0));
      require(msg.sender == _addr || msg.sender == owner);
      if (vestingPlans[_addr].lockedAmountRemaining > 0) {
        uint256 timeSinceIncubation = block.timestamp - incubationTime;
        uint8 newStage;
        if (timeSinceIncubation <= 180 days) {
          newStage = 4;
        } else if (timeSinceIncubation > 180 days && timeSinceIncubation <= 1 years) {
          newStage = 3;
        } else if (timeSinceIncubation > 1 years && timeSinceIncubation <= (1 years + 180 days)) {
          newStage = 2;
        } else if (timeSinceIncubation > (1 years + 180 days) && timeSinceIncubation <= 2 years) {
          newStage = 1;
        } else {
          newStage = 0;
        }
        // See if we need to update vesting plan (time expired)
        if (vestingPlans[_addr].stage != newStage) {
          uint256 vestSlice = SafeMath.div(vestingPlans[_addr].totalAmountLocked, 4);
          uint256 newLockedAmountRemaining = SafeMath.sub(vestingPlans[_addr].lockedAmountRemaining, SafeMath.mul(vestingPlans[_addr].stage - newStage, vestSlice));
          // if (newLockedAmountRemaining < 0) {
          //   newLockedAmountRemaining = 0;
          //   newStage = 0;
          // }
          vestingPlans[_addr].stage = newStage;
          vestingPlans[_addr].lockedAmountRemaining = uint64(newLockedAmountRemaining);
        }
      }
    }

    /** Accessor functions for testing -- can be removed at deploy time **/
    function getAddressTransferWhitelistStatus(address addr) public view returns (bool) {
      require(addr != address(0));
      return transferWhitelist[addr];
    }

    function getAddressVestingPlanLockedAmountRemaining(address addr) public view returns (uint64) {
      require(addr != address(0));
      return vestingPlans[addr].lockedAmountRemaining;
    }

    function getAddressVestingPlanTotalAmountLocked(address addr) public view returns (uint64) {
      require(addr != address(0));
      return vestingPlans[addr].totalAmountLocked;
    }

    function getAddressVestingPlanStage(address addr) public view returns (uint8) {
      require(addr != address(0));
      return vestingPlans[addr].stage;
    }
}
