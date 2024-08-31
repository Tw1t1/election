// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ElectionToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("ElectionToken", "ELECT") {
        _mint(msg.sender, initialSupply);
    }
}

contract Election is Ownable {
    using ECDSA for bytes32;

    struct Candidate {
        address id;
        string name;
        string party;
        uint8[] opinions;
        uint256 voteCount;
    }

    struct Voter {
        bool hasVoted;
        address votedFor;
        uint8[] opinions;
    }

    ElectionToken public votingToken;
    mapping(address => Candidate) public candidates;
    mapping(bytes32 => bool) public voterBook; // Hashed voter addresses
    mapping(address => Voter) public voters;

    address[] public candidateAddresses;
    uint public votersCount = 0;
    uint public votesCount = 0;

    uint256 public votingStart;
    uint256 public votingEnd;
    bool public electionStarted;

    string[] public questions;
    string[][] public answerOptions;

    event CandidateAdded(
        address indexed candidateAddress,
        string name,
        string party
    );
    event VoterAdded(bytes32 hashedVoterAddress);
    event VoteCast(address indexed voter, address indexed candidate);
    event VotingTimeSet(uint256 start, uint256 end);

    constructor(
        string[] memory _questions,
        string[][] memory _answerOptions,
        uint256 tokenSupply
    ) Ownable(msg.sender) {
        questions = _questions;
        answerOptions = _answerOptions;
        votingToken = new ElectionToken(tokenSupply);
        electionStarted = false;
    }

    function addCandidate(
        address _candidateAddress,
        string memory _name,
        string memory _party,
        uint8[] memory _opinions
    ) public onlyOwner {
        require(!electionStarted, "Election has already started");
        require(
            candidates[_candidateAddress].id == address(0),
            "Candidate already exists"
        );
        require(
            _opinions.length == questions.length,
            "Invalid number of opinions"
        );

        candidates[_candidateAddress] = Candidate(
            _candidateAddress,
            _name,
            _party,
            _opinions,
            0
        );
        candidateAddresses.push(_candidateAddress);

        emit CandidateAdded(_candidateAddress, _name, _party);
    }

    function addVoter(address _voterAddress) public onlyOwner {
        require(!electionStarted, "Election has already started");
        bytes32 hashedVoterAddress = keccak256(abi.encodePacked(_voterAddress));
        require(!voterBook[hashedVoterAddress], "Voter already exists");

        voterBook[hashedVoterAddress] = true;
        votersCount++;

        emit VoterAdded(hashedVoterAddress);
    }

    function setVotingTime(uint256 _start, uint256 _end) public onlyOwner {
        require(!electionStarted, "Election has already started");
        require(
            _start > block.timestamp,
            "Voting start time must be in the future"
        );
        require(_end > _start, "Voting end time must be after start time");

        votingStart = _start;
        votingEnd = _end;
        electionStarted = true;

        emit VotingTimeSet(_start, _end);
    }

    function vote(address _candidateAddress) public {
        require(electionStarted, "Election has not started yet");
        require(
            block.timestamp >= votingStart && block.timestamp <= votingEnd,
            "Voting is not currently open"
        );
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(
            candidates[_candidateAddress].id != address(0),
            "Invalid candidate"
        );

        bytes32 hashedVoterAddress = keccak256(abi.encodePacked(msg.sender));
        require(
            voterBook[hashedVoterAddress],
            "You are not registered to vote"
        );

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedFor = _candidateAddress;
        candidates[_candidateAddress].voteCount++;
        votesCount++;

        // Transfer voting token to the voter
        votingToken.transfer(msg.sender, 1 ether);

        emit VoteCast(msg.sender, _candidateAddress);
    }

    function voteByOpinion(uint8[] memory _voterOpinions) public {
        require(electionStarted, "Election has not started yet");
        require(
            block.timestamp >= votingStart && block.timestamp <= votingEnd,
            "Voting is not currently open"
        );
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(
            _voterOpinions.length == questions.length,
            "Invalid number of opinions"
        );

        bytes32 hashedVoterAddress = keccak256(abi.encodePacked(msg.sender));
        require(
            voterBook[hashedVoterAddress],
            "You are not registered to vote"
        );

        address closestCandidate = findClosestCandidate(_voterOpinions);
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedFor = closestCandidate;
        voters[msg.sender].opinions = _voterOpinions;
        candidates[closestCandidate].voteCount++;
        votesCount++;

        // Transfer voting token to the voter
        votingToken.transfer(msg.sender, 1 ether);

        emit VoteCast(msg.sender, closestCandidate);
    }

    function findClosestCandidate(
        uint8[] memory _voterOpinions
    ) private view returns (address) {
        uint256 closestDistance = type(uint256).max;
        address closestCandidate;

        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            address candidateAddress = candidateAddresses[i];
            uint256 distance = calculateDistance(
                _voterOpinions,
                candidates[candidateAddress].opinions
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestCandidate = candidateAddress;
            }
        }

        return closestCandidate;
    }

    function calculateDistance(
        uint8[] memory _opinions1,
        uint8[] memory _opinions2
    ) private pure returns (uint256) {
        require(
            _opinions1.length == _opinions2.length,
            "Opinion arrays must have the same length"
        );
        uint256 totalDistance = 0;

        for (uint256 i = 0; i < _opinions1.length; i++) {
            // Calculate the absolute difference between opinions
            uint256 difference = _opinions1[i] > _opinions2[i]
                ? _opinions1[i] - _opinions2[i]
                : _opinions2[i] - _opinions1[i];

            // Square the difference to penalize larger gaps more
            totalDistance += difference * difference;
        }

        return totalDistance;
    }

    function getResults()
        public
        view
        returns (address[] memory, uint256[] memory)
    {
        require(block.timestamp > votingEnd, "Voting has not ended yet");

        uint256 candidateCount = candidateAddresses.length;
        address[] memory sortedCandidates = new address[](candidateCount);
        uint256[] memory voteCounts = new uint256[](candidateCount);

        for (uint256 i = 0; i < candidateCount; i++) {
            sortedCandidates[i] = candidateAddresses[i];
            voteCounts[i] = candidates[candidateAddresses[i]].voteCount;
        }

        // Simple bubble sort (can be optimized for larger elections)
        for (uint256 i = 0; i < candidateCount - 1; i++) {
            for (uint256 j = 0; j < candidateCount - i - 1; j++) {
                if (voteCounts[j] < voteCounts[j + 1]) {
                    (sortedCandidates[j], sortedCandidates[j + 1]) = (
                        sortedCandidates[j + 1],
                        sortedCandidates[j]
                    );
                    (voteCounts[j], voteCounts[j + 1]) = (
                        voteCounts[j + 1],
                        voteCounts[j]
                    );
                }
            }
        }

        return (sortedCandidates, voteCounts);
    }

    function getWinner() public view returns (address) {
        (address[] memory sortedCandidates, ) = getResults();
        return sortedCandidates[0];
    }

    function getQuestionCount() public view returns (uint256) {
        return questions.length;
    }

    function getQuestion(uint256 index) public view returns (string memory) {
        require(index < questions.length, "Question index out of bounds");
        return questions[index];
    }

    function getAnswerOptionsCount(
        uint256 questionIndex
    ) public view returns (uint256) {
        require(
            questionIndex < questions.length,
            "Question index out of bounds"
        );
        return answerOptions[questionIndex].length;
    }

    function getAnswerOption(
        uint256 questionIndex,
        uint256 answerIndex
    ) public view returns (string memory) {
        require(
            questionIndex < questions.length,
            "Question index out of bounds"
        );
        require(
            answerIndex < answerOptions[questionIndex].length,
            "Answer index out of bounds"
        );
        return answerOptions[questionIndex][answerIndex];
    }

    function getVotingTime() public view returns (uint256, uint256) {
        return (votingStart, votingEnd);
    }

    function getVotersCount() public view returns (uint) {
        return votersCount;
    }

    function getVotesCount() public view returns (uint) {
        return votesCount;
    }

    function getCandidateCount() public view returns (uint) {
        return candidateAddresses.length;
    }
}