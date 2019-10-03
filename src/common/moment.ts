import moment from "moment";
import "moment/locale/ru";

// Explicitly fall back onto `en` as the default. For "backwards compatibility" (for the last
// five years!), defining a locale will cause moment to silently set that locale as the
// global default. This means that for users who didn't have their browser set to a language
// that we have available here, they would get localizations in the most-recently-imported
// locale rather than `en`, which is the default.
moment.locale([browser.i18n.getUILanguage(), "en"]);

export { moment };
