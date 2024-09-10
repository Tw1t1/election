$(document).ready(function() {
    App.init().then(function() {
        Index.init();
    });
});

const Index = {
    init: function() {
        this.bindEvents();
        this.render();
    },

    bindEvents: function() {
        $('#connectWalletBtn').on('click', App.connectWallet);
    },

    connectWallet: async function () {
        App.setLoading(true);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await App.initAccount();
            App.setPage();
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            App.showError("Failed to connect wallet. Please try again.");
        } finally {
            App.setLoading(false);
        }
    },

    render: function() {
        if (App.account) {
            $('#content').hide();
            $('#accountAddress').text(App.account);
            $('#accountDetails').show();
        } else {
            $('#content').show();
            $('#accountDetails').hide();
        }
    }
};