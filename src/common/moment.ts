import moment from "moment";
import "moment/locale/ru";
import "moment/locale/de";
import "moment/locale/fr";
import "moment/locale/zh-cn";

// Explicitly fall back onto `en` as the default. For "backwards compatibility" (for the last
// five years!), defining a locale will cause moment to silently set that locale as the
// global default. This means that for users who didn't have their browser set to a language
// that we have available here, the most-recently-imported locale will be used rather than
// `en` (which is the default for both moment and this extension).
// https://github.com/moment/moment/blob/6a06e7a0db2c83fb92aa72bbf6bde955d4c75a16/src/lib/locale/locales.js#L129-L132
moment.locale([browser.i18n.getUILanguage(), "en"]);

export { moment };
