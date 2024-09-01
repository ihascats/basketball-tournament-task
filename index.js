const fs = require('fs');

// Read JSON files
const exibitions = JSON.parse(fs.readFileSync('exibitions.json', 'utf-8'));
const groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));

let modifiers = {};
function setModifier(obj, modifiersObject) {
  const exibitionsObject = obj;
  const size = Object.keys(exibitionsObject).length;
  let mods = modifiersObject;
  for (let i = 0; i < size; i++) {
    console.log('----------');
    let team = Object.keys(exibitionsObject)[i];
    let results = exibitionsObject[Object.keys(exibitionsObject)[i]];
    const exibitionSize =
      exibitionsObject[Object.keys(exibitionsObject)[i]].length;
    console.log(team);
    console.log(results);
    console.log(results[0]['Result']);
    mods[team] = [];
    for (let j = 0; j < exibitionSize; j++) {
      console.log(j);
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
    console.log('----------');
  }
}

console.log(groups['A'][0]);
setModifier(exibitions, modifiers);
console.log(modifiers);
