// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./ElectionToken.sol";

contract ElectionBase is Ownable {
    using ECDSA for bytes32;

    struct Candidate {
        bool approved;
        string name;
        string party;
        uint8[] opinions;
        uint256 voteCount;
    }

    struct Voter {
        bool approved;
        bool hasVoted;
        address votedFor;
        uint8[] opinions;
    }

    ElectionToken public votingToken;

    string public electionName;
    string[] public questions;
    string[][] public answerOptions;

    uint256 public electionStartTime;
    uint256 public electionEndTime;
    uint public votesCount;

    mapping(address => Candidate) public candidates;
    mapping(address => bool) public candidateApplications;
    mapping(bytes32 => Voter) public voters;
    mapping(bytes32 => bool) public voterApplications;

    address[] public candidateAddresses;
    address[] public candidateApplicationsAddresses;
    bytes32[] public voterAddresses;
    bytes32[] public voterApplicationsAddresses;

    event CandidateApproved(address indexed candidateAddress, string name, string party);
    event CandidateRemoved(address indexed candidateAddress);
    event VoteCast(bytes32 indexed voter, address indexed candidate);
    event VotingTimeSet(uint256 start, uint256 end);
    event VoterRewarded(address indexed voter, uint256 amount);

    modifier duringElectionPeriod() {
        require(electionStartTime != 0 && electionEndTime != 0, "Election times not set");
        require(block.timestamp >= electionStartTime && block.timestamp < electionEndTime, "Not during election period");
        _;
    }

    modifier onlyBeforeElection() {
        require(electionStartTime == 0 || block.timestamp < electionStartTime, "Election has already started");
        _;
    }

    modifier onlyAfterElection() {
        require(electionEndTime != 0 && block.timestamp > electionEndTime, "Election has not ended yet");
        _;
    }

    modifier onlyEligibleVoter() {
        bytes32 hashedVoter = hashedAddress(msg.sender);
        require(voters[hashedVoter].approved && !voters[hashedVoter].hasVoted, "Not eligible to vote");
        _;
    }

    constructor(string memory _electionName, string[] memory _questions, string[][] memory _answerOptions) Ownable(msg.sender) {
        electionName = _electionName;
        questions = _questions;
        answerOptions = _answerOptions;
        votingToken = new ElectionToken();
    }

    function hashedAddress(address _voter) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_voter));
    }

    function removeFromArray(address[] storage array, address element) internal {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == element) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function removeFromArray(bytes32[] storage array, bytes32 element) internal {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == element) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function getCandidateOpinions(address _candidateAddress) public view returns (uint8[] memory) {
        return candidates[_candidateAddress].opinions;
    }

    function getVoterOpinions(bytes32 _voterAddress) public view returns (uint8[] memory) {
        return voters[_voterAddress].opinions;
    }

    function getQuestions() public view returns (string[] memory) {
        return questions;
    }

    function getAnswerOptions(uint _questionIndex) public view returns (string[] memory) {
        return answerOptions[_questionIndex];
    }

    function getCandidateAddresses() public view returns (address[] memory) {
        return candidateAddresses;
    }

    function getCandidateApplicationsAddresses() public view returns (address[] memory) {
        return candidateApplicationsAddresses;
    }

    function getVoterAddresses() public view returns (bytes32[] memory) {
        return voterAddresses;
    }

    function getVoterApplicationsAddresses() public view returns (bytes32[] memory) {
        return voterApplicationsAddresses;
    }
}