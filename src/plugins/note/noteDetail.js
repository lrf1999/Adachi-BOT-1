﻿import db from "../../utils/database.js";
import fetch from "node-fetch";
import { getDS } from "../../utils/ds.js";
import md5 from "md5";
import { randomString } from "../../utils/tools.js";
import { v3 as uuidv3 } from "uuid";

const __API = {
  FETCH_ROLE_DAILY_NOTE: "https://api-takumi.mihoyo.com/game_record/app/genshin/api/dailyNote",
  REFERER_URL:
    "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=e202009291139501&utm_source=bbs&utm_medium=mys&utm_campaign=icon",
  SIGN_INFO_URL: "https://api-takumi.mihoyo.com/event/bbs_sign_reward/info",
  RESIGN_INFO_URL: "https://api-takumi.mihoyo.com/event/bbs_sign_reward/resign_info",
  SIGN_URL: "https://api-takumi.mihoyo.com/event/bbs_sign_reward/sign",
  RESIGN_URL: "https://api-takumi.mihoyo.com/event/bbs_sign_reward/resign",
  REWARD_URL: "https://api-takumi.mihoyo.com/event/bbs_sign_reward/home",
  LEDGER_URL: "https://hk4e-api.mihoyo.com/event/ys_ledger/monthInfo",
  GET_TOKEN_URL: "https://api-takumi.mihoyo.com/auth/api/getMultiTokenByLoginTicket",
  MISSION_STATE_URL: "https://bbs-api.mihoyo.com/apihub/sapi/getUserMissionsState",
  MYB_SIGN_URL: "https://bbs-api.mihoyo.com/apihub/sapi/signIn",
  MYB_POST_LIST_URL: "https://bbs-api.mihoyo.com/post/api/getForumPostList",
  MYB_POST_FULL_URL: "https://bbs-api.mihoyo.com/post/api/getPostFull",
  MYB_UPVOTE_URL: "https://bbs-api.mihoyo.com/apihub/sapi/upvotePost",
  MYB_SHARE_URL: "https://bbs-api.mihoyo.com/apihub/api/getShareConf",
};
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.11.1",
  Referer: "https://webstatic.mihoyo.com/",
  "x-rpc-app_version": "2.11.1",
  "x-rpc-client_type": 5,
  DS: "",
  Cookie: "",
};

async function getUserCookie(user, bot = undefined) {
  if (!(await db.includes("note", "cookie", "user", user))) {
    return undefined;
  }
  let { cookie } = await db.get("note", "cookie", { user });
  return cookie;
}

async function setUserCookie(user, userCookie, bot) {
  if (!(await db.includes("note", "cookie", "user", user))) {
    const initData = { user, cookie: userCookie };
    await db.push("note", "cookie", initData);
    return;
  }
  await db.update("note", "cookie", { user }, { cookie: userCookie });
}

async function isAuto(msg) {
  if (!(await db.includes("note", "auto", "qq", msg.uid))) {
    return { auto: false, status: 0 };
  }
  let { auto, status } = await db.get("note", "auto", { qq: msg.uid });
  return { auto, status };
}

async function changeAuto(uid, region, flag, msg) {
  if (!(await db.includes("note", "auto", "qq", msg.uid))) {
    if (flag) {
      const initData = { qq: msg.uid, auto: flag, uid: uid, region, sid: msg.sid, type: msg.type, status: 1, date: "" };
      await db.push("note", "auto", initData);
    }
    return;
  }
  await db.update(
    "note",
    "auto",
    { qq: msg.uid },
    { auto: flag, uid: uid, region, sid: msg.sid, type: msg.type, status: 1, date: "" }
  );
}

async function getMYBCookie(user, bot) {
  if (!(await db.includes("note", "myb", "user", user))) {
    return undefined;
  }
  let { cookie } = await db.get("note", "myb", { user });
  if (!cookie) return undefined;
  return cookie;
}

async function setMYBCookie(user, userCookie, bot) {
  if (!(await db.includes("note", "myb", "user", user))) {
    const initData = { user, cookie: userCookie };
    await db.push("note", "myb", initData);
    return;
  }
  await db.update("note", "myb", { user }, { cookie: userCookie });
}

function getDailyNote(role_id, server, cookie) {
  const query = { role_id, server };

  return fetch(`${__API.FETCH_ROLE_DAILY_NOTE}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query), Cookie: cookie },
  }).then((res) => res.json());
}

function getSignInfo(role_id, server, cookie) {
  const query = { region: server, act_id: "e202009291139501", uid: role_id };

  return fetch(`${__API.SIGN_INFO_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query), Cookie: cookie, Referer: __API.REFERER_URL },
  }).then((res) => res.json());
}

function getReSignInfo(role_id, server, cookie) {
  const query = { region: server, act_id: "e202009291139501", uid: role_id };

  return fetch(`${__API.RESIGN_INFO_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query), Cookie: cookie, Referer: __API.REFERER_URL },
  }).then((res) => res.json());
}

function getRewardsInfo(cookie) {
  const query = { act_id: "e202009291139501" };

  return fetch(`${__API.REWARD_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query), Cookie: cookie, Referer: __API.REFERER_URL },
  }).then((res) => res.json());
}

function mysSignIn(role_id, server, cookie) {
  const body = { act_id: "e202009291139501", region: server, uid: role_id };
  const n = "h8w582wxwgqvahcdkpvdhbh2w9casgfl";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(__API.SIGN_URL, {
    method: "POST",
    json: true,
    body: JSON.stringify(body),
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: __API.REFERER_URL,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.3.0",
      "x-rpc-app_version": "2.3.0",
      "x-rpc-client_type": 5,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

function mysReSignIn(role_id, server, cookie) {
  const body = { act_id: "e202009291139501", region: server, uid: role_id };
  const n = "h8w582wxwgqvahcdkpvdhbh2w9casgfl";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(__API.RESIGN_URL, {
    method: "POST",
    json: true,
    body: JSON.stringify(body),
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: __API.REFERER_URL,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) miHoYoBBS/2.3.0",
      "x-rpc-app_version": "2.3.0",
      "x-rpc-client_type": 5,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

function getLedger(bind_uid, bind_region, cookie, month = 0) {
  const query = {
    month: month,
    bind_uid: bind_uid,
    bind_region: bind_region,
    bbs_presentation_style: "fullscreen",
    bbs_auth_required: true,
    mys_source: "GameRecord",
  };

  return fetch(`${__API.LEDGER_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: {
      ...HEADERS,
      DS: getDS(query),
      Cookie: cookie,
      Referer:
        "https://webstatic.mihoyo.com/ys/event/e20200709ysjournal/index.html?bbs_presentation_style=fullscreen&bbs_auth_required=true&mys_source=GameRecord",
    },
  }).then((res) => res.json());
}

function getMybCookieByTicket(login_ticket, account_id) {
  const query = { login_ticket, uid: account_id, token_types: 3 };

  return fetch(`${__API.GET_TOKEN_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query) },
  }).then((res) => res.json());
}

function getMybState(cookie) {
  const n = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);
  return fetch(`${__API.MISSION_STATE_URL}`, {
    method: "GET",
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: "https://app.mihoyo.com",
      "User-Agent": "okhttp/4.8.0",
      "x-rpc-app_version": "2.8.0",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": 2,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

//1: '崩坏3', 2: '原神', 3: '崩坏2', 4: '未定事件簿', 5: '大别野'
function mybSignIn(cookie, forum) {
  const body = { gids: forum };
  const n = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(__API.MYB_SIGN_URL, {
    method: "POST",
    json: true,
    body: JSON.stringify(body),
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: "https://app.mihoyo.com",
      "User-Agent": "okhttp/4.8.0",
      "x-rpc-app_version": "2.8.0",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": 2,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

function mybPostList(cookie, forum_id) {
  const query = { forum_id, is_good: false, is_hot: false, page_size: 20, sort_type: 1 };

  return fetch(`${__API.MYB_POST_LIST_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    qs: query,
    headers: { ...HEADERS, DS: getDS(query) },
  }).then((res) => res.json());
}

function mybPostFull(cookie, post_id) {
  const query = { post_id };
  const n = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(`${__API.MYB_POST_FULL_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    json: true,
    qs: query,
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: "https://app.mihoyo.com",
      "User-Agent": "okhttp/4.8.0",
      "x-rpc-app_version": "2.8.0",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": 2,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

function mybUpVote(cookie, post_id) {
  const body = { post_id, is_cancel: false };
  const n = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(__API.MYB_UPVOTE_URL, {
    method: "POST",
    json: true,
    body: JSON.stringify(body),
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: "https://app.mihoyo.com",
      "User-Agent": "okhttp/4.8.0",
      "x-rpc-app_version": "2.8.0",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": 2,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

function mybSharePost(cookie, post_id) {
  const query = { entity_id: post_id, entity_type: 1 };
  const n = "dmq2p7ka6nsu0d3ev6nex4k1ndzrnfiy";
  const i = (Date.now() / 1000) | 0;
  const r = randomString(6);
  const c = md5(`salt=${n}&t=${i}&r=${r}`);

  return fetch(`${__API.MYB_SHARE_URL}?${new URLSearchParams(query)}`, {
    method: "GET",
    json: true,
    qs: query,
    headers: {
      ...HEADERS,
      DS: `${i},${r},${c}`,
      Cookie: cookie,
      Referer: "https://app.mihoyo.com",
      "User-Agent": "okhttp/4.8.0",
      "x-rpc-app_version": "2.8.0",
      "x-rpc-channel": "miyousheluodi",
      "x-rpc-client_type": 2,
      "x-rpc-device_id": uuidv3(cookie, uuidv3.URL).replace("-", ""),
    },
  }).then((res) => res.json());
}

async function notePromise(uid, server, userID, bot) {
  const nowTime = new Date().valueOf();
  const { data: dbData, time: lastTime } = db.get("note", "user", { uid }) || {};

  // 尝试使用缓存
  if (dbData) {
    if (lastTime && nowTime - lastTime < config.cacheAbyEffectTime * 16 * 60 * 1000) {
      bot.logger.debug(`缓存：使用 ${uid} 在 ${config.cacheAbyEffectTime} 小时内的实时便笺。`);
      return [lastTime, dbData];
    }
  }

  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);

  const { retcode, message, data } = await getDailyNote(uid, server, cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  if (!db.includes("note", "user", "uid", uid)) {
    const initData = { uid, data: [] };
    db.push("note", "user", initData);
  }

  db.update("note", "user", { uid }, { data, time: nowTime });
  return [nowTime, data];
}

async function signInfoPromise(uid, server, userID, bot) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`signInfo ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await getSignInfo(uid, server, cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function resignInfoPromise(uid, server, userID, bot) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`signInfo ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await getReSignInfo(uid, server, cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function rewardsPromise(uid, server, userID, bot) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`rewards ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await getRewardsInfo(cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function signInPromise(uid, server, userID, bot) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`signIn ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await mysSignIn(uid, server, cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function resignInPromise(uid, server, userID, bot) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`signIn ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await mysReSignIn(uid, server, cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function ledgerPromise(uid, server, userID, bot, month = 0) {
  const cookie = await getUserCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人cookie`);
  bot.logger.debug(`ledger ${uid} ${server} ${cookie}`);
  const { retcode, message, data } = await getLedger(uid, server, cookie, month);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data;
}

async function mybCookiePromise(account_id, login_ticket, userID, bot) {
  bot.logger.debug(`MYB ${account_id} ${login_ticket}`);
  const { retcode, message, data } = await getMybCookieByTicket(login_ticket, account_id);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return {
    stoken: data.list[0].token,
    cookie_token: data.list[1].token,
  };
}

async function mybStatePromise(uid, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  bot.logger.debug(`state ${uid} ${cookie}`);
  const { retcode, message, data } = await getMybState(cookie);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }
  return data.states;
}

async function mybSignPromise(uid, fourm, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  bot.logger.debug(`mybSign ${uid} ${cookie}`);
  const { retcode, message, data } = await mybSignIn(cookie, fourm);
  return { retcode, message, data };
}

async function getPostListPromise(uid, fourm, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  const { retcode, message, data } = await mybPostList(cookie, fourm);

  if (retcode !== 0) {
    return Promise.reject(`米游社接口报错: ${message}`);
  }

  return data.list;
}

async function getPostFullPromise(uid, post_id, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  const { retcode, message, data } = await mybPostFull(cookie, post_id);

  return { retcode, message, data };
}

async function upVotePostPromise(uid, post_id, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  const { retcode, message, data } = await mybUpVote(cookie, post_id);

  return { retcode, message, data };
}

async function sharePostPromise(uid, post_id, userID, bot) {
  const cookie = await getMYBCookie(uid, bot);
  if (!cookie) return Promise.reject(`未设置私人米游币cookie`);
  const { retcode, message, data } = await mybSharePost(cookie, post_id);
  bot.logger.debug(`share ${uid} ${cookie} ${post_id}`);
  return { retcode, message, data };
}

function setCacheTimeout(uid, bot) {
  if (db.includes("map", "user", "userID", uid)) {
    const { UID: id } = db.get("map", "user", { userID: uid }) || {};
    const reason = "因米游社 ID 变更而强制超时";

    if (id) {
      db.update("time", "user", { aby: id }, { time: 0 });
      bot.logger.debug(`缓存：用户 ${id} 的深渊数据${reason}。`);
      db.update("time", "user", { uid: id }, { time: 0 });
      bot.logger.debug(`缓存：用户 ${id} 的玩家数据${reason}。`);
    }
  }
}

async function checkReSign(msg, uid, region) {
  let resignInfo = await resignInfoPromise(uid, region, msg.uid, msg.bot);
  if (resignInfo.sign_cnt_missed > 0) {
    return `
本月漏签${resignInfo.sign_cnt_missed}天
米游币数量：${resignInfo.coin_cnt}
${
  resignInfo.coin_cnt >= resignInfo.coin_cost &&
  resignInfo.resign_cnt_daily < resignInfo.resign_limit_daily &&
  resignInfo.resign_cnt_monthly < resignInfo.resign_limit_monthly
    ? `可以消耗${resignInfo.coin_cost}米游币进行补签`
    : ""
}`;
  }
  return ``;
}

async function doSign(msg, uid, region) {
  let signInfo = await signInfoPromise(uid, region, msg.uid, msg.bot);
  if (signInfo.is_sign) {
    return `今日已签到,本月累计签到${signInfo.total_sign_day}天${
      signInfo.sign_cnt_missed == 0 ? "" : await checkReSign(msg, uid, region)
    }`;
  }
  if (signInfo.first_bind) {
    return `请先手动签到一次`;
  }
  let sign = await signInPromise(uid, region, msg.uid, msg.bot);
  let data = await rewardsPromise(uid, region, msg.uid, msg.bot);
  return `
${data.month}月累计签到：${signInfo.total_sign_day + 1}天
今日奖励：${data.awards[signInfo.total_sign_day].name} * ${data.awards[signInfo.total_sign_day].cnt}${
    signInfo.sign_cnt_missed == 0 ? "" : await checkReSign(msg, uid, region)
  }`;
}

function getRandomArrayElements(arr, count) {
  var shuffled = arr.slice(0),
    i = arr.length,
    min = i - count,
    temp,
    index;
  while (i-- > min) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(min);
}

async function doGetMYB(msg, uid) {
  const forums = ["崩坏3", "原神", "崩坏2", "未定事件簿", "大别野"];
  const states = await mybStatePromise(uid, msg.uid, msg.bot);
  let continuous_sign = false;
  let view_post_0 = false;
  let post_up_0 = false;
  let share_post_0 = false;
  for (var state of states) {
    if (state.mission_key == "continuous_sign") {
      continuous_sign = state.is_get_award;
    } else if (state.mission_key == "view_post_0") {
      view_post_0 = state.is_get_award;
    } else if (state.mission_key == "post_up_0") {
      post_up_0 = state.is_get_award;
    } else if (state.mission_key == "share_post_0") {
      share_post_0 = state.is_get_award;
    }
  }
  let ret = ` `;
  if (!continuous_sign) {
    for (let i = 1; i < 6; i++) {
      let { retcode, message, data } = await mybSignPromise(uid, i, msg.uid, msg.bot);
      ret += `
${forums[i - 1]}:${message}`;
    }
  } else {
    ret += `米游币已签到`;
  }
  if (!view_post_0 || !post_up_0 || !share_post_0) {
    const posts = await getPostListPromise(uid, 26, msg.uid, msg.bot);
    let post_ids = [];
    for (let post of posts) {
      post_ids.push(parseInt(post.post.post_id));
    }
    if (!view_post_0) {
      let n = 0;
      for (var post_id of getRandomArrayElements(post_ids, 3)) {
        let { retcode, message, data } = await getPostFullPromise(uid, post_id, msg.uid, msg.bot);
        if ("OK" == message) n++;
        else
          ret += `
${message}`;
      }
      ret += `
浏览（${n}/3）`;
    }
    if (!post_up_0) {
      let n = 0;
      for (var post_id of getRandomArrayElements(post_ids, 10)) {
        let { retcode, message, data } = await upVotePostPromise(uid, post_id, msg.uid, msg.bot);
        if ("OK" == message) n++;
        else
          ret += `
${message}`;
      }
      ret += `
点赞（${n}/10）`;
    }
    if (!share_post_0) {
      let n = 0;
      for (var post_id of getRandomArrayElements(post_ids, 1)) {
        let { retcode, message, data } = await sharePostPromise(uid, post_id, msg.uid, msg.bot);
        if ("OK" == message) n++;
        else
          ret += `
${message}`;
      }
      ret += `
分享（${n}/1）`;
    }
  }
  return ret;
}

async function autoSay(sid, uid, type, text) {
  for (const bot of global.bots) {
    await bot.say(sid, text, type, uid);
  }
}

function autoSignIn() {
  const records = db.get("note", "auto");
  if (undefined === records || !Array.isArray(records)) {
    return;
  }
  const today = new Date().toLocaleDateString();
  let record, message, cookie, say, status, msg, uid, region;
  for (let i = 0, len = records.length; i < len; ++i) {
    record = records[i];
    say = false;
    if (record.auto == true) {
      if (record.date && record.date != today) {
        msg = { uid: record.qq, sid: record.sid, type: record.type, bot: global.bots };
        uid = record.uid;
        region = record.region;
        status = record.status;
        if (record.status == 1 || record.status == 0) {
          cookie = getUserCookie(record.uid);
          say = true;
          if (cookie == undefined) {
            message = `自动签到出错：未设置私人Cookie`;
            if (status == 0) {
              message += `。关闭自动签到`;
              db.update("note", "auto", { qq: record.qq }, { auto: false });
            } else db.update("note", "auto", { qq: record.qq }, { status: 0 });
          } else {
            try {
                message = await doSign(msg, uid, region);
                status = 1;
            } catch (e) {
              if ("" !== e) {
                message += `
签到：${e}`;
              }
              if (status == 0) {
                message += `。关闭自动签到`;
                db.update("note", "auto", { qq: record.qq }, { auto: false });
              } else db.update("note", "auto", { qq: record.qq }, { status: 0 });
            }
//            try {
//              message = await doSign(msg, uid, region);
//              if ((await getMYBCookie(uid, msg.bot)) != undefined) {
//                message += `
//${await doGetMYB(msg, uid, region)}`;
//              }
//            } catch (e) {
//              if ("" !== e) {
//                message += `
//米游币签到：${e}`;
//              }
//            }
          }
        }
        db.update("note", "auto", { qq: record.qq }, { date: today, status });
      }
      if (say) autoSay(record.sid, record.qq, record.type, message);
    }
  }
}

export {
  notePromise,
  signInfoPromise,
  resignInfoPromise,
  rewardsPromise,
  resignInPromise,
  ledgerPromise,
  setUserCookie,
  getUserCookie,
  mybCookiePromise,
  setMYBCookie,
  getMYBCookie,
  setCacheTimeout,
  isAuto,
  changeAuto,
  doSign,
  doGetMYB,
  autoSignIn,
};
