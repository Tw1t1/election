$(document).ready(function() {
    App.init().then(function() {
        Admin.init();
    });
});

const Admin = {
    init: async function() {
        try {
            if (!App.userType || App.userType === 'guest') {
                App.userType = await App.checkUserType(App.account);
            }
            App.renderNavbar('Admin');
            await this.loadElectionInfo();
            this.showSection('electionTime');
        } catch (error) {
            console.error("Error initializing admin page:", error);
            App.showError("Failed to load election information. Please try again later.");
        }
    },

    showSection: function(section) {
        $('#electionTimeSection, #candidatesSection, #votersSection').hide();
        $(`#${section}Section`).show();
        if (section === 'electionTime') {
            this.loadElectionTime();
        } else if (section === 'candidates') {
            this.loadCandidates();
        } else if (section === 'voters') {
            this.loadVoters();
        }
    },

    loadElectionInfo: async function() {
        try {
            $('#accountAddress').text("Your Account: " + App.account);
        } catch (error) {
            console.error("Error loading election info:", error);
            throw error;
        }
    },

    loadElectionTime: async function() {
        try {
            const votingTime = await App.election.getElectionTime();
            let startTime = new Date(votingTime[0].toNumber() * 1000);
            let endTime = new Date(votingTime[1].toNumber() * 1000);
            let currentTime = new Date();

            let timeInfo = '';
            if (votingTime[0].toNumber() == 0 && votingTime[1].toNumber() == 0) {
                timeInfo = "Election time not set.";
                $('#setElectionTimeForm').show();
            } else if (currentTime < startTime) {
                timeInfo = `Election starts on ${startTime.toLocaleString()} and ends on ${endTime.toLocaleString()}`;
                $('#setElectionTimeForm').show();
            } else if (currentTime >= startTime && currentTime <= endTime) {
                timeInfo = `Election is in progress. It started on ${startTime.toLocaleString()} and ends on ${endTime.toLocaleString()}`;
                $('#setElectionTimeForm').hide();
            } else {
                timeInfo = `Election has ended. It started on ${startTime.toLocaleString()} and ended on ${endTime.toLocaleString()}`;
                $('#setElectionTimeForm').hide();
            }

            $('#currentElectionTime').html(`<p>${timeInfo}</p>`);
        } catch (error) {
            console.error("Error loading election time:", error);
            App.showError("Failed to load election time. Please try again later.");
        }
    },

    setElectionTime: async function(event) {
        event.preventDefault();
        const startTime = Math.floor(new Date($('#startTime').val()).getTime() / 1000);
        const endTime = Math.floor(new Date($('#endTime').val()).getTime() / 1000);
        
        try {
            await App.election.setElectionTime(startTime, endTime, { from: App.account });
            App.showSuccess("Election time set successfully.");
            this.loadElectionTime();
        } catch (error) {
            console.error("Error setting election time:", error);
            App.showError("Failed to set election time. Please try again.");
        }
    },

    loadCandidates: async function() {
        try {
            const candidateCount = await App.election.getCandidateCount();
            let approvedHtml = '<ul class="list-group">';
            let applicationsHtml = '<ul class="list-group">';
            let approvedCount = 0;
            let applicationCount = 0;

            for (let i = 0; i < candidateCount; i++) {
                const candidateAddress = await App.election.candidateAddresses(i);
                const candidate = await App.election.candidates(candidateAddress);

                if (candidate.approved) {
                    approvedHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${candidate.name} (${candidate.party})
                            <button class="btn btn-danger btn-sm" onclick="Admin.removeCandidate('${candidateAddress}')">Remove</button>
                        </li>`;
                    approvedCount++;
                } else {
                    applicationsHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${candidate.name} (${candidate.party})
                            <button class="btn btn-success btn-sm" onclick="Admin.approveCandidate('${candidateAddress}')">Approve</button>
                        </li>`;
                    applicationCount++;
                }
            }

            approvedHtml += '</ul>';
            applicationsHtml += '</ul>';

            $('#approvedCandidates').html(`<p>Total: ${approvedCount}</p>${approvedHtml}`);
            $('#candidateApplications').html(`<p>Total: ${applicationCount}</p>${applicationsHtml}`);
        } catch (error) {
            console.error("Error loading candidates:", error);
            App.showError("Failed to load candidates. Please try again later.");
        }
    },

    loadVoters: async function() {
        try {
            const votersCount = await App.election.getVotersCount();
            let approvedHtml = '<ul class="list-group">';
            let applicationsHtml = '<ul class="list-group">';
            let approvedCount = 0;
            let applicationCount = 0;

            // This is a simplified version. In a real-world scenario, you'd need to implement pagination or other methods to handle a large number of voters efficiently.
            for (let i = 0; i < votersCount; i++) {
                const voterHash = await App.election.voterList(i);
                const voter = await App.election.voters(voterHash);

                if (voter.approved) {
                    approvedHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${voterHash}
                            <button class="btn btn-danger btn-sm" onclick="Admin.removeVoter('${voterHash}')">Remove</button>
                        </li>`;
                    approvedCount++;
                } else {
                    applicationsHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${voterHash}
                            <button class="btn btn-success btn-sm" onclick="Admin.approveVoter('${voterHash}')">Approve</button>
                        </li>`;
                    applicationCount++;
                }
            }

            approvedHtml += '</ul>';
            applicationsHtml += '</ul>';

            $('#approvedVoters').html(`<p>Total: ${approvedCount}</p>${approvedHtml}`);
            $('#voterApplications').html(`<p>Total: ${applicationCount}</p>${applicationsHtml}`);
        } catch (error) {
            console.error("Error loading voters:", error);
            App.showError("Failed to load voters. Please try again later.");
        }
    },

    removeCandidate: async function(candidateAddress) {
        try {
            await App.election.removeCandidate(candidateAddress, { from: App.account });
            App.showSuccess("Candidate removed successfully.");
            this.loadCandidates();
        } catch (error) {
            console.error("Error removing candidate:", error);
            App.showError("Failed to remove candidate. Please try again.");
        }
    },

    approveCandidate: async function(candidateAddress) {
        try {
            await App.election.approveCandidate(candidateAddress, { from: App.account });
            App.showSuccess("Candidate approved successfully.");
            this.loadCandidates();
        } catch (error) {
            console.error("Error approving candidate:", error);
            App.showError("Failed to approve candidate. Please try again.");
        }
    },

    removeVoter: async function(voterHash) {
        try {
            await App.election.removeVoter(voterHash, { from: App.account });
            App.showSuccess("Voter removed successfully.");
            this.loadVoters();
        } catch (error) {
            console.error("Error removing voter:", error);
            App.showError("Failed to remove voter. Please try again.");
        }
    },

    approveVoter: async function(voterHash) {
        try {
            await App.election.approveVoter(voterHash, { from: App.account });
            App.showSuccess("Voter approved successfully.");
            this.loadVoters();
        } catch (error) {
            console.error("Error approving voter:", error);
            App.showError("Failed to approve voter. Please try again.");
        }
    }
};