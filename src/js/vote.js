$(document).ready(function() {
    App.init().then(function() {
        Vote.init();
    });
});

const Vote = {
    init: async function() {
        try {
            if (!App.userType || App.userType === 'guest') {
                App.userType = await App.checkUserType(App.account);
            }
            App.renderNavbar('Vote');
            await this.loadElectionInfo();
        } catch (error) {
            console.error("Error initializing vote page:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    loadElectionInfo: async function() {
        try {
            $('#contractAddress').text(App.contractAddress);

            const votersCount = await App.election.getVotersCount();
            $('#totalVoters').text(votersCount.toString());

            const candidatesCount = await App.election.getCandidateCount();
            $('#totalCandidates').text(candidatesCount.toString());

            try {
                const votingTime = await App.election.getElectionTime();
                let startTime, endTime;

                if (Array.isArray(votingTime) && votingTime.length === 2) {
                    [startTime, endTime] = votingTime.map(time => time.toNumber());
                } else if (typeof votingTime === 'object') {
                    startTime = (votingTime.start || votingTime[0]).toNumber();
                    endTime = (votingTime.end || votingTime[1]).toNumber();
                } else {
                    throw new Error("Unexpected voting time format");
                }

                const currentTime = Math.floor(Date.now() / 1000);

                if (startTime === 0 && endTime === 0) {
                    $('#votingStatus').text("Not initialized");
                    $('#votingStartTime').text("Not set");
                    $('#votingEndTime').text("Not set");
                } else if (currentTime < startTime) {
                    $('#votingStatus').text("Not started");
                    $('#votingStartTime').text(new Date(startTime * 1000).toLocaleString());
                    $('#votingEndTime').text(new Date(endTime * 1000).toLocaleString());
                } else if (currentTime >= startTime && currentTime <= endTime) {
                    $('#votingStatus').text("In progress");
                    $('#votingStartTime').text(new Date(startTime * 1000).toLocaleString());
                    $('#votingEndTime').text(new Date(endTime * 1000).toLocaleString());
                } else {
                    $('#votingStatus').text("Ended");
                    $('#votingStartTime').text(new Date(startTime * 1000).toLocaleString());
                    $('#votingEndTime').text(new Date(endTime * 1000).toLocaleString());
                }
            } catch (error) {
                console.error("Error getting voting time:", error);
                $('#votingStatus').text("Not initialized");
                $('#votingStartTime').text("Not set");
                $('#votingEndTime').text("Not set");
            }

            $('#accountAddress').text("Your Account: " + App.account);
        } catch (error) {
            console.error("Error loading election info:", error);
            throw error;
        }
    }
};