$(document).ready(function() {
    App.init().then(function() {
        Vote.init();
    });
});

const Vote = {
    hasVoted: false,
    votedFor: null,

    init: async function() {
        App.renderNavbar('Vote');
        const electionStatus = await App.getElectionStatus();
        if (electionStatus !== "In progress") {
            $('#content').html('<p>Voting is not currently available. Election status: ' + electionStatus + '</p>');
            return;
        }
        await this.checkVotingStatus();
        this.bindEvents();
        if (!this.hasVoted) {
            await this.loadCandidates();
            await this.loadQuestions();
        }
    },

    bindEvents: function() {
        $('input[name="votingOption"]').on('change', this.toggleVotingSection);
        $('#voteCandidateBtn').on('click', this.voteForCandidate);
        $('#voteOpinionBtn').on('click', this.voteByOpinion);
    },

    checkVotingStatus: async function() {
        const voter = await App.election.voters(web3.utils.keccak256(App.account));
        this.hasVoted = voter.hasVoted;
        if (this.hasVoted) {
            this.votedFor = voter.votedFor;
            $('#alreadyVotedSection').show();
            if (this.votedFor !== '0x0000000000000000000000000000000000000000') {
                const candidate = await App.election.candidates(this.votedFor);
                $('#votedForCandidate').text(candidate.name);
                $('#votedForSection').show();
            }
            $('#votingOptions, #candidateVotingSection, #opinionVotingSection').hide();
        }
    },

    toggleVotingSection: function() {
        const selectedOption = $('input[name="votingOption"]:checked').val();
        if (selectedOption === 'candidate') {
            $('#candidateVotingSection').show();
            $('#opinionVotingSection').hide();
        } else {
            $('#candidateVotingSection').hide();
            $('#opinionVotingSection').show();
        }
    },

    loadCandidates: async function() {
        const candidateAddresses = await App.election.getCandidateAddresses();
        const select = $('#candidateSelect');
        select.empty();
        for (let address of candidateAddresses) {
            const candidate = await App.election.candidates(address);
            if (candidate.approved) {
                select.append(`<option value="${address}">${candidate.name} (${candidate.party})</option>`);
            }
        }
    },

    loadQuestions: async function() {
        const questions = await App.election.getQuestions();
        const form = $('#opinionForm');
        form.empty();
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
            form.append(`
                <div class="form-group">
                    <label>${questions[i]}</label>
                    ${optionsHtml}
                </div>
            `);
        }
    },

    voteForCandidate: async function() {
        App.setLoading(true);
        try {
            const candidateAddress = $('#candidateSelect').val();
            await App.election.vote(candidateAddress, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error voting for candidate:', error);
            App.showError('Failed to cast your vote. Please try again.');
        } finally {
            App.setLoading(false);
        }
    },

    voteByOpinion: async function() {
        App.setLoading(true);
        try {
            const form = $('#opinionForm');
            const opinions = [];
            form.find('input:checked').each(function() {
                opinions.push(parseInt($(this).val()));
            });
            await App.election.voteByOpinion(opinions, { from: App.account });
            location.reload();
        } catch (error) {
            console.error('Error voting by opinion:', error);
            App.showError('Failed to cast your vote. Please try again.');
        } finally {
            App.setLoading(false);
        }
    }
};