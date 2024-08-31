const App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    election: null,
    contractAddress: null,
    loading: false,

    init: async function() {
        console.log("Initializing app...");
        try {
            await App.initWeb3();
            await App.initContract();
            await App.initAccount();
            await App.checkContractDeployment();
        } catch (error) {
            console.error("Initialization error:", error);
        }
        console.log("App initialized.");
    },

    initWeb3: async function() {
        if (typeof window.ethereum !== 'undefined') {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                console.error("User denied account access")
            }
        } else {
            console.warn("No ethereum browser detected. You should consider trying MetaMask!");
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        window.web3 = new Web3(App.web3Provider);
    },

    initContract: async function() {
        try {
            const response = await fetch('Election.json');
            const electionArtifact = await response.json();
            App.contracts.Election = TruffleContract(electionArtifact);
            App.contracts.Election.setProvider(App.web3Provider);
        } catch (error) {
            console.error("Error initializing contract:", error);
        }
    },

    initAccount: async function() {
        try {
            const accounts = await window.web3.eth.getAccounts();
            App.account = accounts[0];
            console.log("Current account:", App.account);
        } catch (error) {
            console.error("Error getting account:", error);
        }
    },

    checkContractDeployment: async function() {
        try {
            const deployedAddress = localStorage.getItem('electionContractAddress');
            if (deployedAddress) {
                App.contractAddress = deployedAddress;
                App.election = await App.contracts.Election.at(deployedAddress);
                console.log("Contract loaded at address:", App.contractAddress);
            } else {
                console.log("No deployed contract found");
                if (!window.location.href.includes('index.html')) {
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error("Error checking contract deployment:", error);
            if (!window.location.href.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    },

    setLoading: function(isLoading) {
        App.loading = isLoading;
        const loader = $("#loader");
        const content = $("#content");
        if (isLoading) {
            loader.show();
            content.hide();
        } else {
            loader.hide();
            content.show();
        }
    },

    showError: function(message) {
        const errorDiv = $("#errorMessage");
        errorDiv.text(message);
        errorDiv.show();
        setTimeout(() => {
            errorDiv.hide();
        }, 5000);
    }
};

$(document).ready(function() {
    App.init();
});