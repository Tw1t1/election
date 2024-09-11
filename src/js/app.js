const App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    election: null,
    contractAddress: null,
    loading: false,
    initialized: false,
    onInitialized: null,
    initializationPromise: null,
    userTypes: ['guest', 'user', 'candidate', 'voter', 'admin'],
    userType: 'guest',

    menuItems: [
        { name: 'Home', link: 'home.html', visible: (userType) => userType !== 'guest' },
        { name: 'Vote', link: 'vote.html', visible: (userType) => userType === 'candidate' || userType === 'voter' },
        { name: 'Application', link: 'application.html', visible: (userType) => userType === 'candidate' || userType === 'voter' || userType === 'user' },
        { name: 'Settings', link: 'admin.html', visible: (userType) => userType === 'admin' }
    ],

    init: async function () {
        if (this.initializationPromise) {
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
            await this.setPage();
            this.initialized = true;
            console.log("App initialized.");
            if (this.onInitialized) {
                this.onInitialized();
            }
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

    setOnInitialized: function(callback) {
        this.onInitialized = callback;
    }, 

    checkContractDeployment: async function () {
        this.setLoading(true);
        try {
            const deployedAddress = localStorage.getItem('electionContractAddress');
            if (deployedAddress) {
                App.contractAddress = deployedAddress;
                App.election = await App.contracts.Election.at(deployedAddress);
                console.log("Contract loaded at address:", App.contractAddress);
                App.userType = await App.checkUserType(App.account);
                console.log("User type:", App.userType);
            } else {
                console.log("No deployed contract found");
            }
        } catch (error) {
            console.error("Error checking contract deployment:", error);
        } finally {
            this.setLoading(false);
        }
    },

    setPage: async function () {
        if (App.account) {
            if (App.election) {
                if (window.location.href.includes('index.html') || window.location.href.includes('deploy.html') || window.location.pathname === '/' || window.location.pathname === '') {
                    window.location.href = 'home.html';
                }
            } else if (!window.location.href.includes('deploy.html')) {
                window.location.href = 'deploy.html';
            }
        } else {
            console.log("User not logged in");
            if (!window.location.href.includes('index.html')) {
                window.location.href = 'index.html';
            }
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

    renderNavbar: function(page) {
        console.log("Rendering navbar for page:", page, "User type:", App.userType);
        const navbarItemsHTML = App.menuItems.map(item => {
            if (item.visible(App.userType)) {
                const isActive = item.name === page ? ' active" aria-current="page' : '';
                return `
                    <li class="nav-item">
                        <a class="nav-link${isActive}" href="${item.link}">${item.name}</a>
                    </li>
                `;
            }
            return '';
        }).join('');
    
        $('#navbarItems').html(navbarItemsHTML);
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
            try {
                const owner = await App.election.owner();
                if (userAddress.toLowerCase() === owner.toLowerCase()) {
                    return 'admin';
                }

                const candidate = await App.election.candidates(userAddress);
                if (candidate.approved) {
                    return 'candidate';
                }

                const voter = await App.election.voters(web3.utils.keccak256(userAddress));
                if (voter.approved) {
                    return 'voter';
                }

                return 'user';
            } catch (error) {
                console.error("Error checking user type:", error);
                return 'user';
            }
        }
        return 'guest';
    },

    listenForEvents: function() {
        App.election.CandidateApproved().on('data', event => {
            console.log('Candidate Approved:', event.returnValues);
            // Refresh the page or update relevant data
            App.refreshPage();
        });

        App.election.CandidateRemoved().on('data', event => {
            console.log('Candidate Removed:', event.returnValues);
            App.refreshPage();
        });

        App.election.VoteCast().on('data', event => {
            console.log('Vote Cast:', event.returnValues);
            App.refreshPage();
        });

        App.election.VotingTimeSet().on('data', event => {
            console.log('Voting Time Set:', event.returnValues);
            App.refreshPage();
        });

        App.election.VoterRewarded().on('data', event => {
            console.log('Voter Rewarded:', event.returnValues);
            App.refreshPage();
        });
    },

    refreshPage: function() {
        location.reload();
    },

    isElectionTimeSet: async function() {
        const electionStartTime = await App.election.electionStartTime();
        const electionEndTime = await App.election.electionEndTime();
        return electionStartTime.toNumber() !== 0 && electionEndTime.toNumber() !== 0;
    },
    
    getElectionTime: async function() {
        const electionStartTime = await App.election.electionStartTime();
        const electionEndTime = await App.election.electionEndTime();
        return {
            start: electionStartTime.toNumber() * 1000, // Convert to milliseconds
            end: electionEndTime.toNumber() * 1000
        };
    },
    
    getElectionStatus: async function() {
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const electionStartTime = await App.election.electionStartTime();
        const electionEndTime = await App.election.electionEndTime();
        
        if (electionStartTime.toNumber() === 0 && electionEndTime.toNumber() === 0) {
            return "Not set";
        } else if (now < electionStartTime.toNumber()) {
            return "Not started";
        } else if (now >= electionStartTime.toNumber() && now <= electionEndTime.toNumber()) {
            return "In progress";
        } else {
            return "Ended";
        }
    }

};

$(document).ready(function () {
    App.init().catch(error => {
        console.error("Error during App initialization:", error);
    });

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', function (accounts) {
            App.account = accounts[0];
            App.setPage();
        });
    }
});