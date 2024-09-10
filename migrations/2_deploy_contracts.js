const Election = artifacts.require("Election");
const ElectionToken = artifacts.require("ElectionToken");
const fs = require('fs');
const path = require('path');

module.exports = function(deployer) {
  deployer.then(async () => {
    // Read the configuration file
    const configPath = path.join(__dirname, '..', 'election_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Extract the questions and answer options from the config
    const { electionName, questions, answerOptions } = config;

    // Deploy the Election contract
    await deployer.deploy(Election, electionName, questions, answerOptions);
    
    const electionInstance = await Election.deployed();
    
    // Get the token address from the election contract
    const tokenAddress = await electionInstance.votingToken();
    
    console.log("Election contract deployed at:", electionInstance.address);
    console.log("Token contract deployed at:", tokenAddress);
    console.log("Election name:", electionName);
    console.log("Number of questions:", questions.length);
  });
};