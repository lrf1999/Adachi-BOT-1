﻿import { hasEntrance } from "../../utils/config.js";
import { basePromise } from "../../utils/detail.js";
import { getID } from "../../utils/id.js";
import {
    notePromise, signInfoPromise, resignInfoPromise, rewardsPromise, signInPromise, resignInPromise,
    ledgerPromise, setUserCookie, mybCookiePromise, mybStatePromise, getPostListPromise, getPostFullPromise,
    upVotePostPromise, sharePostPromise, setMYBCookie, mybSignPromise } from "./noteDetail.js";

function getTime(s, offset) {
    if (s + offset < 0)
        return [0, 0, 0, 0];
    const sec = parseInt(s + offset);
    const min = parseInt(sec / 60);
    const hour = parseInt(min / 60);
    const day = parseInt(hour / 24);
    return [day, hour % 24, min % 60, sec % 60];
}

async function doReSign(msg, uid, region) {
    let signInfo = await signInfoPromise(uid, region, msg.uid, msg.bot);
    if (!signInfo.is_sign) {
        return `今日还未签到`;
    }
    if (signInfo.sign_cnt_missed == 0)
        return `本月不需要补签`;
    let resignInfo = await resignInfoPromise(uid, region, msg.uid, msg.bot);
    if (resignInfo.coin_cnt < resignInfo.coin_cost)
        return `补签需要${resignInfo.coin_cost}米游币，当前只有${resignInfo.coin_cnt}米游币`;
    if (resignInfo.resign_cnt_monthly >= resignInfo.resign_limit_monthly)
        return `本月补签次数已用完`;
    if (resignInfo.resign_cnt_daily >= resignInfo.resign_limit_daily)
        return `今日补签次数已用完`;
    let sign = await resignInPromise(uid, region, msg.uid, msg.bot);
    let data = await rewardsPromise(uid, region, msg.uid, msg.bot);
    return `
${data.month}月累计签到：${signInfo.total_sign_day + 1}天
补签奖励：${data.awards[signInfo.total_sign_day].name} * ${data.awards[signInfo.total_sign_day].cnt}${resignInfo.sign_cnt_missed - 1 > 0 ? `
本月漏签${resignInfo.sign_cnt_missed - 1}天` : `` }
本月剩余补签次数${resignInfo.resign_limit_monthly - resignInfo.resign_cnt_monthly - 1 }`;
}

async function checkReSign(msg, uid, region) {
    let resignInfo = await resignInfoPromise(uid, region, msg.uid, msg.bot);
    if (resignInfo.sign_cnt_missed > 0) {
        return `
本月漏签${resignInfo.sign_cnt_missed}天
米游币数量：${resignInfo.coin_cnt}
${resignInfo.coin_cnt >= resignInfo.coin_cost && resignInfo.resign_cnt_daily < resignInfo.resign_limit_daily && resignInfo.resign_cnt_monthly < resignInfo.resign_limit_monthly ? `可以消耗${resignInfo.coin_cost}米游币进行补签`:'' }`;
    }
    return ``;
}

async function doSign(msg, uid, region) {
    let signInfo = await signInfoPromise(uid, region, msg.uid, msg.bot);
    if (signInfo.is_sign) {
        return `今日已签到,本月累计签到${signInfo.total_sign_day}天${signInfo.sign_cnt_missed == 0 ? '' : await checkReSign(msg, uid, region)}`;
    }
    if (signInfo.first_bind) {
        return `请先手动签到一次`;
    }
    let sign = await signInPromise(uid, region, msg.uid, msg.bot);
    let data = await rewardsPromise(uid, region, msg.uid, msg.bot);
    return `
${data.month}月累计签到：${signInfo.total_sign_day + 1}天
今日奖励：${data.awards[signInfo.total_sign_day].name} * ${data.awards[signInfo.total_sign_day].cnt}${signInfo.sign_cnt_missed == 0 ? '' : await checkReSign(msg, uid, region)}`;
}

async function doLedger(msg, uid, region) {
    let data = await ledgerPromise(uid, region, msg.uid, msg.bot);
    if (hasEntrance(msg.text, "note", "lastledger"))
        data = await ledgerPromise(uid, region, msg.uid, msg.bot, data.data_month == 1 ? 12 : data.data_month - 1);
    else if (hasEntrance(msg.text, "note", "lastlastledger"))
        data = await ledgerPromise(uid, region, msg.uid, msg.bot, data.data_month > 2 ? data.data_month - 2 : 10 + data.data_month);
    if (hasEntrance(msg.text, "note", "ledger"))
        return `
旅行者${data.data_month}月札记
当月共获取：
原石：${data.month_data.current_primogems}
摩拉：${data.month_data.current_mora}
旅行者今日已获取${data.day_data.current_primogems}原石，${data.day_data.current_mora}摩拉，明天也要好好努力哦？`;
    else
        return `
旅行者${data.data_month}月札记
当月共获取：
原石：${data.month_data.current_primogems}
摩拉：${data.month_data.current_mora}
原石收入${data.month_data.primogems_rate == 0 ? "跟上个月差不多" : `比上个月${data.month_data.primogems_rate > 0 ? `增加${data.month_data.primogems_rate}` : `减少${-data.month_data.primogems_rate}`}%`},
摩拉收入${data.month_data.mora_rate == 0 ? "跟上个月差不多" : `比上个月${data.month_data.mora_rate > 0 ? `增加${data.month_data.mora_rate}` : `减少${-data.month_data.mora_rate}`}%`}。`;
}

async function doNote(msg, uid, region) {
    const noteInfo = await notePromise(uid, region, msg.uid, msg.bot);
    const data = noteInfo[1];
    const baseTime = noteInfo[0];
    const nowTime = new Date().valueOf();
    const crtime = parseInt(data.resin_recovery_time) + (baseTime - nowTime) / 1000;
    const cr = crtime <= 0 ? data.max_resin : parseInt((76800 - crtime) / 60 / 8);
    let message = `
树脂${cr}/${data.max_resin} 委托${data.finished_task_num}/${data.total_task_num} 派遣${data.current_expedition_num}/${data.max_expedition_num}`;
    let [day, hour, min, sec] = getTime(parseInt(data.resin_recovery_time), (baseTime - nowTime) / 1000);
    message += `
树脂回满时间：${hour}时${min}分${sec}秒`;
    message += `
[每日委托]奖励${data.is_extra_task_reward_received ? "已领取" : "未领取"}`;
    message += `
本周剩余消耗减半次数${data.remain_resin_discount_num}/${data.resin_discount_num_limit}`;
    let num = 1;
    for (var expedition of data.expeditions) {
        if (expedition)
            if (expedition.status == "Ongoing") {
                [day, hour, min, sec] = getTime(parseInt(expedition.remained_time), (baseTime - nowTime) / 1000);
                message += `
派遣${num}：${hour}时${min}分${sec}秒`;
            } else if (expedition.status == "Finished") {
                message += `
派遣${num}：已完成`;
            }
        num++;
    }
    return message;
}

async function doSetCookie(msg, uid) {
    let cookie = msg.text.slice(9);
    cookie = cookie.replace(new RegExp("'", "gm"), "");
    if (cookie.indexOf("cookie_token") == -1 || cookie.indexOf("account_id") == -1) {
        return ` 未找到登录信息！请登录并进入米哈游通行证页面，再次尝试获取Cookie。`;
    }
    await setUserCookie(uid, cookie, msg.bot);
    return ` 已设置cookie`;
}

function getCookieValue(loginCookie, key) {
    let s = loginCookie.indexOf(key);
    if (s == -1)
        return undefined;
    s += key.length + 1;
    let e = loginCookie.indexOf(';', s);
    if (e == -1)
        return loginCookie.substring(s);
    return loginCookie.substring(s, e);
}

async function doSetMYBCookie(msg, uid) {
    let cookie = msg.text.slice(9);
    cookie = cookie.replace(new RegExp("'", "gm"), "");
    if (cookie.indexOf("stuid") == -1 || cookie.indexOf("stoken") == -1 || cookie.indexOf("login_ticket") == -1) {
        let login_ticket = getCookieValue(cookie, "login_ticket");
        let account_id = getCookieValue(cookie, "login_uid");
        if (account_id == undefined)
            account_id = getCookieValue(cookie, account_id);
        if (login_ticket == undefined || account_id == undefined)
            return ` 未找到登录信息！请登录并进入米哈游通行证页面，再次尝试获取Cookie。`;
        else {
            const mybToken = mybCookiePromise(account_id, login_ticket, msg.uid, msg.bot);
            cookie = `stuid=${account_id}; stoken=${mybToken.list[0].token}; login_ticket=${login_ticket}`;
        }
    }

    await setUserCookie(uid, cookie, msg.bot);
    return ` 已设置cookie`;
}

async function doGetMYB(msg, uid) {
    
    return ` 米游币签到开发中……`;
}

async function Plugin(msg) {
    const dbInfo = await getID(msg.text, msg.uid); // 米游社 ID
    let uid, region ;
    let message = undefined;
    if ("string" === typeof dbInfo) {
        await msg.bot.say(sendID, dbInfo, msg.type, msg.uid);
        return;
    }

    try {
        const baseInfo = await basePromise(dbInfo, msg.uid, msg.bot);
        uid = baseInfo[0];
        region = baseInfo[1];
        if (hasEntrance(msg.text, "note", "set_user_cookie")) {
            message = await doSetCookie(msg, uid);
        } else if (hasEntrance(msg.text, "note", "re_sign")) {
            message = await doReSign(msg, uid, region);
        } else if (hasEntrance(msg.text, "note", "sign_in")) {
            message = await doSign(msg, uid, region);
        } else if (hasEntrance(msg.text, "note", "set_myb_cookie")) {
            message = await doSetMYBCookie(msg, uid, region);
        } else if (hasEntrance(msg.text, "note", "get_myb")) {
            message = await doGetMYB(msg, uid, region);
        } else if (hasEntrance(msg.text, "note", "ledger") || hasEntrance(msg.text, "note", "lastledger") || hasEntrance(msg.text, "note", "lastlastledger")) {
            message = await doLedger(msg, uid, region);
        } else {
            message = await doNote(msg, uid, region);
        }
        
    } catch (e) {
        // 抛出空串则使用缓存
        if ("" !== e) {
            await msg.bot.say(msg.sid, ` ${e}`, msg.type, msg.uid);
            return;
        }
    }
    if (message != undefined)
        await msg.bot.say(msg.sid, message, msg.type, msg.uid);
}

async function Wrapper(Message, bot) {
    try {
        await Plugin(Message, bot);
    } catch (e) {
        bot.logger.error(e);
    }
}

export { Wrapper as run };