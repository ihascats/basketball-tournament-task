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
      let mod = (num1 / num2 + 1) * 0.5;
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
      team['Wins'] = 0;
      team['Losses'] = 0;
      team['Points'] = 0;
      team['Scored'] = 0;
      team['OpponentScored'] = 0;
      team['ScoreDifference'] = 0;
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

function assignMatchPoints(
  team,
  newPoints,
  scoredAtEnemy,
  enemyScored,
  opponentISO,
) {
  // Add point to the losses or wins
  if (newPoints < 2) {
    let prevLosses = team['Losses'];
    team['Losses'] = prevLosses + 1;
  } else {
    let prevWins = team['Wins'];
    team['Wins'] = prevWins + 1;
  }

  // add Points
  let prevPoints = team['Points'];
  team['Points'] = prevPoints + newPoints;

  let prevScored = team['Scored'];
  team['Scored'] = prevScored + scoredAtEnemy;

  let prevOpponentScored = team['OpponentScored'];
  team['OpponentScored'] = prevOpponentScored + enemyScored;

  let prevScoreDifference = team['ScoreDifference'];
  team['ScoreDifference'] = prevScoreDifference + (scoredAtEnemy - enemyScored);

  if (newPoints == 2) {
    if (team['Modifiers'][opponentISO]) {
      let prevMod = team['Modifiers'][opponentISO];
      Object.assign(team['Modifiers'], {
        [opponentISO]: (scoredAtEnemy / enemyScored + prevMod) * 0.5,
      });
    }
    Object.assign(team['Modifiers'], {
      [opponentISO]: (scoredAtEnemy / enemyScored + 1) * 0.5,
    });
  }
  if (newPoints < 2) {
    Object.assign(team['Modifiers'], { [opponentISO]: 1 });
  }
  console.log(team);
}

function applyModifiers(team, score, opponentISO) {
  let modifier = 1;
  modifier *= team['Modifiers']['Ranking'];
  Object.keys(team['Modifiers']).forEach((key) => {
    if (key == opponentISO) {
      modifier *= team['Modifiers'][key];
    }
  });
  console.log(score, Math.ceil(score * modifier));
  return Math.ceil(score * modifier);
}

function oneGame(team1, team2) {
  const minimumRollValue = 4;
  const maximumRollValue = 20;
  const rollTimes = 10;
  const surrenderWhenGap = 50;

  let score = rollScore(minimumRollValue, maximumRollValue, rollTimes, false);
  let scoreWithAdvantage = rollScore(
    minimumRollValue,
    maximumRollValue,
    rollTimes,
    true,
  );

  // if draw
  while (scoreWithAdvantage == score) {
    score += Math.floor(Math.random() * 1) + 20;
    scoreWithAdvantage += Math.floor(Math.random() * 1) + 20;
  }
  // team1's score is scoreWithAdvantage
  if (team1['FIBARanking'] < team2['FIBARanking']) {
    let modifiedScoreWithAdvantage = applyModifiers(
      team1,
      scoreWithAdvantage,
      team2['ISOCode'],
    );
    let modifiedScore = applyModifiers(team2, score, team1['ISOCode']);

    if (modifiedScoreWithAdvantage > modifiedScore) {
      assignMatchPoints(
        team1,
        2,
        modifiedScoreWithAdvantage,
        modifiedScore,
        team2['ISOCode'],
      );
      // if score difference more than 50, count as surrender
      assignMatchPoints(
        team2,
        modifiedScoreWithAdvantage - modifiedScore > surrenderWhenGap ? 0 : 1,
        modifiedScore,
        modifiedScoreWithAdvantage,
        team1['ISOCode'],
      );
    } else {
      assignMatchPoints(
        team2,
        2,
        modifiedScore,
        modifiedScoreWithAdvantage,
        team1['ISOCode'],
      );
      // if score difference more than 50, count as surrender
      assignMatchPoints(
        team1,
        modifiedScoreWithAdvantage - modifiedScore > surrenderWhenGap ? 0 : 1,
        modifiedScoreWithAdvantage,
        modifiedScore,
        team2['ISOCode'],
      );
    }
    return (
      `${team1['ISOCode']}` +
      ` ${modifiedScoreWithAdvantage}` +
      ' ----- ' +
      `${team2['ISOCode']}` +
      ` ${modifiedScore}` +
      ' ----- ' +
      `${
        modifiedScoreWithAdvantage > modifiedScore
          ? `${team1['Team']}`
          : `${team2['Team']}`
      }` +
      ' WON'
    );
  }

  // team2's score is scoreWithAdvantage
  let modifiedScoreWithAdvantage = applyModifiers(
    team2,
    scoreWithAdvantage,
    team1['ISOCode'],
  );
  let modifiedScore = applyModifiers(team1, score, team2['ISOCode']);
  if (modifiedScoreWithAdvantage > modifiedScore) {
    // Team2 scored more points
    assignMatchPoints(
      team2,
      2,
      modifiedScoreWithAdvantage,
      modifiedScore,
      team1['ISOCode'],
    );
    // if score difference more than 50, count as surrender
    assignMatchPoints(
      team1,
      modifiedScoreWithAdvantage - modifiedScore > surrenderWhenGap ? 0 : 1,
      modifiedScore,
      modifiedScoreWithAdvantage,
      team2['ISOCode'],
    );
  } else {
    // Team1 scored more points
    assignMatchPoints(
      team1,
      2,
      modifiedScore,
      modifiedScoreWithAdvantage,
      team2['ISOCode'],
    );
    // if score difference more than 50, count as surrender
    assignMatchPoints(
      team2,
      modifiedScore - modifiedScoreWithAdvantage > surrenderWhenGap ? 0 : 1,
      modifiedScoreWithAdvantage,
      modifiedScore,
      team1['ISOCode'],
    );
  }
  return (
    `${team1['ISOCode']}` +
    ` ${modifiedScore}` +
    ' ----- ' +
    `${team2['ISOCode']}` +
    ` ${modifiedScoreWithAdvantage}` +
    ' ----- ' +
    `${
      modifiedScoreWithAdvantage < modifiedScore
        ? `${team1['Team']}`
        : `${team2['Team']}`
    }` +
    ' WON'
  );
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
exibitionModifier(exibitions, teams);
// console.log(teams);
console.log(oneGame(teams['CAN'], teams['SRB']));
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
//
