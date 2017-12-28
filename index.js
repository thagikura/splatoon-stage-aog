/**
 * Copyright 2017, Takeshi Hagikura
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const request = require('request-promise');
const config = require('./config.json');

/**
 * Get and store the stage information
 */
async function getStages() {
  const iksm = 'iksm_session=' + config.IKSM_SESSION;
  const cookie = request.cookie(iksm);
  const headers = {
    'Cookie': cookie
  };
  const url = 'https://app.splatoon2.nintendo.net/api/schedules';
  const options = {
    url: url,
    method: 'GET',
    headers: headers
  };
  
  try {
    const result = await request(options);
    const json = JSON.parse(result);
    json.retrievedAt = new Date();
    return json;
  } catch (err) {
    console.log(err);
  }
};
exports.getStages = getStages;

/**
 * Build the speech text searching for the next time the gachi rule queried by the user starts.
 * 
 * @param {String} rule the string representation of the rule, the user is trying to look for the next round.
 * @param {Boolean} isLeague If true, find the next round that matches the rule in the league battle.
 */
async function buildSpeechTextByRule(rule, isLeague) {
  const now = new Date();
  // TODO: Cache stage information
  const stages = await getStages();

  const matchedRounds = [];
  if (isLeague) {
    stages.league.forEach( function (item) {
      if (item.rule.name === rule) {
        matchedRounds.push(item);
      }
    })
  } else {
    stages.gachi.forEach( function (item) {
      if (item.rule.name === rule) {
        matchedRounds.push(item);
      }
    })
  }
  console.log(matchedRounds);

  let speechText = buildFindByRuleText(rule, matchedRounds, isLeague); 
  console.log(speechText);
  return speechText; 
};
exports.buildSpeechTextByRule = buildSpeechTextByRule;

function isOlderThanTwoHours(date1, date2) {
  let hours = Math.abs(date1 - date2) / 60 * 60 * 1000
  return hours >= 2;
}

function buildFindByRuleText(rule, matchedRounds, isLeague) {
  let text = "次の" + rule + "は、";
  if (isLeague) {
    text += "リーグマッチだと";
  }
  if (matchedRounds.length > 0) {
    const first = matchedRounds[0];
    if (isStarted(first)) {
      const second = matchedRounds[1];  
      text += buildSingleRound(second);
      text += "今から" + getReadableHours(first.end_time) + "時までも" 
          + extractStages(first) + "でやってるよ。";
    } else {
      text += buildSingleRound(first);
    }
  }
  return text; 
}

function buildSingleRound(round) {
  const start = getReadableHours(round.start_time);
  return start + "時から。ステージは" + extractStages(round) + "だよ。";
}

function extractStages(round) {
  return round.stage_a.name + "と" + round.stage_b.name;
}

function getReadableHours(timeSeconds) {
  let text = "";
  const d = toDate(timeSeconds);
  const now = new Date();
  if (d.getDate() > now.getDate()) {
    text += "明日の" + d.getHours();
  } else {
    text += d.getHours();
  }
  return text;
}

function isStarted(round) {
  return round.start_time * 1000 < new Date().getTime();
}

function toDate(timeSeconds) {
  return new Date(timeSeconds * 1000);
}

// findByRule("ガチヤグラ", false)