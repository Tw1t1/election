$(document).ready(function() {
    App.init().then(function() {
        App.checkPageAccess();
        App.refreshNavbar();
        Admin.init();
    });
});

const Admin = {
    init: async function() {
        await this.checkAdminStatus();
        this.bindEvents();
        await this.loadElectionTime();
        await this.loadCandidates();
        await this.loadVoters();
    },

    bindEvents: function() {
        $('#setElectionTimeForm').on('submit', this.setElectionTime);
        $(document).on('click', '.approveCandidate', this.approveCandidate);
        $(document).on('click', '.rejectCandidate', this.rejectCandidate);
        $(document).on('click', '.removeCandidate', this.removeCandidate);
        $(document).on('click', '.approveVoter', this.approveVoter);
        $(document).on('click', '.rejectVoter', this.rejectVoter);
        $(document).on('click', '.removeVoter', this.removeVoter);
    },

    checkAdminStatus: async function() {
        const owner = await App.election.owner();
        if (App.account.toLowerCase() !== owner.toLowerCase()) {
            window.location.href = 'home.html';
        }
    },

    loadElectionTime: async function() {
        const electionTime = await App.getElectionTime();
        const electionStatus = await App.getElectionStatus();
        
        if (electionStatus === "Not set") {
            $('#currentElectionTime').html('<p>Election time has not been set yet.</p>');
            $('#electionTimeFormContainer').show();
        } else {
            $('#currentElectionTime').html(`
                <p><strong>Current Start Time:</strong> ${new Date(electionTime.start).toLocaleString()}</p>
                <p><strong>Current End Time:</strong> ${new Date(electionTime.end).toLocaleString()}</p>
            `);
        }
    
        if (electionStatus !== "Not set" && electionStatus !== "Not started") {
            $('#currentElectionTime').append('<p class="text-danger">Election has already started or ended. Time cannot be changed.</p>');
        } else {
            $('#electionTimeFormContainer').show();
            
            // Set minimum date for start time to be current date and time
            const now = new Date();
            const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
            const minDateTime = localNow.toISOString().slice(0, 16);
            $('#startTime').attr('min', minDateTime);
            $('#startTime').val(minDateTime);
    
            // Set minimum date for end time to be start time
            $('#startTime').on('change', function() {
                const selectedStart = new Date($(this).val());
                const minEndDateTime = new Date(selectedStart.getTime() + 60000); // Add 1 minute to start time
                const localMinEndDateTime = new Date(minEndDateTime.getTime() - minEndDateTime.getTimezoneOffset() * 60000);
                $('#endTime').attr('min', localMinEndDateTime.toISOString().slice(0, 16));
                $('#endTime').val(localMinEndDateTime.toISOString().slice(0, 16));
            });
    
            // Trigger change event to set initial end time
            $('#startTime').trigger('change');
        }
    },
    
    setElectionTime: async function(e) {
        e.preventDefault();
        App.setLoading(true);
        try {
            const startTime = Math.floor(new Date($('#startTime').val()).getTime() / 1000);
            const endTime = Math.floor(new Date($('#endTime').val()).getTime() / 1000);
            const now = Math.floor(Date.now() / 1000);
    
            if (startTime <= now) {
                throw new Error("Start time must be in the future.");
            }
            if (endTime <= startTime) {
                throw new Error("End time must be after start time.");
            }
    
            await App.election.setElectionTime(startTime, endTime, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error setting election time:', error);
            App.showError(error.message || 'Failed to set election time. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    loadCandidates: async function() {
        const approvedCandidates = await App.election.getCandidateAddresses();
        const candidateApplications = await App.election.getCandidateApplicationsAddresses();
        const electionStatus = await App.getElectionStatus();
    
        $('#approvedCandidatesList').empty();
        for (let address of approvedCandidates) {
            const candidate = await App.election.candidates(address);
            const removeButton = electionStatus === "Not started" || electionStatus === "Not set" ? 
                `<button class="btn btn-sm btn-danger removeCandidate" data-address="${address}">Remove</button>` : '';
            $('#approvedCandidatesList').append(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${candidate.name} (${candidate.party}) - ${address}
                    ${removeButton}
                </li>
            `);
        }
    
        $('#candidateApplicationsList').empty();
        if (electionStatus === "Not started" || electionStatus === "Not set") {
            for (let address of candidateApplications) {
                const candidate = await App.election.candidates(address);
                $('#candidateApplicationsList').append(`
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${candidate.name} (${candidate.party}) - ${address}
                        <div>
                            <button class="btn btn-sm btn-success approveCandidate" data-address="${address}">Approve</button>
                            <button class="btn btn-sm btn-danger rejectCandidate" data-address="${address}">Reject</button>
                        </div>
                    </li>
                `);
            }
        } else {
            $('#candidateApplicationsList').append('<li class="list-group-item">Candidate applications are closed.</li>');
        }
    },

    loadVoters: async function() {
        const approvedVoters = await App.election.getVoterAddresses();
        const voterApplications = await App.election.getVoterApplicationsAddresses();
        const electionStatus = await App.getElectionStatus();
    
        $('#approvedVotersList').empty();
        for (let hashedAddress of approvedVoters) {
            const removeButton = electionStatus === "Not started" || electionStatus === "Not set" ? 
                `<button class="btn btn-sm btn-danger removeVoter" data-address="${hashedAddress}">Remove</button>` : '';
            $('#approvedVotersList').append(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${hashedAddress}
                    ${removeButton}
                </li>
            `);
        }
    
        $('#voterApplicationsList').empty();
        if (electionStatus === "Not started" || electionStatus === "Not set") {
            for (let hashedAddress of voterApplications) {
                $('#voterApplicationsList').append(`
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${hashedAddress}
                        <div>
                            <button class="btn btn-sm btn-success approveVoter" data-address="${hashedAddress}">Approve</button>
                            <button class="btn btn-sm btn-danger rejectVoter" data-address="${hashedAddress}">Reject</button>
                        </div>
                    </li>
                `);
            }
        } else {
            $('#voterApplicationsList').append('<li class="list-group-item">Voter applications are closed.</li>');
        }
    },

    approveCandidate: async function() {
        const address = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.approveCandidate(address, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error approving candidate:', error);
            App.showError('Failed to approve candidate. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    rejectCandidate: async function() {
        const address = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.rejectCandidate(address, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            App.showError('Failed to reject candidate. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    removeCandidate: async function() {
        const address = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.removeCandidate(address, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error removing candidate:', error);
            App.showError('Failed to remove candidate. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    approveVoter: async function() {
        const hashedAddress = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.approveVoter(hashedAddress, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error approving voter:', error);
            App.showError('Failed to approve voter. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    rejectVoter: async function() {
        const hashedAddress = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.rejectVoter(hashedAddress, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error rejecting voter:', error);
            App.showError('Failed to reject voter. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    removeVoter: async function() {
        const hashedAddress = $(this).data('address');
        App.setLoading(true);
        try {
            await App.election.removeVoter(hashedAddress, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error removing voter:', error);
            App.showError('Failed to remove voter. Please try again.');
        } finally {
            App.setLoading(false);
        }
    }
};