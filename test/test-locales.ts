import * as fs from 'fs';
import * as path from 'path';

import 'mocha';
import { expect } from 'chai';

interface I18nMessage {
  message: string;
  description: string;
  placeholders?: Record<string, {
    content: string;
    example: string;
  }>;
}

type LocaleMessages = Record<string, I18nMessage>;

function loadJson(pathRelativeToRoot: string): any {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', pathRelativeToRoot)).toString('utf8'));
}

function loadLocale(localeName: string): LocaleMessages {
  return loadJson(path.join('_locales', localeName, 'messages.json'));
}

describe('i18n', () => {
  const DEFAULT_LOCALE: string = loadJson('manifest.json').default_locale;

  function createForEachMessage(localeName: string) {
    return (fn: (message: I18nMessage, messageName: string) => void) => {
      const messages = loadLocale(localeName);
      Object.keys(messages).forEach(key => {
        fn(messages[key], key);
      });
    };
  }

  describe('manifest.json', () => {
    it('should have a default locale set', () => {
      expect(DEFAULT_LOCALE).to.be.a('string');
    });
  });

  describe('default locale messages', () => {
    const forEachMessage = createForEachMessage(DEFAULT_LOCALE);

    it('should have a message and description field which are different', () => {
      forEachMessage(({ message, description }) => {
        expect(message).to.exist;
        expect(description).to.exist;
        expect(message).to.not.equal(description);
      });
    });

    it('should have names derivable from the content', () => {
      forEachMessage(({ message }, messageName) => {
        expect(messageName).to.equal(message
          .replace(/\$[A-Z]+\$/g, substr => substr.toLowerCase())
          .replace(/[^A-Za-z0-9$_ ]/g, '')
          .replace(/ +/g, '_')
        );
      });
    });

    xit('should be referenced at least once in any "getMessage" call', () => {
      // forEachMessage((_message, messageName) => {
      //   const i18nCall = `browser.i18n.getMessage('${messageName}'`;
      // });
    });

    xit('every "getMessage" call should use a known message name', () => {
    });

    describe('with placeholders', () => {
      it('should declare all placeholders that are mentioned in the message', () => {
        forEachMessage(({ message, placeholders }) => {
          const namedPlaceholders = message.match(/\$[A-Z]+\$/g);
          if (namedPlaceholders != null) {
            expect(placeholders).to.exist;
            expect(placeholders).to.have.all.keys(namedPlaceholders.map(p => p.toLowerCase().replace(/(^\$)|(\$$)/g, '')));
          } else {
            expect(placeholders).to.not.exist;
          }
        });
      });

      it('should have "content" fields on every placeholder of the form "$n" and are the first n natural numbers', () => {
        forEachMessage(({ placeholders }) => {
          if (placeholders != null) {
            const placeholderContents = Object.keys(placeholders).map(p => placeholders[p].content);

            placeholderContents.forEach(p => {
              expect(p).to.match(/^\$[0-9]$/);
            });

            expect(placeholderContents.sort().map(p => p.replace('$', ''))).to.deep.equal(
              (Array.apply(null, new Array(placeholderContents.length)) as undefined[]).map((_value, index) => (index + 1).toString()));
          }
        });
      });

      it('should have "example" fields on every placeholder', () => {
        forEachMessage(({ placeholders }) => {
          if (placeholders != null) {
            Object.keys(placeholders).forEach(placeholderName => {
              expect(placeholders[placeholderName].example).to.exist;
            });
          }
        });
      });
    });
  });

  describe('other locale messages', () => {
    fs.readdirSync(path.join(__dirname, '..', '_locales'))
      .filter(locale => locale !== DEFAULT_LOCALE)
      .forEach(locale => {
        const DEFAULT_LOCALE_MESSAGES = loadLocale(DEFAULT_LOCALE);
        it(`"${locale}" locale should have a subset of the messages from the default locale`, () => {
          expect(DEFAULT_LOCALE_MESSAGES).to.include.all.keys(Object.keys(loadLocale(locale)));
        });
      });
  });
});
