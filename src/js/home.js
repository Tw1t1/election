$(document).ready(function() {
    App.init().then(function() {
        Home.init();
    });
});

const Home = {
    init: async function() {
        try {
            if (!App.userType || App.userType === 'guest') {
                App.userType = await App.checkUserType(App.account);
            }
            App.renderNavbar('Home');
            await this.loadElectionInfo();
        } catch (error) {
            console.error("Error initializing home page:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    loadElectionInfo: async function() {
        try {
            $('#contractAddress').text(App.contractAddress);

            const electionTime = await App.election.getElectionTime();
            let startTime, endTime;

            if (Array.isArray(electionTime) && electionTime.length === 2) {
                [startTime, endTime] = electionTime.map(time => time.toNumber() * 1000);
            } else if (typeof electionTime === 'object') {
                startTime = (electionTime.start || electionTime[0]).toNumber() * 1000;
                endTime = (electionTime.end || electionTime[1]).toNumber() * 1000;
            } else {
                console.error("Unexpected electionTime format:", electionTime);
                startTime = endTime = 0;
            }

            const currentTime = Date.now();

            let electionStatus;
            if (startTime === 0 && endTime === 0) {
                electionStatus = "Time not set";
            } else if (currentTime < startTime) {
                electionStatus = "Not started";
            } else if (currentTime >= startTime && currentTime <= endTime) {
                electionStatus = "In progress";
            } else {
                electionStatus = "Ended";
            }

            $('#electionStatus').text(electionStatus);
            $('#startTime').text(startTime ? new Date(startTime).toLocaleString() : "Not set");
            $('#endTime').text(endTime ? new Date(endTime).toLocaleString() : "Not set");

            const candidatesCount = await App.election.getCandidateAddresses().length;
            $('#candidatesCount').text(candidatesCount.toString());

            if (App.userType === 'admin') {
                $('#adminOnlyInfo').show();
                
                // Count unapproved candidate applications
                const candidateAddresses = await App.election.getCandidateAddresses().length();
                let openCandidateApplications = 0;
                for (let i = 0; i < candidateAddresses.length; i++) {
                    const candidate = await App.election.candidates(candidateAddresses[i]);
                    if (!candidate.approved) {
                        openCandidateApplications++;
                    }
                }
                $('#openCandidateApplications').text(openCandidateApplications.toString());

                // Get voter applications count
                const voterApplicationsCount = await App.election.getVoterApplicationsCount();
                $('#openVoterApplications').text(voterApplicationsCount.toString());

                const votersCount = await App.election.getVotersCount();
                $('#votersCount').text(votersCount.toString());

                const totalVotes = await App.election.getVotesCount();
                $('#totalVotes').text(totalVotes.toString());

                if (electionStatus === "Ended") {
                    await this.loadResults();
                }
            }

            $('#accountAddress').text("Your Account: " + App.account);
        } catch (error) {
            console.error("Error loading election info:", error);
            throw error;
        }
    },

    loadResults: async function() {
        try {
            const [candidates, voteCounts] = await App.election.getResults();
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
    }
};