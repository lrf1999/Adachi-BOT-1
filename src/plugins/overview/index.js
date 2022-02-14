import { checkAuth } from "#utils/auth";
import { hasEntrance } from "#utils/config";
import { guessPossibleNames } from "#utils/tools";
import { getName } from "./name.js";
import { doInfo } from "./info.js";

async function Plugin(msg) {
  const name = getName(msg.text);
  const guess = guessPossibleNames(name, global.names.all);

  switch (true) {
    case hasEntrance(msg.text, "overview", "info"):
      if (guess.length > 0 && false !== checkAuth(msg, "info")) {
        doInfo(msg, 1 === guess.length ? guess[0] : name, guess);
      }
      break;
  }
}

export { Plugin as run };
