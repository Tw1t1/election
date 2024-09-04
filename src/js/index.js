$(document).ready(function() {
    App.init().then(function() {
        Index.init();
    });
});

const Index = {
    init: function() {
        this.bindEvents();
        for (let i = 0; i < 3; i++) {
            this.addQuestion();
        }
    },

    bindEvents: function() {
        $(document).on('click', '#addQuestionBtn', this.addQuestion);
        $(document).on('click', '.removeQuestionBtn', this.removeQuestion);
        $(document).on('submit', '#deployForm', this.deployContract);
    },

    addQuestion: function() {
        const questionCount = $('.question-container').length + 1;
        const newQuestion = `
            <div class="question-container card mb-3">
                <div class="card-body">
                    <h3 class="card-title">Question ${questionCount}</h3>
                    <input type="text" class="form-control question mb-2" placeholder="Enter question" required>
                    <h4>Answers</h4>
                    <input type="text" class="form-control answer mb-2" placeholder="Answer 1" required>
                    <input type="text" class="form-control answer mb-2" placeholder="Answer 2" required>
                    <input type="text" class="form-control answer mb-2" placeholder="Answer 3" required>
                    <input type="text" class="form-control answer mb-2" placeholder="Answer 4" required>
                    <input type="text" class="form-control answer mb-2" placeholder="Answer 5" required>
                    <button type="button" class="btn btn-danger removeQuestionBtn mt-2">Remove Question</button>
                </div>
            </div>
        `;
        $('#questionsContainer').append(newQuestion);
        Index.updateQuestionNumbers();
    },

    removeQuestion: function() {
        if ($('.question-container').length > 3) {
            $(this).closest('.question-container').remove();
            Index.updateQuestionNumbers();
        } else {
            App.showError("You must have at least 3 questions.");
        }
    },

    updateQuestionNumbers: function() {
        $('.question-container').each(function(index) {
            $(this).find('h3').text(`Question ${index + 1}`);
        });
    },

    deployContract: async function(event) {
        event.preventDefault();

        const maxVoters = $('#maxVoters').val();
        const questions = [];
        const answerOptions = [];

        $('.question-container').each(function() {
            const question = $(this).find('.question').val();
            questions.push(question);

            const answers = [];
            $(this).find('.answer').each(function() {
                answers.push($(this).val());
            });
            answerOptions.push(answers);
        });

        if (questions.length < 3) {
            App.showError("You must have at least 3 questions.");
            return;
        }

        if (maxVoters < 1) {
            App.showError("Maximum number of voters must be at least 1.");
            return;
        }

        const initialTokenSupply = web3.utils.toWei(maxVoters.toString(), 'ether');

        try {
            App.setLoading(true);

            const deployedInstance = await App.contracts.Election.new(
                questions,
                answerOptions,
                initialTokenSupply,
                { from: App.account, gas: 5000000 }
            );

            App.contractAddress = deployedInstance.address;
            localStorage.setItem('electionContractAddress', App.contractAddress);
            console.log("Contract deployed successfully at:", App.contractAddress);
            alert("Contract deployed successfully at: " + App.contractAddress);
            window.location.href = 'home.html';
        } catch (error) {
            console.error("Error deploying contract:", error);
            App.showError("Error deploying contract. Check console for details.");
        } finally {
            App.setLoading(false);
        }
    }
};