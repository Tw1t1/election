const Election = artifacts.require("Election");
const ElectionToken = artifacts.require("ElectionToken");
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("Election", (accounts) => {
    let election;
    const owner = accounts[0];
    const voter1 = accounts[1];
    const voter2 = accounts[2];
    const candidate1 = accounts[3];
    const candidate2 = accounts[4];

    const questions = ["Q1", "Q2", "Q3"];
    const answerOptions = [
        ["1", "2", "3", "4", "5"],
        ["1", "2", "3", "4", "5"],
        ["1", "2", "3", "4", "5"]
    ];
    const tokenSupply = web3.utils.toWei("1000", "ether");

    beforeEach(async () => {
        election = await Election.new(questions, answerOptions, tokenSupply, { from: owner });
    });

    describe("Deployment", () => {
        it("should deploy the contract correctly", async () => {
            assert.ok(election.address);
        });

        it("should set the correct owner", async () => {
            const contractOwner = await election.owner();
            assert.equal(contractOwner, owner);
        });

        it("should initialize with the correct questions and answer options", async () => {
            const q1 = await election.questions(0);
            assert.equal(q1, questions[0]);

            const a1 = await election.answerOptions(0, 0);
            assert.equal(a1, answerOptions[0][0]);
        });
    });

    describe("Adding candidates and voters", () => {
        it("should allow the owner to add a candidate", async () => {
            await election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner });
            const candidate = await election.candidates(candidate1);
            assert.equal(candidate.name, "Candidate 1");
        });


        it("should not allow non-owners to add a candidate", async () => {
            await expectRevert.unspecified(
                election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: voter1 })
            );
        });

        it("should allow the owner to add a voter", async () => {
            await election.addVoter(voter1, { from: owner });
            const voterHash = web3.utils.soliditySha3(voter1);
            const isRegistered = await election.voterBook(voterHash);
            assert.equal(isRegistered, true);
        });

        it("should not allow non-owners to add a voter", async () => {
            await expectRevert.unspecified(
                election.addVoter(voter1, { from: voter2 })
            );
        });

        it("should not allow adding a candidate after election has started", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });

            await expectRevert(
                election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner }),
                "Election has already started"
            );
        });

        it("should not allow adding a voter after election has started", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });

            await expectRevert(
                election.addVoter(voter1, { from: owner }),
                "Election has already started"
            );
        });
    });

    describe("Setting voting time", () => {
        it("should allow the owner to set voting time", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });
            const votingStart = await election.votingStart();
            const votingEnd = await election.votingEnd();
            assert.equal(votingStart.toString(), start.toString());
            assert.equal(votingEnd.toString(), end.toString());
        });

        it("should not allow setting voting time in the past", async () => {
            const start = (await time.latest()).sub(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await expectRevert(
                election.setVotingTime(start, end, { from: owner }),
                "Voting start time must be in the future"
            );
        });

        it("should not allow non-owners to set voting time", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await expectRevert.unspecified(
                election.setVotingTime(start, end, { from: voter1 })
            );
        });

        it("should not allow setting voting time after election has started", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });

            const newStart = (await time.latest()).add(time.duration.days(2));
            const newEnd = newStart.add(time.duration.days(7));
            await expectRevert(
                election.setVotingTime(newStart, newEnd, { from: owner }),
                "Election has already started"
            );
        });
    });

    describe("Voting", () => {
        beforeEach(async () => {
            await election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner });
            await election.addCandidate(candidate2, "Candidate 2", "Party B", [1, 2, 3], { from: owner });
            await election.addVoter(voter1, { from: owner });
            await election.addVoter(voter2, { from: owner });
        });

        it("should not allow voting before the voting period starts", async () => {
            const start = (await time.latest()).add(time.duration.days(1));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });

            await expectRevert(
                election.vote(candidate1, { from: voter1 }),
                "Voting is not currently open"
            );
        });

        describe("During voting period", () => {
            beforeEach(async () => {
                const start = (await time.latest()).add(time.duration.seconds(10));
                const end = start.add(time.duration.days(7));
                await election.setVotingTime(start, end, { from: owner });
                await time.increase(time.duration.seconds(11));
            });

            it("should allow a registered voter to vote", async () => {
                await election.vote(candidate1, { from: voter1 });
                const voter = await election.voters(voter1);
                assert.equal(voter.hasVoted, true);
                assert.equal(voter.votedFor, candidate1);
            });

            it("should not allow an unregistered voter to vote", async () => {
                await expectRevert(
                    election.vote(candidate1, { from: accounts[5] }),
                    "You are not registered to vote"
                );
            });

            it("should not allow a voter to vote twice", async () => {
                await election.vote(candidate1, { from: voter1 });
                await expectRevert(
                    election.vote(candidate2, { from: voter1 }),
                    "You have already voted"
                );
            });

            it("should allow a voter to vote by opinion", async () => {
                await election.voteByOpinion([3, 4, 5], { from: voter1 });
                const voter = await election.voters(voter1);
                assert.equal(voter.hasVoted, true);
                assert.equal(voter.votedFor, candidate1);
            });

            it("should transfer a token to the voter after voting", async () => {
                const tokenAddress = await election.votingToken();
                const token = await ElectionToken.at(tokenAddress);
                const balanceBefore = await token.balanceOf(voter1);
                await election.vote(candidate1, { from: voter1 });
                const balanceAfter = await token.balanceOf(voter1);
                assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei("1", "ether"));
            });

            it("should not allow voting after the voting period ends", async () => {
                await time.increase(time.duration.days(8));
                await expectRevert(
                    election.vote(candidate1, { from: voter1 }),
                    "Voting is not currently open"
                );
            });
        });
    });

    describe("Getting results", () => {
        beforeEach(async () => {
            await election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner });
            await election.addCandidate(candidate2, "Candidate 2", "Party B", [1, 2, 3], { from: owner });
            await election.addVoter(voter1, { from: owner });
            await election.addVoter(voter2, { from: owner });

            const start = (await time.latest()).add(time.duration.seconds(10));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });
            await time.increase(time.duration.seconds(11));

            await election.vote(candidate1, { from: voter1 });
            await election.vote(candidate2, { from: voter2 });
        });

        it("should not allow getting results before voting ends", async () => {
            await expectRevert(
                election.getResults(),
                "Voting has not ended yet"
            );
        });

        it("should return correct results after voting ends", async () => {
            await time.increase(time.duration.days(8));
            const result = await election.getResults();
            const sortedCandidates = result[0];
            const voteCounts = result[1];
            assert.equal(sortedCandidates.length, 2);
            assert.equal(voteCounts[0].toString(), "1");
            assert.equal(voteCounts[1].toString(), "1");
        });

        it("should return the correct winner", async () => {
            await time.increase(time.duration.days(8));
            const winner = await election.getWinner();
            assert.ok(winner === candidate1 || winner === candidate2);
        });
    });

    describe("Edge cases", () => {
        it("should handle ties correctly", async () => {
            await election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner });
            await election.addCandidate(candidate2, "Candidate 2", "Party B", [1, 2, 3], { from: owner });
            await election.addVoter(voter1, { from: owner });
            await election.addVoter(voter2, { from: owner });

            const start = (await time.latest()).add(time.duration.seconds(10));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });
            await time.increase(time.duration.seconds(11));

            await election.vote(candidate1, { from: voter1 });
            await election.vote(candidate2, { from: voter2 });

            await time.increase(time.duration.days(8));
            const result = await election.getResults();
            const sortedCandidates = result[0];
            const voteCounts = result[1];

            assert.equal(voteCounts[0].toString(), voteCounts[1].toString(), "Vote counts should be equal in a tie");
            assert.ok(sortedCandidates[0] === candidate1 || sortedCandidates[0] === candidate2, "Either candidate could be first in a tie");
        });

        it("should handle an election with no votes", async () => {
            await election.addCandidate(candidate1, "Candidate 1", "Party A", [3, 4, 5], { from: owner });
            await election.addCandidate(candidate2, "Candidate 2", "Party B", [1, 2, 3], { from: owner });

            const start = (await time.latest()).add(time.duration.seconds(10));
            const end = start.add(time.duration.days(7));
            await election.setVotingTime(start, end, { from: owner });
            await time.increase(time.duration.days(8));

            const result = await election.getResults();
            const voteCounts = result[1];

            assert.equal(voteCounts[0].toString(), "0", "Vote count should be zero");
            assert.equal(voteCounts[1].toString(), "0", "Vote count should be zero");
        });
    });
});