$(document).ready(function() {
    App.init().then(function() {
        Application.init();
    });
});

const Application = {
    init: async function() {
        await this.checkApplicationStatus();
        this.bindEvents();
        App.renderNavbar('Application');
        await this.loadQuestions();
    },

    bindEvents: function() {
        $('#candidateForm').on('submit', this.applyAsCandidate);
        $('#applyAsVoter').on('click', this.applyAsVoter);
    },

    checkApplicationStatus: async function() {
        const isCandidateApplied = await App.election.candidateApplications(App.account);
        const isVoterApplied = await App.election.voterApplications(web3.utils.keccak256(App.account));
        const candidate = await App.election.candidates(App.account);
        const voter = await App.election.voters(web3.utils.keccak256(App.account));
    
        if (candidate.approved) {
            $('#candidateApplication').hide();
            $('#applicationStatus').show();
            $('#statusMessage').text('You are an approved candidate.');
        } else if (isCandidateApplied) {
            $('#candidateApplication').hide();
            $('#applicationStatus').show();
            $('#statusMessage').text('Your candidate application is pending approval.');
        }
    
        if (voter.approved) {
            $('#voterApplication').hide();
            if (!$('#applicationStatus').is(':visible')) {
                $('#applicationStatus').show();
                $('#statusMessage').text('You are an approved voter.');
            }
        } else if (isVoterApplied) {
            $('#voterApplication').hide();
            if (!$('#applicationStatus').is(':visible')) {
                $('#applicationStatus').show();
                $('#statusMessage').text('Your voter application is pending approval.');
            }
        }
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