
const fs = require('fs');
const events = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const event = events.find(e => e.title.includes('Sociable Singles Trivia'));
console.log(JSON.stringify(event, null, 2));
