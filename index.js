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
      team['Modifiers'] = {};
      teams[ISOCode] = team;
    });
  });
  return teams;
}

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
    Object.assign(teams[key]['Modifiers'], {
      Ranking: (fibaRankingGap - fibaRanking) * 0.0025 + 1,
    });
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
}

function applyModifiers(team, score, opponentISO) {
  let modifier = 1;
  modifier *= team['Modifiers']['Ranking'];
  Object.keys(team['Modifiers']).forEach((key) => {
    if (key == opponentISO) {
      modifier *= team['Modifiers'][key];
    }
  });
  return Math.ceil(score * modifier);
}

function oneGame(team1, team2) {
  let teamOne;
  let teamTwo;

  if (team1['FIBARanking'] < team2['FIBARanking']) {
    teamOne = team1;
    teamTwo = team2;
  } else {
    teamOne = team2;
    teamTwo = team1;
  }

  const minimumRollValue = 4;
  const maximumRollValue = 20;
  const rollTimes = 5;
  const surrenderWhenGap = 50;

  let score = rollScore(minimumRollValue, maximumRollValue, rollTimes, false);
  let scoreWithAdvantage = rollScore(
    minimumRollValue,
    maximumRollValue,
    rollTimes,
    true,
  );

  let modifiedScoreWithAdvantage = applyModifiers(
    teamOne,
    scoreWithAdvantage,
    teamTwo['ISOCode'],
  );
  let modifiedScore = applyModifiers(teamTwo, score, teamOne['ISOCode']);
  while (modifiedScoreWithAdvantage == modifiedScore) {
    modifiedScore += Math.floor(Math.random() * 20) + 1;
    modifiedScoreWithAdvantage += Math.floor(Math.random() * 20) + 1;
  }
  let matchResult = [];
  if (modifiedScoreWithAdvantage > modifiedScore) {
    assignMatchPoints(
      teamOne,
      2,
      modifiedScoreWithAdvantage,
      modifiedScore,
      teamTwo['ISOCode'],
    );
    // if score difference more than 50, count as surrender
    assignMatchPoints(
      teamTwo,
      modifiedScoreWithAdvantage - modifiedScore > surrenderWhenGap ? 0 : 1,
      modifiedScore,
      modifiedScoreWithAdvantage,
      teamOne['ISOCode'],
    );
    if (matchResult['Winner'] && matchResult['Loser']) {
      Object.assign(matchResult['Winner'], [teamOne['ISOCode']]);
      Object.assign(matchResult['Loser'], [teamTwo['ISOCode']]);
    } else {
      matchResult = [teamOne['ISOCode'], teamTwo['ISOCode']];
    }
  } else {
    assignMatchPoints(
      teamTwo,
      2,
      modifiedScore,
      modifiedScoreWithAdvantage,
      teamOne['ISOCode'],
    );
    // if score difference more than 50, count as surrender
    assignMatchPoints(
      teamOne,
      modifiedScoreWithAdvantage - modifiedScore > surrenderWhenGap ? 0 : 1,
      modifiedScoreWithAdvantage,
      modifiedScore,
      teamTwo['ISOCode'],
    );
    if (matchResult['Winner'] && matchResult['Loser']) {
      Object.assign(matchResult['Winner'], [teamTwo['ISOCode']]);
      Object.assign(matchResult['Loser'], [teamOne['ISOCode']]);
    } else {
      matchResult = [teamTwo['ISOCode'], teamOne['ISOCode']];
    }
  }
  console.log(
    `    ${
      teamOne['Team'].length > 12 ? teamOne['ISOCode'] : teamOne['Team']
    }` +
      ' - ' +
      `${teamTwo['Team'].length > 12 ? teamTwo['ISOCode'] : teamTwo['Team']}` +
      ` (${modifiedScoreWithAdvantage} : ${modifiedScore})`,
  );
  return matchResult;
}

function getGroupPhase(groups) {
  let sortedGroups = {};
  Object.keys(groups).forEach((group) => {
    let teamsArray = [];
    groups[group].forEach((team) => {
      teamsArray.push(team['ISOCode']);
    });
    sortedGroups[group] = teamsArray;
  });
  return sortedGroups;
}

function groupPhase(groups, teams) {
  // Object.keys(groups).forEach((groupName) => {
  //   console.log("   Group " + groupName)
  //   for(let i = 0; i < groups[groupName].length; i++){
  //     for (let j = i + 1; j < groups[groupName].length; j++) {
  //       console.log("    "+oneGame(teams[groups[groupName][i]], teams[groups[groupName][j]]));
  //     }
  //   }
  // });
  // Have initial matches

  let matchResultTracker = {};
  console.log('Grupna faza - I kolo:');
  Object.keys(groups).forEach((groupName) => {
    console.log('  Group ' + groupName);
    matchResultTracker[groupName] = [];
    for (let i = 0; i < groups[groupName].length; i += 2) {
      matchResultTracker[groupName].push(
        oneGame(teams[groups[groupName][i]], teams[groups[groupName][i + 1]]),
      );
    }
  });
  console.log('Grupna faza - II kolo:');
  Object.keys(matchResultTracker).forEach((groupName) => {
    console.log('  Group ' + groupName);
    // pick winners to play against winners and losers against losers from first round
    oneGame(
      teams[matchResultTracker[groupName][0][0]],
      teams[matchResultTracker[groupName][1][0]],
    );
    oneGame(
      teams[matchResultTracker[groupName][0][1]],
      teams[matchResultTracker[groupName][1][1]],
    );
  });
  console.log('Grupna faza - III kolo:');
  Object.keys(matchResultTracker).forEach((groupName) => {
    console.log('  Group ' + groupName);
    // now pick winners from first round to play against losers from first round
    oneGame(
      teams[matchResultTracker[groupName][0][0]],
      teams[matchResultTracker[groupName][1][1]],
    );
    oneGame(
      teams[matchResultTracker[groupName][0][1]],
      teams[matchResultTracker[groupName][1][0]],
    );
  });
}
let teams = groupsToTeams(groups);
teamRankingModifier(teams);
exibitionModifier(exibitions, teams);
groupPhase(getGroupPhase(groups), teams);
// "ESP": {
//   "Team": "Španija",
//   "ISOCode": "ESP",
//   "FIBARanking": 2,
//   "Wins": 0,
//   "Losses": 0,
//   "Points": 0,
//   "Scored": 0,
//   "OpponentScored": 0,
//   "ScoreDifference": 0,
//   "Modifiers": {
//     "Ranking": 1.08,
//     "BRA": 1.0277777777777777,
//     "PRI": 1.1369047619047619
//   }
// },
