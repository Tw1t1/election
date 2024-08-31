const Election = artifacts.require("Election");
const fs = require('fs');
const path = require('path');

module.exports = function(deployer) {
  deployer.then(async () => {
    // Read the configuration file
    const configPath = path.join(__dirname, '..', 'election_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Extract the questions, answer options, and max voters from the config
    const { questions, answerOptions, maxVoters } = config;

    // Calculate the initial token supply (1 ether per voter)
    const initialTokenSupply = web3.utils.toWei(maxVoters.toString(), 'ether');

    // Deploy the Election contract
    await deployer.deploy(Election, questions, answerOptions, initialTokenSupply);
    
    const electionInstance = await Election.deployed();
    
    console.log("Election contract deployed at:", electionInstance.address);
    console.log("Number of questions:", questions.length);
    console.log("Max number of voters:", maxVoters);
    console.log("Initial token supply:", initialTokenSupply);
  });
};