import moment from "moment";
import "moment/locale/ru";

moment.locale(browser.i18n.getUILanguage());

export { moment };
