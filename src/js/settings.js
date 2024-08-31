$(document).ready(function() {
    App.init().then(function() {
        Settings.init();
    });
});

const Settings = {
    init: async function() {
        try {
            await this.loadCurrentVotingTime();
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing settings page:", error);
            App.showError("Failed to load settings. Please try again later.");
        }
    },

    bindEvents: function() {
        $(document).on('submit', '#setVotingTimeForm', this.setVotingTime);
    },

    loadCurrentVotingTime: async function() {
        try {
            const votingTime = await App.election.getVotingTime();
            let startTime, endTime;

            if (Array.isArray(votingTime) && votingTime.length === 2) {
                [startTime, endTime] = votingTime.map(time => time.toNumber());
            } else if (typeof votingTime === 'object') {
                startTime = (votingTime.start || votingTime[0]).toNumber();
                endTime = (votingTime.end || votingTime[1]).toNumber();
            } else {
                throw new Error("Unexpected voting time format");
            }

            if (startTime === 0 && endTime === 0) {
                $('#currentStartTime').text("Current Start Time: Not set");
                $('#currentEndTime').text("Current End Time: Not set");
            } else {
                $('#currentStartTime').text(`Current Start Time: ${new Date(startTime * 1000).toLocaleString()}`);
                $('#currentEndTime').text(`Current End Time: ${new Date(endTime * 1000).toLocaleString()}`);
            }
        } catch (error) {
            console.error("Error loading current voting time:", error);
            $('#currentStartTime').text("Error loading start time");
            $('#currentEndTime').text("Error loading end time");
        }
    },

    setVotingTime: async function(event) {
        event.preventDefault();

        const startTime = Math.floor(new Date($('#votingStartTime').val()).getTime() / 1000);
        const endTime = Math.floor(new Date($('#votingEndTime').val()).getTime() / 1000);

        if (startTime >= endTime) {
            App.showError("End time must be after start time");
            return;
        }

        if (startTime <= Date.now() / 1000) {
            App.showError("Start time must be in the future");
            return;
        }

        try {
            await App.election.setVotingTime(startTime, endTime, { from: App.account });
            alert("Voting time set successfully");
            location.reload();
        } catch (error) {
            console.error("Error setting voting time:", error);
            App.showError("Error setting voting time. Check console for details.");
        }
    }
};