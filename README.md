known issues: 

1. In Election.sol – function getResults:
  The function can only be called after the election has ended, 
  meaning block.timestamp > electionEndTime.
  But, when the block.timestamp isn’t updated then this could cause an error that the election has ended but the user can’t call getResults until the block.timestamp is updated.
  This could be solved with a function that will emit an event that the election has ended and doing so it will update the block.timestamp and the frontend which will listen to the event.
  The current solution to this issue is that in Home.js the function loadResults checks if this issue occurs and if so it makes a transaction to update the block.timestamp.
