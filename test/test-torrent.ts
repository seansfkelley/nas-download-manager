import "mocha";
import bencodec from "bencodec";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { setTrackers, addTrackersToMetaData } from "../src/background/actions/torrentTracker";

const tmpFile = path.join(__dirname, "./tmp.torrent");

const NEW_TRACKERS = ["http://1.2.3.4:1337/announce", "udp://4.3.2.1:2710/announce"];

setTrackers(NEW_TRACKERS);

const torrent_raw = fs.readFileSync(path.join(__dirname, "./test.torrent"));
const torrent: any = bencodec.decode(torrent_raw);
let oldTrackers = torrent["announce-list"].toString("utf8");
//console.log(oldTrackers);

/*
describe("other locale messages", () => {
    fs.readdirSync(path.join(__dirname, "..", "_locales"))
      .filter(locale => locale !== DEFAULT_LOCALE)
      .forEach(locale => {
        const DEFAULT_LOCALE_MESSAGES = loadLocale(DEFAULT_LOCALE);
        it(`"${locale}" locale should have a subset of the messages from the default locale`, () => {
          expect(DEFAULT_LOCALE_MESSAGES).to.include.all.keys(Object.keys(loadLocale(locale)));
        });
      });
  });
*/

//console.log('------------------------------------------')
fs.writeFileSync(tmpFile, addTrackersToMetaData(torrent_raw));

describe("other locale messages", () => {
  const tmpTorrent: any = bencodec.decode(fs.readFileSync(tmpFile));

  it("modified torrent should contain old tracker", () => {
    expect(tmpTorrent["announce-list"].toString("utf8")).to.contains(oldTrackers);
  });

  it("modified torrent should contain new tracker", () => {
    expect(tmpTorrent["announce-list"].toString("utf8")).to.contains(NEW_TRACKERS.join(","));
  });
});

fs.unlinkSync(tmpFile);
