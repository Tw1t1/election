const App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    election: null,
    contractAddress: null,
    loading: false,
    initialized: false,
    initializationPromise: null,

    init: function () {
        console.log("App.init called");
        if (this.initializationPromise) {
            console.log("Returning existing initialization promise");
            return this.initializationPromise;
        }

        console.log("Starting new initialization");
        App.initializationPromise = App._init();
        return this.initializationPromise;
    },

    _init: async function () {
        if (this.initialized) {
            console.log("App already initialized.");
            return;
        }
        console.log("Initializing app...");
        this.setLoading(true);
        try {
            await this.initWeb3();
            await this.initContract();
            await this.initAccount();
            await this.checkContractDeployment();
            this.initialized = true;
            console.log("App initialized.");
            await this.render();
        } catch (error) {
            console.error("Initialization error:", error);
            this.showError("Failed to initialize the application. Please refresh and try again.");
            this.initializationPromise = null;
            throw error;
        } finally {
            this.setLoading(false);
        }
    },

    initWeb3: async function () {
        if (typeof window.ethereum !== 'undefined') {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        } else {
            console.warn("No ethereum browser detected. You should consider trying MetaMask!");
            App.showError("No Ethereum browser detected. You should consider trying MetaMask!");
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        window.web3 = new Web3(App.web3Provider);
    },

    initContract: async function () {
        try {
            const response = await fetch('Election.json');
            const electionArtifact = await response.json();
            App.contracts.Election = TruffleContract(electionArtifact);
            App.contracts.Election.setProvider(App.web3Provider);
        } catch (error) {
            console.error("Error initializing contract:", error);
        }
    },

    initAccount: async function () {
        try {
            const accounts = await window.web3.eth.getAccounts();
            App.account = accounts[0];
            console.log("Current account:", App.account);
        } catch (error) {
            console.error("Error getting account:", error);
        }
    },

    connectWallet: async function () {
        App.setLoading(true);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await App.initAccount();
            await App.render();
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            App.showError("Failed to connect wallet. Please try again.");
        } finally {
            App.setLoading(false);
        }
    },

    checkContractDeployment: async function () {
        this.setLoading(true);
        try {
            const deployedAddress = localStorage.getItem('electionContractAddress');
            if (deployedAddress) {
                App.contractAddress = deployedAddress;
                App.election = await App.contracts.Election.at(deployedAddress);
                console.log("Contract loaded at address:", App.contractAddress);
                if (window.location.href.includes('index.html')) {
                    window.location.href = 'home.html';
                }
                App.checkUserType(App.account);
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
        } finally {
            this.setLoading(false);
        }
    },

    render: async function () {
        this.setLoading(true);
        try {
            if (this.account) {
                $('#accountAddress').html('Your Account: ' + this.account);
                $('#connectWallet').hide();
                $('#deployForm').show();
            } else {
                $('#accountAddress').html('');
                $('#connectWallet').show();
                $('#deployForm').hide();
            }
        } catch (error) {
            console.error("Error rendering app:", error);
            this.showError("Failed to render the application. Please refresh and try again.");
        } finally {
            this.setLoading(false);
        }
    },

    setLoading: function (isLoading) {
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

    showError: function (message) {
        const errorDiv = $("#errorMessage");
        errorDiv.text(message);
        errorDiv.show();
        setTimeout(() => {
            errorDiv.hide();
        }, 5000);
    },

    checkUserType: async function (userAddress) {
        if (userAddress && App.election) {
            console.log("Checking user type:", userAddress);
            // Check if the user is the admin (owner of the contract)
            try {
                const owner = await App.election.owner(); // No methods required for owner() in OpenZeppelin's Ownable
                if (userAddress.toLowerCase() === owner.toLowerCase()) {
                    console.log("User is admin");
                    return 'admin';
                }

                // Check if the user is a candidate
                const candidate = await App.election.candidates(userAddress);
                if (candidate.approved) {
                    console.log("User is candidate");
                    return 'candidate';
                }

                // Check if the user is a voter
                const voter = await App.election.voters(userAddress);
                if (voter.approved) {
                    console.log("User is voter");
                    return 'voter';
                }

                // If none of the above conditions are met, the user is a regular user
                console.log("User is regular user");
                return 'user';
            } catch (error) {
                console.error("Error checking user type:", error);
            }
        }
        else {
            // If the user is not logged in, return 'guest'
            console.log("User is guest");
            return 'guest';
        }
    }
};

$(document).ready(function () {
    App.init().catch(error => {
        console.error("Error during App initialization:", error);
    });

    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', function (accounts) {
            App.account = accounts[0];
            App.render();
        });
    }

    // Add click handler for connect wallet button
    $('#connectWalletBtn').click(App.connectWallet);
});