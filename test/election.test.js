const Election = artifacts.require("Election");
const ElectionToken = artifacts.require("ElectionToken");

const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("Election", function (accounts) {
  const [owner, addr1, addr2, ...addrs] = accounts;

  let election;
  let electionToken;

  beforeEach(async function () {
    const electionName = "Test Election";
    const questions = ["Question 1", "Question 2"];
    const answerOptions = [["Option 1", "Option 2"], ["Option A", "Option B", "Option C"]];

    election = await Election.new(electionName, questions, answerOptions);
    const tokenAddress = await election.votingToken();
    electionToken = await ElectionToken.at(tokenAddress);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await election.owner()).to.equal(owner);
    });

    it("Should set the correct election name", async function () {
      expect(await election.electionName()).to.equal("Test Election");
    });

    it("Should set the correct questions and answer options", async function () {
      expect(await election.getQuestions()).to.deep.equal(["Question 1", "Question 2"]);
      expect(await election.getAnswerOptions(0)).to.deep.equal(["Option 1", "Option 2"]);
      expect(await election.getAnswerOptions(1)).to.deep.equal(["Option A", "Option B", "Option C"]);
    });
  });

  describe("Candidate Management", function () {
    it("Should allow a user to apply as a candidate", async function () {
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      const applications = await election.getCandidateApplicationsAddresses();
      expect(applications).to.include(addr1);
    });

    it("Should not allow the owner to apply as a candidate", async function () {
      await expectRevert(
        election.applyForCandidate("Owner", "Party O", [0, 0], { from: owner }),
        "Invalid application"
      );
    });

    it("Should allow the owner to approve a candidate", async function () {
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.approveCandidate(addr1, { from: owner });
      const candidate = await election.candidates(addr1);
      expect(candidate.approved).to.be.true;
    });

    it("Should allow the owner to reject a candidate", async function () {
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.rejectCandidate(addr1, { from: owner });
      const applications = await election.getCandidateApplicationsAddresses();
      expect(applications).to.not.include(addr1);
    });

    it("Should allow the owner to remove an approved candidate", async function () {
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.approveCandidate(addr1, { from: owner });
      await election.removeCandidate(addr1, { from: owner });
      const candidateAddresses = await election.getCandidateAddresses();
      expect(candidateAddresses).to.not.include(addr1);
    });
  });

  describe("Voter Management", function () {
    it("Should allow a user to apply as a voter", async function () {
      await election.applyForVoter({ from: addr1 });
      const applications = await election.getVoterApplicationsAddresses();
      expect(applications).to.include(web3.utils.keccak256(addr1));
    });

    it("Should not allow the owner to apply as a voter", async function () {
      await expectRevert(
        election.applyForVoter({ from: owner }),
        "Invalid application"
      );
    });

    it("Should allow the owner to approve a voter", async function () {
      await election.applyForVoter({ from: addr1 });
      await election.approveVoter(addr1, { from: owner });
      const voter = await election.voters(web3.utils.keccak256(addr1));
      expect(voter.approved).to.be.true;
    });

    it("Should allow the owner to reject a voter", async function () {
      await election.applyForVoter({ from: addr1 });
      await election.rejectVoter(addr1, { from: owner });
      const applications = await election.getVoterApplicationsAddresses();
      expect(applications).to.not.include(web3.utils.keccak256(addr1));
    });

    it("Should allow the owner to remove an approved voter", async function () {
      await election.applyForVoter({ from: addr1 });
      await election.approveVoter(addr1, { from: owner });
      await election.removeVoter(addr1, { from: owner });
      const voterAddresses = await election.getVoterAddresses();
      expect(voterAddresses).to.not.include(web3.utils.keccak256(addr1));
    });
  });

  describe("Election Management", function () {
    it("Should allow the owner to set election times", async function () {
      const start = (await time.latest()).add(time.duration.hours(1));
      const end = start.add(time.duration.days(1));
      await election.setElectionTime(start, end, { from: owner });
      const setStart = await election.electionStartTime();
      const setEnd = await election.electionEndTime();
      expect(setStart.toString()).to.equal(start.toString());
      expect(setEnd.toString()).to.equal(end.toString());
    });

    it("Should not allow setting invalid election times", async function () {
      const start = (await time.latest()).sub(time.duration.hours(1));
      const end = (await time.latest()).add(time.duration.hours(1));
      await expectRevert(
        election.setElectionTime(start, end, { from: owner }),
        "Invalid election times"
      );
    });
  });

  describe("Voting Process", function () {
    let start, end;

    beforeEach(async function () {
      // Setup candidates and voters
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.applyForCandidate("Candidate 2", "Party B", [1, 2], { from: addr2 });
      await election.approveCandidate(addr1, { from: owner });
      await election.approveCandidate(addr2, { from: owner });

      for (let i = 0; i < 5; i++) {
        await election.applyForVoter({ from: addrs[i] });
        await election.approveVoter(addrs[i], { from: owner });
      }

      // Set election times
      start = (await time.latest()).add(time.duration.seconds(100));
      end = start.add(time.duration.days(1));
      await election.setElectionTime(start, end, { from: owner });
    });

    it("Should not allow voting before election starts", async function () {
      await expectRevert(
        election.vote(addr1, { from: addrs[0] }),
        "Not during election period"
      );
    });

    it("Should allow voting during election period", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await election.vote(addr1, { from: addrs[0] });
      const voter = await election.voters(web3.utils.keccak256(addrs[0]));
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedFor).to.equal(addr1);
    });

    it("Should not allow voting after election ends", async function () {
      await time.increaseTo(end.add(time.duration.seconds(1)));
      await expectRevert(
        election.vote(addr1, { from: addrs[0] }),
        "Not during election period"
      );
    });

    it("Should not allow voting for non-approved candidates", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await expectRevert(
        election.vote(addrs[5], { from: addrs[0] }),
        "Invalid candidate"
      );
    });

    it("Should not allow voting twice", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await election.vote(addr1, { from: addrs[0] });
      await expectRevert(
        election.vote(addr2, { from: addrs[0] }),
        "Not eligible to vote"
      );
    });

    it("Should allow voting by opinion", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await election.voteByOpinion([0, 1], { from: addrs[0] });
      const voter = await election.voters(web3.utils.keccak256(addrs[0]));
      expect(voter.hasVoted).to.be.true;
      const opinions = await election.getVoterOpinions(web3.utils.keccak256(addrs[0]));
      expect(opinions.map(o => o.toString())).to.deep.equal(['0', '1']);
    });

    it("Should not allow voting by opinion with invalid number of opinions", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await expectRevert(
        election.voteByOpinion([0], { from: addrs[0] }),
        "Invalid number of opinions"
      );
    });

    it("Should not allow voting by opinion with invalid opinion values", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await expectRevert(
        election.voteByOpinion([0, 3], { from: addrs[0] }),
        "Invalid opinion value"
      );
    });
  });

  describe("Results", function () {
    let start, end;

    beforeEach(async function () {
      // Setup candidates and voters
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.applyForCandidate("Candidate 2", "Party B", [1, 2], { from: addr2 });
      await election.approveCandidate(addr1, { from: owner });
      await election.approveCandidate(addr2, { from: owner });

      for (let i = 0; i < 5; i++) {
        await election.applyForVoter({ from: addrs[i] });
        await election.approveVoter(addrs[i], { from: owner });
      }

      // Set election times
      start = (await time.latest()).add(time.duration.seconds(100));
      end = start.add(time.duration.days(1));
      await election.setElectionTime(start, end, { from: owner });

      // Cast votes
      await time.increaseTo(start.add(time.duration.seconds(1)));
      await election.vote(addr1, { from: addrs[0] });
      await election.vote(addr1, { from: addrs[1] });
      await election.vote(addr2, { from: addrs[2] });
    });

    it("Should not allow getting results before election ends", async function () {
      await expectRevert(
        election.getResults(),
        "Election has not ended yet"
      );
    });

    it("Should return correct results after election ends", async function () {
      await time.increaseTo(end.add(time.duration.seconds(1)));
      const result = await election.getResults();
          
      // The result is an array-like object with numeric keys
      const candidates = result['0'];
      const voteCounts = result['1'];
    
      expect(candidates[0]).to.equal(addr1);
      expect(candidates[1]).to.equal(addr2);
      expect(voteCounts[0].toString()).to.equal('2');
      expect(voteCounts[1].toString()).to.equal('1');
    });
  });

  describe("Token Rewards", function () {
    let start, end;

    beforeEach(async function () {
      // Setup candidates and voters
      await election.applyForCandidate("Candidate 1", "Party A", [0, 1], { from: addr1 });
      await election.approveCandidate(addr1, { from: owner });

      await election.applyForVoter({ from: addr2 });
      await election.approveVoter(addr2, { from: owner });

      // Set election times
      start = (await time.latest()).add(time.duration.seconds(100));
      end = start.add(time.duration.days(1));
      await election.setElectionTime(start, end, { from: owner });
    });

    it("Should reward voters with tokens after voting", async function () {
      await time.increaseTo(start.add(time.duration.seconds(1)));

      const tx = await election.vote(addr1, { from: addr2 });
      expectEvent(tx, 'VoterRewarded', {
        voter: addr2,
        amount: new BN(web3.utils.toWei('0.1', 'ether'))
      });

      const balance = await electionToken.balanceOf(addr2);
      expect(balance.toString()).to.equal(web3.utils.toWei('0.1', 'ether'));
    });
  });
});