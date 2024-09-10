// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ElectionToken is ERC20, Ownable {
    address public electionContract;

    constructor() ERC20("Election Token", "VOTE") Ownable(msg.sender) {}

    function setElectionContract(address _electionContract) external onlyOwner {
        require(_electionContract != address(0), "Invalid election contract address");
        require(electionContract == address(0), "Election contract can only be set once");
        electionContract = _electionContract;
    }

    function mint(address to, uint256 amount) public returns (bool) {
        require(msg.sender == electionContract, "Only the election contract can mint tokens");
        _mint(to, amount);
        return true;
    }
}