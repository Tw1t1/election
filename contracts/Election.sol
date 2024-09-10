// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ElectionBase.sol";

contract Election is ElectionBase {
    uint256 public constant VOTER_REWARD = 0.1 ether;

    constructor(
        string memory _electionName,
        string[] memory _questions,
        string[][] memory _answerOptions
    ) ElectionBase(_electionName, _questions, _answerOptions) {
        _validateQuestions(_questions, _answerOptions);
        votingToken.setElectionContract(address(this));
    }

    function _validateQuestions(string[] memory _questions, string[][] memory _answerOptions) private pure {
        require(_questions.length > 0 && _questions.length == _answerOptions.length, "Invalid questions/answers");
        for (uint i = 0; i < _answerOptions.length; i++) {
            require(_answerOptions[i].length > 1, "Each question must have at least two answer options");
        }
    }

    function applyForCandidate(string memory _name, string memory _party, uint8[] memory _opinions) public onlyBeforeElection {
        require(msg.sender != owner() && !candidates[msg.sender].approved && !candidateApplications[msg.sender], "Invalid application");
        require(_opinions.length == questions.length, "Invalid number of opinions");

        candidateApplications[msg.sender] = true;
        candidates[msg.sender] = Candidate(false, _name, _party, _opinions, 0);
        candidateApplicationsAddresses.push(msg.sender);
    }

    function approveCandidate(address _candidateAddress) public onlyOwner onlyBeforeElection {
        require(candidateApplications[_candidateAddress] && !candidates[_candidateAddress].approved, "Invalid candidate");

        candidates[_candidateAddress].approved = true;
        candidateAddresses.push(_candidateAddress);

        delete candidateApplications[_candidateAddress];
        removeFromArray(candidateApplicationsAddresses, _candidateAddress);

        _approveVoterIfNeeded(_candidateAddress);

        emit CandidateApproved(_candidateAddress, candidates[_candidateAddress].name, candidates[_candidateAddress].party);
    }

    function _approveVoterIfNeeded(address _address) private {
        bytes32 hashAddress = hashedAddress(_address);
        if (!voters[hashAddress].approved) {
            voters[hashAddress] = Voter(true, false, address(0), new uint8[](0));
            voterAddresses.push(hashAddress);

            if (voterApplications[hashAddress]) {
                delete voterApplications[hashAddress];
                removeFromArray(voterApplicationsAddresses, hashAddress);
            }
        }
    }

    function rejectCandidate(address _candidateAddress) public onlyOwner onlyBeforeElection {
        require(candidateApplications[_candidateAddress], "No application found");
        delete candidateApplications[_candidateAddress];
        removeFromArray(candidateApplicationsAddresses, _candidateAddress);
    }

    function removeCandidate(address _candidateAddress) public onlyOwner onlyBeforeElection {
        require(candidates[_candidateAddress].approved, "Candidate not found or not approved");
        delete candidates[_candidateAddress];
        removeFromArray(candidateAddresses, _candidateAddress);
        emit CandidateRemoved(_candidateAddress);
    }

    function applyForVoter() public onlyBeforeElection {
        bytes32 hashAddress = hashedAddress(msg.sender);
        require(msg.sender != owner() && !voters[hashAddress].approved && !voterApplications[hashAddress], "Invalid application");
        voterApplications[hashAddress] = true;
        voterApplicationsAddresses.push(hashAddress);
    }

    function approveVoter(address _voterAddress) public onlyOwner onlyBeforeElection {
        bytes32 hashAddress = hashedAddress(_voterAddress);
        require(voterApplications[hashAddress] && !voters[hashAddress].approved, "Invalid voter");
        voters[hashAddress] = Voter(true, false, address(0), new uint8[](0));
        voterAddresses.push(hashAddress);
        delete voterApplications[hashAddress];
        removeFromArray(voterApplicationsAddresses, hashAddress);
    }

    function rejectVoter(address _voterAddress) public onlyOwner onlyBeforeElection {
        bytes32 hashAddress = hashedAddress(_voterAddress);
        require(voterApplications[hashAddress], "No application found");
        delete voterApplications[hashAddress];
        removeFromArray(voterApplicationsAddresses, hashAddress);
    }

    function removeVoter(address _voterAddress) public onlyOwner onlyBeforeElection {
        bytes32 hashAddress = hashedAddress(_voterAddress);
        require(voters[hashAddress].approved, "Voter not found or not approved");
        delete voters[hashAddress];
        removeFromArray(voterAddresses, hashAddress);
    }

    function setElectionTime(uint256 _start, uint256 _end) public onlyOwner onlyBeforeElection {
        require(_start > block.timestamp && _end > _start, "Invalid election times");
        electionStartTime = _start;
        electionEndTime = _end;
        emit VotingTimeSet(_start, _end);
    }

    function vote(address _candidateAddress) public duringElectionPeriod onlyEligibleVoter {
        require(candidates[_candidateAddress].approved, "Invalid candidate");
        _castVote(msg.sender, _candidateAddress);
    }

    function voteByOpinion(uint8[] memory _voterOpinions) public duringElectionPeriod onlyEligibleVoter {
        require(_voterOpinions.length == questions.length, "Invalid number of opinions");
        for (uint i = 0; i < _voterOpinions.length; i++) {
            require(_voterOpinions[i] < answerOptions[i].length, "Invalid opinion value");
        }

        address closestCandidate = findClosestCandidate(_voterOpinions);
        _castVote(msg.sender, closestCandidate);
        voters[hashedAddress(msg.sender)].opinions = _voterOpinions;
    }

    function _castVote(address _voter, address _candidate) private {
        bytes32 hashAddress = hashedAddress(_voter);
        voters[hashAddress].hasVoted = true;
        voters[hashAddress].votedFor = _candidate;
        candidates[_candidate].voteCount++;
        votesCount++;
        _rewardVoter(_voter);
        emit VoteCast(hashAddress, _candidate);
    }

    function _rewardVoter(address _voter) internal {
        require(votingToken.mint(_voter, VOTER_REWARD), "Token minting failed");
        emit VoterRewarded(_voter, VOTER_REWARD);
    }

    function findClosestCandidate(uint8[] memory _voterOpinions) private view returns (address) {
        uint256 closestDistance = type(uint256).max;
        address closestCandidate;

        for (uint256 i = 0; i < candidateAddresses.length; i++) {
            address candidateAddress = candidateAddresses[i];
            uint256 distance = calculateDistance(_voterOpinions, candidates[candidateAddress].opinions);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestCandidate = candidateAddress;
            }
        }

        return closestCandidate;
    }

    function calculateDistance(uint8[] memory _opinions1, uint8[] memory _opinions2) private pure returns (uint256) {
        require(_opinions1.length == _opinions2.length, "Opinion arrays must have the same length");
        uint256 totalDistance = 0;

        for (uint256 i = 0; i < _opinions1.length; i++) {
            uint256 difference = _opinions1[i] > _opinions2[i] ? _opinions1[i] - _opinions2[i] : _opinions2[i] - _opinions1[i];
            totalDistance += difference * difference;
        }

        return totalDistance;
    }

    function getResults() public view onlyAfterElection returns (address[] memory, uint256[] memory) {
        uint256 candidateCount = candidateAddresses.length;
        address[] memory sortedCandidates = new address[](candidateCount);
        uint256[] memory voteCounts = new uint256[](candidateCount);

        for (uint256 i = 0; i < candidateCount; i++) {
            sortedCandidates[i] = candidateAddresses[i];
            voteCounts[i] = candidates[candidateAddresses[i]].voteCount;
        }

        _sortResults(sortedCandidates, voteCounts);

        return (sortedCandidates, voteCounts);
    }

    function _sortResults(address[] memory _candidates, uint256[] memory _voteCounts) private pure {
        for (uint256 i = 0; i < _candidates.length - 1; i++) {
            for (uint256 j = 0; j < _candidates.length - i - 1; j++) {
                if (_voteCounts[j] < _voteCounts[j + 1]) {
                    (_candidates[j], _candidates[j + 1]) = (_candidates[j + 1], _candidates[j]);
                    (_voteCounts[j], _voteCounts[j + 1]) = (_voteCounts[j + 1], _voteCounts[j]);
                }
            }
        }
    }
}