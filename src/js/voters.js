$(document).ready(function() {
    App.init().then(function() {
        Voters.init();
    });
});

const Voters = {
    init: async function() {
        try {
            await this.loadVoters();
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing voters page:", error);
            App.showError("Failed to load voters. Please try again later.");
        }
    },

    bindEvents: function() {
        $(document).on('submit', '#addVoterForm', this.addVoter);
    },

    loadVoters: async function() {
        try {
            const voterCount = await App.election.getVotersCount();
            const voterList = $('#voterList');
            voterList.empty();

            voterList.append(`<p>Total Voters: ${voterCount}</p>`);
            // Note: We can't list all voters due to privacy concerns and gas limitations
        } catch (error) {
            console.error("Error loading voters:", error);
            App.showError("Failed to load voter count. Please try again later.");
        }
    },

    addVoter: async function(event) {
        event.preventDefault();

        const voterAddress = $('#voterAddress').val();

        if (!web3.utils.isAddress(voterAddress)) {
            App.showError("Invalid Ethereum address");
            return;
        }

        try {
            await App.election.addVoter(voterAddress, { from: App.account });
            alert("Voter added successfully");
            location.reload();
        } catch (error) {
            console.error("Error adding voter:", error);
            App.showError("Error adding voter. Check console for details.");
        }
    }
};