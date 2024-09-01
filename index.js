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
    mods[team] = [];
    // save positive modifiers
    for (let j = 0; j < exibitionSize; j++) {
      let matchResult = results[j]['Result'];
      let [num1, num2] = matchResult.split('-').map(Number);
      let mod = num1 / num2;
      if (mod > 1) {
        mods[team].push({
          Opponent: results[j]['Opponent'],
          Modifier: mod,
        });
      }
    }
    //-------------

    // delete empty arrays
    if (mods[team].length < 1) {
      delete mods[team];
    }
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
  Object.keys(groups).forEach(function (key) {
    groups[key].forEach(function (team) {
      const ISOCode = team['ISOCode'];
      console.log(ISOCode);
      teams[ISOCode] = team;
    });
  });
  return teams;
}

//console.log(groups["A"]);
console.log(groupsToTeams(groups));
//individualGroupPhase(groups["A"])
// console.log(exibitionModifier(exibitions));
// console.log(rollScore(5, 20));
