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
    
            $('#accountAddress').text("Your Account: " + App.account);
        } catch (error) {
            console.error("Error loading election info:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    loadResults: async function() {
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
    }
};