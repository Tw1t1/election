$(document).ready(function() {
    App.init().then(function() {
        Results.init();
    });
});

const Results = {
    init: async function() {
        try {
            await this.loadResults();
        } catch (error) {
            console.error("Error initializing results page:", error);
            App.showError("Failed to load results. Please try again later.");
        }
    },

    loadResults: async function() {
        const resultsList = $('#resultsList');
        resultsList.empty();

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

            const currentTime = Math.floor(Date.now() / 1000);

            if (startTime === 0 && endTime === 0) {
                resultsList.append("<p>Voting times have not been set yet.</p>");
                return;
            }

            if (currentTime < startTime) {
                resultsList.append("<p>Voting has not started yet.</p>");
                return;
            }

            if (currentTime < endTime) {
                resultsList.append("<p>Voting is still in progress. Results will be available after the voting period ends.</p>");
                return;
            }

            const [candidates, voteCounts] = await App.election.getResults();
            
            if (candidates.length === 0) {
                resultsList.append("<p>No candidates have been added yet.</p>");
                return;
            }

            for (let i = 0; i < candidates.length; i++) {
                const candidate = await App.election.candidates(candidates[i]);
                const resultTemplate = `
                    <div>
                        <h3>${candidate.name} (${candidate.party})</h3>
                        <p>Votes: ${voteCounts[i]}</p>
                    </div>
                `;
                resultsList.append(resultTemplate);
            }

            const winner = await App.election.getWinner();
            const winningCandidate = await App.election.candidates(winner);
            resultsList.append(`<h2>Winner: ${winningCandidate.name} (${winningCandidate.party})</h2>`);

        } catch (error) {
            console.error("Error loading results:", error);
            resultsList.append("<p>Error loading results. Please try again later.</p>");
        }
    }
};