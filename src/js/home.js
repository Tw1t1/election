$(document).ready(function () {
    App.init().then(function () {
        App.checkPageAccess();
        App.refreshNavbar();
        Home.init();
    });
});

const Home = {
    init: async function () {
        try {
            if (!App.userType || App.userType === 'guest') {
                App.userType = await App.checkUserType(App.account);
            }
            await this.loadElectionInfo();
        } catch (error) {
            console.error("Error initializing home page:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    loadElectionInfo: async function () {
        try {
            $('#contractAddress').text(App.contractAddress);

            const electionStatus = await App.getElectionStatus();
            $('#electionStatus').text(electionStatus);

            const isTimeSet = await App.isElectionTimeSet();
            if (isTimeSet) {
                const electionTime = await App.getElectionTime();
                $('#startTime').text(new Date(electionTime.start).toLocaleString());
                $('#endTime').text(new Date(electionTime.end).toLocaleString());
            } else {
                $('#startTime').text("Not set");
                $('#endTime').text("Not set");
            }

            // Updated way to get candidate count
            let candidatesCount;
            try {
                candidatesCount = await App.election.getCandidateAddresses();
                candidatesCount = Array.isArray(candidatesCount) ? candidatesCount.length : 0;
            } catch (error) {
                console.error("Error getting candidate addresses:", error);
                candidatesCount = 0;
            }
            $('#candidatesCount').text(candidatesCount.toString());

            if (App.userType === 'admin') {
                $('#adminOnlyInfo').show();

                let candidateApplicationsCount;
                try {
                    candidateApplicationsCount = await App.election.getCandidateApplicationsAddresses();
                    candidateApplicationsCount = Array.isArray(candidateApplicationsCount) ? candidateApplicationsCount.length : 0;
                } catch (error) {
                    console.error("Error getting candidate applications:", error);
                    candidateApplicationsCount = 0;
                }
                $('#openCandidateApplications').text(candidateApplicationsCount.toString());

                let voterApplicationsCount;
                try {
                    voterApplicationsCount = await App.election.getVoterApplicationsAddresses();
                    voterApplicationsCount = Array.isArray(voterApplicationsCount) ? voterApplicationsCount.length : 0;
                } catch (error) {
                    console.error("Error getting voter applications:", error);
                    voterApplicationsCount = 0;
                }
                $('#openVoterApplications').text(voterApplicationsCount.toString());

                let votersCount;
                try {
                    const voterAddresses = await App.election.getVoterAddresses();
                    votersCount = Array.isArray(voterAddresses) ? voterAddresses.length : 0;
                } catch (error) {
                    console.error("Error getting voter addresses:", error);
                    votersCount = 0;
                }
                $('#votersCount').text(votersCount.toString());

                const votesCount = await App.election.votesCount();
                $('#totalVotes').text(votesCount.toString());

            }

            if (electionStatus === "Ended") {
                await this.loadResults();
            }

        } catch (error) {
            console.error("Error loading election info:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    /*
        * known issue: when the election is ended, but the block.timestamp is not updated, the results will not be displayed
        * this is because the block.timestamp is used to determine if the election has ended
        * to fix this, we can trigger a new block to update the block.timestamp value
        * this can be done by sending a transaction from one account to another
        * this is only for testing purposes and should be removed in production environment
        * a solution to this issue in production environment is to add to the contract a function that the admin will call to end the election
        * and that function will emit an event that the front-end will listen to and update the election status accordingly
        * and that will also update the block.timestamp value
    */
    loadResults: async function () {
        // TODO - Remove this line in production environment as it is only for testing purposes
        // This line is used to trigger a new block to update the block.timestamp value
        const latestBlock = await web3.eth.getBlock('latest');
        const blockTimestamp = Number(latestBlock.timestamp);
        const electionTime = await App.getElectionTime();
        const electionEndTime = electionTime.end / 1000;
        const electionStatus = await App.getElectionStatus();
        if (blockTimestamp <= electionEndTime && electionStatus === "Ended") {
            console.log("Triggering new block to update block.timestamp value...");
            await this.triggerNewBlock();
        }


        try {
            const result = await App.election.getResults();
            candidates = result['0'];
            voteCounts = result['1'];
            const resultsList = $('#resultsList');
            resultsList.empty();

            for (let i = 0; i < candidates.length; i++) {
                const candidateInfo = await App.election.candidates(candidates[i]);
                const listItem = $('<li>').text(`${candidateInfo.name} (${candidateInfo.party}): ${voteCounts[i]} votes`);
                resultsList.append(listItem);
            }

            $('#resultsSection').show();
        } catch (error) {
            console.error("Error loading results:", error);
            App.showError("Failed to load election results. Please try again later.");
        }
    },

    // TODO - Remove this function in production environment as it is only for testing purposes
    // This function is used to trigger a new block to update the block.timestamp value
    triggerNewBlock: async function () {
        const accounts = await web3.eth.getAccounts();
        await web3.eth.sendTransaction({
            from: accounts[0],
            to: accounts[1],
            value: web3.utils.toWei('0.001', 'ether')
        });
    }
};