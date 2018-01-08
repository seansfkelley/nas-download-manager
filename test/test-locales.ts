import * as fs from 'fs';
import * as path from 'path';
import { sync as globSync } from 'glob';

import 'mocha';
import { expect } from 'chai';

interface I18nMessage {
  message: string;
  description: string;
  test_skip_reference_check?: boolean;
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

function createForEachMessage(localeName: string) {
  return (fn: (message: I18nMessage, messageName: string) => void) => {
    const messages = loadLocale(localeName);
    Object.keys(messages).forEach(key => {
      fn(messages[key], key);
    });
  };
}

describe('i18n', () => {
  const DEFAULT_LOCALE: string = loadJson('manifest.json').default_locale;
  const SOURCE_FILES_BY_NAME: Record<string, string> = {};

  globSync(path.join(__dirname, '..', 'src', '**', '*.ts*')).forEach(filename => {
    SOURCE_FILES_BY_NAME[filename] = fs.readFileSync(filename).toString('utf8');
  });

  describe('manifest.json', () => {
    it('should have a default locale set', () => {
      expect(DEFAULT_LOCALE).to.be.a('string');
    });
  });

  describe('default locale messages', () => {
    const forEachMessage = createForEachMessage(DEFAULT_LOCALE);

    it('should have a message and description field which are different', () => {
      forEachMessage(({ message, description }, messageName) => {
        expect(message, `message for ${messageName}`).to.exist;
        expect(description, `description for ${messageName}`).to.exist;
        expect(message).to.not.equal(description, messageName);
      });
    });

    it('should have names derivable from the content', () => {
      forEachMessage(({ message }, messageName) => {
        expect(messageName).to.equal(
          message
            .replace(/\$[A-Z]+\$/g, substr => substr.toLowerCase())
            .replace(/[^A-Za-z0-9$_ ]/g, '')
            .replace(/ +/g, '_')
            .replace(/\$/g, 'Z')
        );
      });
    });

    it('should be referenced at least once in any "getMessage" call', () => {
      forEachMessage(({ test_skip_reference_check }, messageName) => {
        if (!test_skip_reference_check) {
          const I18N_CALL_REGEX = new RegExp(`browser\\.i18n\\.getMessage\\(\\s*'${messageName}'`);
          expect(Object.keys(SOURCE_FILES_BY_NAME).some(name => {
            return SOURCE_FILES_BY_NAME[name].search(I18N_CALL_REGEX) !== -1;
          }), messageName).to.be.true;
        }
      });
    });

    it('every "getMessage" call should use a known message name', () => {
      const I18N_CALL_REGEX = /browser\.i18n\.getMessage\(\s*'([^']*)'/g;
      const MESSAGES = loadLocale(DEFAULT_LOCALE);
      Object.keys(SOURCE_FILES_BY_NAME).forEach(name => {
        const content = SOURCE_FILES_BY_NAME[name];
        let match;
        do {
          match = I18N_CALL_REGEX.exec(content);
          if (match != null) {
            const stringName = match[1];
            expect(MESSAGES[stringName], stringName).to.exist;
          }
        } while(match != null);
      });
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
