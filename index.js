const fs = require('fs');

// Read JSON files
const exibitions = JSON.parse(fs.readFileSync('exibitions.json', 'utf-8'));
const groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));

function exibitionModifier(obj) {
  // ---------------
  const exibitionsObject = obj; // needs to be a deep copy
  const size = Object.keys(exibitionsObject).length;
  let mods = {};
  // ---------------
  for (let i = 0; i < size; i++) {
    let team = Object.keys(exibitionsObject)[i];
    let results = exibitionsObject[Object.keys(exibitionsObject)[i]];
    const exibitionSize =
      exibitionsObject[Object.keys(exibitionsObject)[i]].length;
    mods[team] = {};
    // save positive modifiers
    for (let j = 0; j < exibitionSize; j++) {
      let matchResult = results[j]['Result'];
      let [num1, num2] = matchResult.split('-').map(Number);
      let mod = num1 / num2;
      if (mod > 1) {
        // Ensure `mods[team]` is initialized if not already
        if (!mods[team]) {
          mods[team] = {};
        }

        // Add or update the opponent's mod value
        mods[team][results[j]['Opponent']] = mod;
      }
    }
    //-------------

    // delete empty objects
    Object.keys(mods).forEach((key) => {
      if (Object.keys(mods[key]).length < 1) {
        delete mods[key];
      }
    });
    //-------------
  }
  return mods;
}

function rollScore(minRoll = 1, maxRoll = int, advantage = false) {
  if (advantage) {
    let roll1 = Math.floor(Math.random() * maxRoll) + minRoll;
    let roll2 = Math.floor(Math.random() * maxRoll) + minRoll;
    return Math.max(roll1, roll2);
  }
  return Math.floor(Math.random() * maxRoll) + 1;
}

function individualGroupPhase(groups) {
  let size = groups.length;
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      console.log(`${i}` + `${j}`);
    }
  }
}

function groupsToTeams(groups) {
  let teams = {};
  Object.keys(groups).forEach((key) => {
    groups[key].forEach((team) => {
      const ISOCode = team['ISOCode'];
      teams[ISOCode] = team;
    });
  });
  return teams;
}

let teams = groupsToTeams(groups);

function teamRankingModifier(teams) {
  let fibaRankingArray = [];
  // Create an array containing all fibaRanks
  Object.keys(teams).forEach((key) => {
    const fibaRanking = teams[key]['FIBARanking'];
    fibaRankingArray.push(fibaRanking);
  });
  // --------------------
  // worst
  const maxFIBARanking = Math.max(...fibaRankingArray);
  // best
  const minFIBARanking = Math.min(...fibaRankingArray);
  const fibaRankingGap = maxFIBARanking - minFIBARanking;

  Object.keys(teams).forEach((key) => {
    const fibaRanking = teams[key]['FIBARanking'];
    teams[key]['Modifiers'] = {
      Ranking: (fibaRankingGap - fibaRanking + 1) * 0.0025 + 1,
    };
  });
}
//console.log(groups["A"]);
teamRankingModifier(teams);
//console.log(teams);
//  "CAN": {
//    "Team": "Kanada",
//    "ISOCode": "CAN",
//    "FIBARanking": 7
//    "Modifiers" : {
//      Exibition : {} add results from new matches | if its already included get avg of the two.
//      Ranking : int
//    }
//    "Scores" : {
//      groupPhase : int
//      hatPhase : int
//      eliminationPhase : int
//      quarterFinals : int
//      semiFinals : int
//      finals : int
//    }
//  },
//individualGroupPhase(groups["A"])
console.log(exibitionModifier(exibitions));
// console.log(rollScore(5, 20));

// (oppScore * exibMod - oppScore) + score = exibModScore
// exibModScore * rankMod = finalMatchScore
