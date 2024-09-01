const fs = require('fs');

// Read JSON files
const exibitions = JSON.parse(fs.readFileSync('exibitions.json', 'utf-8'));
const groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));

function exibitionModifier(obj, teams) {
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
  Object.keys(mods).forEach((key) => {
    Object.assign(teams[key]['Modifiers'], mods[key]);
  });
  return mods;
}

function rollScore(
  minRoll = 1,
  maxRoll = int,
  rolls = 1,
  advantageChance = false,
) {
  let rollSum = 0;
  let advantage = false;
  if (advantageChance) {
    advantage = Math.random() >= 0.75 ? true : false;
  }
  for (let i = 0; i < rolls; i++) {
    if (advantage) {
      let roll1 = Math.floor(Math.random() * maxRoll) + minRoll;
      let roll2 = Math.floor(Math.random() * maxRoll) + minRoll;
      rollSum += Math.max(roll1, roll2);
    } else {
      rollSum += Math.floor(Math.random() * maxRoll) + minRoll;
    }
  }
  return rollSum;
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
  const fibaRankingGap = maxFIBARanking - minFIBARanking + 1;

  Object.keys(teams).forEach((key) => {
    const fibaRanking = teams[key]['FIBARanking'];
    teams[key]['Modifiers'] = {
      Ranking: (fibaRankingGap - fibaRanking) * 0.0025 + 1,
    };
  });
}
//console.log(groups["A"]);
teamRankingModifier(teams);
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
//      thirdPlace : int
//      finals : int
//    }
//  },
//individualGroupPhase(groups["A"])
console.log(exibitionModifier(exibitions, teams));
console.log(teams);
// console.log(rollScore(5, 20));

// score * rankMod = initialScore
// if theres exibMod
// oppInitialScore * exibMod - oppInitialScore + score = finalMatchScore

// const minRollValue
// const maxRollValue
// const rollTimes
// rollScore(4, 20, 10, false)

// function checkAdvantageChance(){
//   let advantageCheck = 0
//   for (let m = 0 ; m < 10000 ; m++) {
//     if(oneGame(teams["CAN"], teams["SRB"])){
//       advantageCheck++
//     }
//   }
//   return advantageCheck / 100
// }
