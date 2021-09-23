import puppeteer from "puppeteer";
import schedule from "node-schedule";
import { gachaUpdate } from "./update.js";
import { newServer } from "./server.js";
import { newDB } from "./database.js";

async function databaseInitialize() {
  await newDB("map");
  await newDB("time");
  await newDB("info");
  await newDB("artifact");
  await newDB("character");
  await newDB("authority");
  await newDB("gacha", { user: [], data: [] });
  await newDB("music", { source: [] });
  await newDB("aby");
  await newDB("cookies", { cookie: [], uid: [] });
}

async function init() {
  newServer(9934);
  await databaseInitialize();
  gachaUpdate();

  schedule.scheduleJob("0 31 11 * * *", () => {
    gachaUpdate();
  });
  schedule.scheduleJob("0 1 18 * * *", () => {
    gachaUpdate();
  });

  // TODO 调度一些数据库清理函数
  // 这里 lowdb 支持数据库异步读写吗

  global.browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export default init;
