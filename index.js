const fs = require('fs');

// Read JSON files
const exibitions = JSON.parse(fs.readFileSync('exibitions.json', 'utf-8'));
const groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));

function exibitionModifier(obj, teams) {
  // ---------------
  const exibitionsObject = obj; // nvm its fine
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

function oneGame(team1, team2, padding = 8) {
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
    `${' '.repeat(padding)}${
      teamOne['Team'].length > 12 ? teamOne['ISOCode'] : teamOne['Team']
    }` +
      ' - ' +
      `${teamTwo['Team'].length > 12 ? teamTwo['ISOCode'] : teamTwo['Team']}` +
      ` (${modifiedScoreWithAdvantage}:${modifiedScore})`,
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
  let matchResultTracker = {};
  console.log('\nGrupna faza - I kolo:');
  Object.keys(groups).forEach((groupName) => {
    console.log('   Groupa ' + groupName + ':');
    matchResultTracker[groupName] = [];
    for (let i = 0; i < groups[groupName].length; i += 2) {
      matchResultTracker[groupName].push(
        oneGame(teams[groups[groupName][i]], teams[groups[groupName][i + 1]]),
      );
    }
  });
  console.log('\nGrupna faza - II kolo:');
  Object.keys(matchResultTracker).forEach((groupName) => {
    console.log('   Groupa ' + groupName + ':');
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
  console.log('\nGrupna faza - III kolo:');
  Object.keys(matchResultTracker).forEach((groupName) => {
    console.log('   Groupa ' + groupName + ':');
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

// Sort groups based on points
// if 2 teams have same amount of points, winner of the match between the two gets ranked higher
// if 3 teams have same amount of points, then based on score difference
// group 1st, 2nd and 3rd place of each group together
// then sort them by
// first: points
// second: point difference
// third: points scored

function sortGroupResults(groups) {
  Object.keys(groups).forEach((groupName) => {
    groups[groupName].sort((a, b) => {
      // Sort by points
      if (a['Points'] !== b['Points']) {
        return b['Points'] - a['Points'];
      }

      // If three teams have equal points, sort by score difference
      if (
        groups[groupName].filter((team) => team['Points'] === a['Points'])
          .length === 3
      ) {
        if (a['ScoreDifference'] !== b['ScoreDifference']) {
          return b['ScoreDifference'] - a['ScoreDifference'];
        }
      }

      // If two teams have equal points, sort by the outcome of the match
      if (
        groups[groupName].filter((team) => team['Points'] === a['Points'])
          .length === 2
      ) {
        const aModifier = a['Modifiers'][b['ISOCode']] || 1;
        const bModifier = b['Modifiers'][a['ISOCode']] || 1;
        if (aModifier !== bModifier) {
          return bModifier - aModifier;
        }
      }

      // If score difference is equal, sort by points scored
      return b['Scored'] - a['Scored'];
    });
  });
}

function shuffleArray(array) {
  // Simple function to shuffle an array (Fisher-Yates shuffle)
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function pairTeams(potA, potB) {
  shuffleArray(potA);
  shuffleArray(potB);

  let pairs = [];
  let unmatchedTeams = [];

  potA.forEach((teamA) => {
    let matched = false;

    for (let i = 0; i < potB.length; i++) {
      let teamB = potB[i];

      // Check if teams have met before
      if (!teamA['Modifiers'].hasOwnProperty(teamB['ISOCode'])) {
        pairs.push([teamA, teamB]);
        potB.splice(i, 1); // Remove the matched teamB from potB
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatchedTeams.push(teamA);
    }
  });

  // Handle unmatched teams (if any)
  if (unmatchedTeams.length > 0) {
    unmatchedTeams.forEach((team) => {
      pairs.push([team, potB.shift()]);
    });
  }

  return pairs;
}

function sortTeamsForPots(pot) {
  pot.forEach(() => {
    pot.sort((a, b) => {
      // Sort by points
      if (a['Points'] !== b['Points']) {
        return b['Points'] - a['Points'];
      }

      // If three teams have equal points, sort by score difference
      if (pot.filter((team) => team['Points'] === a['Points']).length === 3) {
        if (a['ScoreDifference'] !== b['ScoreDifference']) {
          return b['ScoreDifference'] - a['ScoreDifference'];
        }
      }
      // If score difference is equal, sort by points scored
      return b['Scored'] - a['Scored'];
    });
  });
}

// rank them from 1-8, exclude 9th team

// group them up in pairs of:
// D: 1-2,
// E: 3-4,
// F: 5-6,
// G: 7-8

// Quarterfinals
// Randomly match D and G teams, and E and F teams
// teams that played against each other in the group phase cant do it again

function sortPots(groups) {
  let rank1 = [];
  let rank2 = [];
  let rank3 = [];
  Object.keys(groups).forEach((groupName) => {
    let i = 0;
    Object.keys(groups[groupName]).forEach((team) => {
      if (i === 3) {
        return;
      }
      if (i == 0) {
        rank1.push(groups[groupName][team]);
      }
      if (i == 1) {
        rank2.push(groups[groupName][team]);
      }
      if (i == 2) {
        rank3.push(groups[groupName][team]);
      }
      i++;
    });
  });
  sortTeamsForPots(rank1);
  sortTeamsForPots(rank2);
  sortTeamsForPots(rank3);

  let potGroups = {
    D: [rank1[0], rank1[1]],
    E: [rank1[2], rank2[0]],
    F: [rank2[1], rank2[2]],
    G: [rank3[0], rank3[1]],
  };
  console.log('\nŠeširi:');
  Object.keys(potGroups).forEach((pot) => {
    console.log(`  Šešir ${pot}`);
    potGroups[pot].forEach((team) => {
      console.log(`    ${team['Team']}`);
    });
  });
  let pairsDG = pairTeams(potGroups['D'], potGroups['G']);
  let pairsEF = pairTeams(potGroups['E'], potGroups['F']);

  return [pairsDG, pairsEF];
}

function endGame(pots) {
  let pairsDG = pots[0];
  let pairsEF = pots[1];
  console.log('\nEliminaciona faza:');
  pairsDG.forEach((group) => {
    console.log('  ' + group[0]['Team'] + ' - ' + group[1]['Team']);
  });
  console.log('');
  pairsEF.forEach((group) => {
    console.log('  ' + group[0]['Team'] + ' - ' + group[1]['Team']);
  });

  let quarterfinalResults = [];
  console.log('\nČetvrtfinale:');
  pairsDG.forEach((team) => {
    quarterfinalResults.push(oneGame(team[0], team[1], 2));
  });
  console.log('');
  pairsEF.forEach((team) => {
    quarterfinalResults.push(oneGame(team[0], team[1], 2));
  });

  let semifinalResults = [];
  let semifinalsPairs = [];
  let semifinalMatches = [];

  pairsDG.forEach((group) => {
    group.forEach((team) => {
      if (
        team['ISOCode'] == quarterfinalResults[0][0] ||
        team['ISOCode'] == quarterfinalResults[1][0]
      ) {
        semifinalsPairs.push(team);
      }
    });
  });

  semifinalMatches.push(semifinalsPairs);
  semifinalsPairs = [];
  pairsEF.forEach((group) => {
    group.forEach((team) => {
      if (
        team['ISOCode'] == quarterfinalResults[2][0] ||
        team['ISOCode'] == quarterfinalResults[3][0]
      ) {
        semifinalsPairs.push(team);
      }
    });
  });

  semifinalMatches.push(semifinalsPairs);
  semifinalsPairs = [];
  console.log('\nPolufinale:');
  semifinalResults.push(
    oneGame(semifinalMatches[0][0], semifinalMatches[0][1], 2),
  );
  semifinalResults.push(
    oneGame(semifinalMatches[1][0], semifinalMatches[1][1], 2),
  );

  let thirdPlaceTeams = [];
  let finalsTeams = [];
  semifinalMatches.forEach((group, index) => {
    group.forEach((team) => {
      if (team['ISOCode'] == semifinalResults[index][1]) {
        thirdPlaceTeams.push(team);
      }
      if (team['ISOCode'] == semifinalResults[index][0]) {
        finalsTeams.push(team);
      }
    });
  });

  let thirdPlace = [];
  let firstAndSecondPlace = [];
  console.log('\nUtakmica za treće mesto:');
  thirdPlace.push(oneGame(thirdPlaceTeams[0], thirdPlaceTeams[1], 2));
  console.log('\nFinale:');
  firstAndSecondPlace.push(oneGame(finalsTeams[0], finalsTeams[1], 2));

  console.log('\nMedalje');
  console.log(
    `  1. ${
      finalsTeams[0]['ISOCode'] == firstAndSecondPlace[0][0]
        ? finalsTeams[0]['Team']
        : finalsTeams[1]['Team']
    }`,
  );
  console.log(
    `  2. ${
      finalsTeams[0]['ISOCode'] !== firstAndSecondPlace[0][1]
        ? finalsTeams[1]['Team']
        : finalsTeams[0]['Team']
    }`,
  );
  console.log(
    `  3. ${
      thirdPlaceTeams[0]['ISOCode'] == thirdPlace[0][0]
        ? thirdPlaceTeams[0]['Team']
        : thirdPlaceTeams[1]['Team']
    }`,
  );
}

function centerText(text, width) {
  const padding = Math.max(width - text.length, 0);
  const padLeft = Math.floor(padding / 2);
  const padRight = padding - padLeft;
  return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
}

function printGroupResults(groups) {
  console.log('Konačan plasman u grupama:');

  Object.keys(groups).forEach((groupName) => {
    console.log(
      `    Grupa ${groupName} (Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika)::`,
    );

    groups[groupName].forEach((team, index) => {
      const wins = team['Wins'];
      const losses = team['Losses'];
      const points = team['Points'];
      const scored = team['Scored'];
      const opponentScored = team['OpponentScored'];
      const scoreDifference =
        team['ScoreDifference'] >= 0
          ? `+${team['ScoreDifference']}`
          : team['ScoreDifference'];

      // Determine the team name to display
      const displayName =
        team['Team'].length > 12 ? team['ISOCode'] : team['Team'];
      const teamName = displayName.padEnd(12);

      // Center the values
      const winsStr = centerText(`${wins}`, 3);
      const lossesStr = centerText(`${losses}`, 3);
      const pointsStr = centerText(`${points}`, 3);
      const scoredStr = centerText(`${scored}`, 5);
      const opponentScoredStr = centerText(`${opponentScored}`, 5);
      const scoreDiffStr = centerText(`${scoreDifference}`, 4);

      console.log(
        `        ${
          index + 1
        }. ${teamName} ${winsStr} / ${lossesStr} / ${pointsStr} / ${scoredStr} / ${opponentScoredStr} / ${scoreDiffStr}`,
      );
    });
  });
}

let teams = groupsToTeams(groups);
teamRankingModifier(teams);
exibitionModifier(exibitions, teams);
groupPhase(getGroupPhase(groups), teams);
sortGroupResults(groups);
printGroupResults(groups);
endGame(sortPots(groups));
