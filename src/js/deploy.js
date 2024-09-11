$(document).ready(function() {
    App.init().then(function() {
        Deploy.init();
    });
});

const Deploy = {
    init: function() {
        this.bindEvents();
        App.renderNavbar('Deploy');
        this.addInitialQuestions();
    },

    bindEvents: function() {
        $('#addQuestion').on('click', this.addQuestion);
        $(document).on('click', '.addAnswerOption', this.addAnswerOption);
        $(document).on('click', '.removeQuestion', this.removeQuestion);
        $(document).on('click', '.removeAnswerOption', this.removeAnswerOption);
        $('#deployForm').on('submit', this.handleDeploy);
    },

    addInitialQuestions: function() {
        for (let i = 0; i < 3; i++) {
            this.addQuestion();
        }
    },

    addQuestion: function() {
        const questionCount = $('#questionsContainer .question-group').length + 1;
        const newQuestion = `
            <div class="question-group mb-4">
                <div class="form-group">
                    <label for="question${questionCount}">Question ${questionCount}</label>
                    <div class="input-group">
                        <input type="text" class="form-control" name="questions[]" required>
                        <div class="input-group-append">
                            <button type="button" class="btn btn-danger removeQuestion">Remove</button>
                        </div>
                    </div>
                </div>
                <div class="answerOptions">
                    <div class="input-group mb-2">
                        <input type="text" class="form-control" name="answerOptions${questionCount}[]" placeholder="Answer option 1" required>
                        <div class="input-group-append">
                            <button type="button" class="btn btn-danger removeAnswerOption" disabled>Remove</button>
                        </div>
                    </div>
                    <div class="input-group mb-2">
                        <input type="text" class="form-control" name="answerOptions${questionCount}[]" placeholder="Answer option 2" required>
                        <div class="input-group-append">
                            <button type="button" class="btn btn-danger removeAnswerOption" disabled>Remove</button>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary addAnswerOption">Add Answer Option</button>
            </div>
        `;
        $('#questionsContainer').append(newQuestion);
        Deploy.updateRemoveButtons();
    },

    addAnswerOption: function() {
        const answerOptionsContainer = $(this).siblings('.answerOptions');
        const optionCount = answerOptionsContainer.children().length + 1;
        const questionIndex = $(this).closest('.question-group').index() + 1;
        const newOption = `
            <div class="input-group mb-2">
                <input type="text" class="form-control" name="answerOptions${questionIndex}[]" placeholder="Answer option ${optionCount}" required>
                <div class="input-group-append">
                    <button type="button" class="btn btn-danger removeAnswerOption">Remove</button>
                </div>
            </div>
        `;
        answerOptionsContainer.append(newOption);
        Deploy.updateRemoveButtons();
    },

    removeQuestion: function() {
        $(this).closest('.question-group').remove();
        Deploy.renumberQuestions();
        Deploy.updateRemoveButtons();
    },

    removeAnswerOption: function() {
        $(this).closest('.input-group').remove();
        Deploy.updateRemoveButtons();
    },

    renumberQuestions: function() {
        $('#questionsContainer .question-group').each(function(index) {
            const questionNumber = index + 1;
            $(this).find('label').text(`Question ${questionNumber}`);
            $(this).find('.answerOptions .input-group input').attr('name', `answerOptions${questionNumber}[]`);
        });
    },

    updateRemoveButtons: function() {
        const questionCount = $('#questionsContainer .question-group').length;
        $('.removeQuestion').prop('disabled', questionCount <= 3);

        $('.answerOptions').each(function() {
            const answerCount = $(this).children().length;
            $(this).find('.removeAnswerOption').prop('disabled', answerCount <= 2);
        });

        $('#addQuestion').prop('disabled', questionCount >= 10);
    },

    handleDeploy: async function(e) {
        e.preventDefault();
        App.setLoading(true);

        const electionName = $('#electionName').val().trim();
        if (!electionName) {
            App.showError('Election name cannot be empty or contain only whitespace.');
            App.setLoading(false);
            return;
        }

        const questions = [];
        const answerOptions = [];

        $('#questionsContainer .question-group').each(function(index) {
            const questionText = $(this).find('input[name="questions[]"]').val().trim();
            const questionAnswers = $(this).find(`.answerOptions input[name="answerOptions${index + 1}[]"]`)
                .map(function() { return $(this).val().trim(); }).get();

            if (questionText && questionAnswers.length >= 2) {
                questions.push(questionText);
                answerOptions.push(questionAnswers);
            }
        });

        if (questions.length < 3) {
            App.showError('You must have at least 3 valid questions with 2 or more answer options each.');
            App.setLoading(false);
            return;
        }

        try {
            const election = await App.contracts.Election.new(
                electionName,
                questions,
                answerOptions,
                { from: App.account }
            );

            console.log('Contract deployed at:', election.address);
            localStorage.setItem('electionContractAddress', election.address);
            App.contractAddress = election.address;
            App.election = election;

            window.location.href = 'home.html';
        } catch (error) {
            console.error('Error deploying contract:', error);
            App.showError('Failed to deploy the contract. Please try again.');
        } finally {
            App.setLoading(false);
        }
    }
};