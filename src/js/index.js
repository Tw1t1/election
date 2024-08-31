$(document).ready(function() {
    App.init().then(function() {
        Index.init();
    });
});

const Index = {
    init: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '#addQuestionBtn', this.addQuestion);
        $(document).on('submit', '#deployForm', this.deployContract);
    },

    addQuestion: function() {
        const questionCount = $('.question-container').length + 1;
        const newQuestion = `
            <div class="question-container">
                <h3>Question ${questionCount}</h3>
                <input type="text" class="form-control question" placeholder="Enter question" required>
                <h4>Answers</h4>
                <input type="text" class="form-control answer" placeholder="Answer 1" required>
                <input type="text" class="form-control answer" placeholder="Answer 2" required>
                <input type="text" class="form-control answer" placeholder="Answer 3" required>
                <input type="text" class="form-control answer" placeholder="Answer 4" required>
                <input type="text" class="form-control answer" placeholder="Answer 5" required>
            </div>
        `;
        $('#questionsContainer').append(newQuestion);
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