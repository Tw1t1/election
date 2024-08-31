$(document).ready(function() {
    App.init().then(function() {
        Candidates.init();
    });
});

const Candidates = {
    init: async function() {
        try {
            await this.loadCandidates();
            this.bindEvents();
            await this.loadQuestions();
        } catch (error) {
            console.error("Error initializing candidates page:", error);
            App.showError("Failed to load candidates. Please try again later.");
        }
    },

    bindEvents: function() {
        $(document).on('submit', '#addCandidateForm', this.addCandidate);
    },

    loadCandidates: async function() {
        const candidateCount = await App.election.getCandidateCount();
        const candidateList = $('#candidateList');
        candidateList.empty();

        if (candidateCount == 0) {
            candidateList.append('<p>No candidates have been added yet.</p>');
            return;
        }

        for (let i = 0; i < candidateCount; i++) {
            try {
                const candidateAddress = await App.election.candidateAddresses(i);
                if (candidateAddress === '0x0000000000000000000000000000000000000000') {
                    continue; // Skip invalid addresses
                }
                const candidate = await App.election.candidates(candidateAddress);
                const candidateTemplate = `<div>
                    <p>Address: ${candidate.id}</p>
                    <p>Name: ${candidate.name}</p>
                    <p>Party: ${candidate.party}</p>
                    <p>Votes: ${candidate.voteCount}</p>
                </div>`;
                candidateList.append(candidateTemplate);
            } catch (error) {
                console.error(`Error loading candidate at index ${i}:`, error);
                // Continue to the next candidate
            }
        }
    },

    loadQuestions: async function() {
        try {
            const questionCount = await App.election.getQuestionCount();
            const questionsContainer = $('#questionsContainer');
            questionsContainer.empty();

            for (let i = 0; i < questionCount; i++) {
                const question = await App.election.getQuestion(i);
                const answerOptionsCount = await App.election.getAnswerOptionsCount(i);
                let answerOptions = [];

                for (let j = 0; j < answerOptionsCount; j++) {
                    const option = await App.election.getAnswerOption(i, j);
                    answerOptions.push(option);
                }

                const questionTemplate = `
                    <div class="form-group">
                        <label for="question${i}">${question}</label>
                        <select class="form-control" id="question${i}" name="question${i}" required>
                            <option value="">Select an answer</option>
                            ${answerOptions.map((option, index) => `<option value="${index}">${option}</option>`).join('')}
                        </select>
                    </div>
                `;
                questionsContainer.append(questionTemplate);
            }
        } catch (error) {
            console.error("Error loading questions:", error);
            App.showError("Failed to load questions. Please try again later.");
        }
    },

    addCandidate: async function(event) {
        event.preventDefault();

        const candidateAddress = $('#candidateAddress').val();
        const candidateName = $('#candidateName').val();
        const candidateParty = $('#candidateParty').val();

        if (!web3.utils.isAddress(candidateAddress)) {
            App.showError("Invalid Ethereum address");
            return;
        }

        if (candidateName.trim() === '' || candidateParty.trim() === '') {
            App.showError("Name and party cannot be empty");
            return;
        }

        const opinions = [];
        $('.form-control[id^="question"]').each(function() {
            opinions.push(parseInt($(this).val()));
        });

        if (opinions.some(isNaN)) {
            App.showError("Please answer all questions");
            return;
        }

        try {
            await App.election.addCandidate(candidateAddress, candidateName, candidateParty, opinions, { from: App.account });
            alert("Candidate added successfully");
            location.reload();
        } catch (error) {
            console.error("Error adding candidate:", error);
            App.showError("Error adding candidate. Check console for details.");
        }
    }
};