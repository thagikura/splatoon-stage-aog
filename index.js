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

const request = require('request');
const moment = require('moment-timezone');

const IKSM_SESSION = "[REDACTED]";
const TIME_ZONE = "Asia/Tokyo"

/**
 * Get and store the stage information
 * 
 * @param {Object} execOptions
 */
function getStages(execOptions) {
  const iksm = 'iksm_session=' + IKSM_SESSION;
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
  
  const result = request(options, function(error, response, body) {
    const stagesJson = JSON.parse(body);
    const m = currentMoment();
    stagesJson.retrievedAt = m.unix();

    execOptions.callback(stagesJson);
  });
  // return json;
}
exports.getStages = getStages;

/**
 * Build the speech text searching for the next time the gachi rule queried by the user starts.
 * 
 * @param {String} rule the string representation of the rule, the user is trying to look for the next round.
 * @param {Boolean} isLeague If true, find the next round that matches the rule in the league battle.
 */
function buildSpeechTextByRule(rule, isLeague) {

  const buildText = function(stages) {
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
  }

  // TODO: Cache stage information
  const options = {
    callback: buildText,
    isLeague: isLeague
  };
  const stages = getStages(options);
}
exports.buildSpeechTextByRule = buildSpeechTextByRule;

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
  const d = moment.unix(timeSeconds);
  d.tz(TIME_ZONE);
  const now = currentMoment();
  if (d.date() > now.date()) {
    text += "明日の" + d.hours();
  } else {
    text += d.hours();
  }
  return text;
}

function isStarted(round) {
  const m = currentMoment();
  return round.start_time < m.unix();
}

function currentMoment() {
  return moment().tz(TIME_ZONE);
}

buildSpeechTextByRule("ガチエリア", true)
