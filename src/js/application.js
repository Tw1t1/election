$(document).ready(function() {
    App.init().then(function() {
        App.checkPageAccess();
        App.refreshNavbar();
        Application.init();
    });
});

const Application = {
    init: async function() {
        await this.checkApplicationStatus();
        this.bindEvents();
        await this.loadQuestions();
    },

    bindEvents: function() {
        $('#candidateForm').on('submit', this.applyAsCandidate);
        $('#applyAsVoter').on('click', this.applyAsVoter);
        $('#showCandidateApplication').on('click', this.showCandidateApplication);
        $('#showVoterApplication').on('click', this.showVoterApplication);
    },

    checkApplicationStatus: async function() {
        const isCandidateApproved = await App.election.candidates(App.account);        
        const isVoterApproved = await App.election.voters(web3.utils.keccak256(App.account));        
        const isCandidateApplied = await App.election.candidateApplications(App.account);        
        const isVoterApplied = await App.election.voterApplications(web3.utils.keccak256(App.account));
        const electionStarted = (await App.getElectionTime()).start;
    
        const statusCode = (isCandidateApproved.approved ? 1 : 0) << 3 | 
                            (isVoterApproved.approved ? 1 : 0) << 2 | 
                            (isCandidateApplied ? 1 : 0) << 1 | 
                            (isVoterApplied ? 1 : 0);
        
        let message = '';
        let showCandidateOption = true;
        let showVoterOption = true;

        if (electionStarted != 0 && electionStarted < Date.now()) {
            message = 'The election has started. New applications are no longer accepted.';
            showCandidateOption = false;
            showVoterOption = false;
        } else {
            switch (statusCode) {
                case 0b1000: // Candidate approved, not voter
                    message = 'You are an approved candidate. You can still apply to be a voter.';
                    showCandidateOption = false;
                    break;
                case 0b0100: // Voter approved
                    message = 'You are an approved voter. You can still apply to be a candidate.';
                    showVoterOption = false;
                    break;
                case 0b1100: // Both approved
                    message = 'You are both an approved candidate and voter.';
                    showCandidateOption = false;
                    showVoterOption = false;
                    break;
                case 0b0010: // Candidate application pending
                    message = 'Your candidate application is pending approval.';
                    showCandidateOption = false;
                    showVoterOption = false;
                    break;
                case 0b0001: // Voter application pending
                    message = 'Your voter application is pending approval. You can still apply to be a candidate.';
                    showVoterOption = false;
                    break;
                case 0b0011: // Both applications pending
                    message = 'Your applications for both candidate and voter are pending approval.';
                    showCandidateOption = false;
                    showVoterOption = false;
                    break;
                case 0b0110: // Voter approved, candidate application pending
                    message = 'You are an approved voter, and your candidate application is pending approval.';
                    showCandidateOption = false;
                    showVoterOption = false;
                    break;
                case 0b1001: // Candidate approved, voter application pending
                    message = 'You are an approved candidate, and your voter application is pending approval.';
                    showCandidateOption = false;
                    showVoterOption = false;
                    break;
                default:
                    message = 'You can apply to be a candidate or a voter.';
            }
        }
    
        $('#statusMessage').text(message);
        
        if (showCandidateOption) {
            $('#showCandidateApplication').show();
        } else {
            $('#showCandidateApplication').hide();
        }
    
        if (showVoterOption) {
            $('#showVoterApplication').show();
        } else {
            $('#showVoterApplication').hide();
        }

        if (showCandidateOption || showVoterOption) {
            $('#applicationOptions').show();
        }
    },

    showCandidateApplication: function() {
        $('#candidateApplication').show();
        $('#voterApplication').hide();
    },

    showVoterApplication: function() {
        $('#candidateApplication').hide();
        $('#voterApplication').show();
    },

    loadQuestions: async function() {
        const questions = await App.election.getQuestions();
        const container = $('#candidateQuestions');
        container.empty();
        for (let i = 0; i < questions.length; i++) {
            const answerOptions = await App.election.getAnswerOptions(i);
            let optionsHtml = '';
            for (let j = 0; j < answerOptions.length; j++) {
                optionsHtml += `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question${i}" id="q${i}a${j}" value="${j}" required>
                        <label class="form-check-label" for="q${i}a${j}">${answerOptions[j]}</label>
                    </div>
                `;
            }
            container.append(`
                <div class="form-group">
                    <label>${questions[i]}</label>
                    ${optionsHtml}
                </div>
            `);
        }
    },

    applyAsCandidate: async function(e) {
        e.preventDefault();
        App.setLoading(true);
        try {
            const name = $('#candidateName').val();
            const party = $('#candidateParty').val();
            const opinions = [];
            $('#candidateQuestions input:checked').each(function() {
                opinions.push(parseInt($(this).val()));
            });
            await App.election.applyForCandidate(name, party, opinions, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error applying as candidate:', error);
            App.showError('Failed to submit candidate application. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    applyAsVoter: async function() {
        App.setLoading(true);
        try {
            await App.election.applyForVoter({ from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error applying as voter:', error);
            App.showError('Failed to submit voter application. Please try again.');
        } finally {
            App.setLoading(false);
        }
    }
};