import * as fs from "fs";
import * as path from "path";

import { sync as globSync } from "glob";

interface I18nMessage {
  message: string;
  description: string;
  test_skip_reference_check?: boolean;
  placeholders?: Record<
    string,
    {
      content: string;
      example: string;
    }
  >;
}

type LocaleMessages = Record<string, I18nMessage>;

function loadJson(pathRelativeToRoot: string): any {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", pathRelativeToRoot)).toString("utf8"),
  );
}

function loadLocale(localeName: string): LocaleMessages {
  return loadJson(path.join("_locales", localeName, "messages.json"));
}

function createForEachMessage(localeName: string) {
  return (fn: (message: I18nMessage, messageName: string) => void) => {
    const messages = loadLocale(localeName);
    for (const key of Object.keys(messages)) {
      fn(messages[key], key);
    }
  };
}

describe("i18n", () => {
  const DEFAULT_LOCALE: string = loadJson("manifest.json").default_locale;
  const SOURCE_FILES_BY_NAME: Record<string, string> = {};

  for (const filename of globSync(path.join(__dirname, "..", "src", "**", "*.ts*"))) {
    if (!filename.endsWith(".d.ts")) {
      SOURCE_FILES_BY_NAME[filename] = fs.readFileSync(filename).toString("utf8");
    }
  }

  describe("manifest.json", () => {
    it("should have a default locale set", () => {
      expect(typeof DEFAULT_LOCALE).toBe("string");
    });
  });

  describe("default locale messages", () => {
    const forEachMessage = createForEachMessage(DEFAULT_LOCALE);

    it("should have a message and description field which are different", () => {
      forEachMessage(({ message, description }, messageName) => {
        expect(message).not.toBeNil();
        expect(description).not.toBeNil();
        // Prefixing both sides keeps the message name visible in the failure diff.
        expect(`${messageName}: ${message}`).not.toBe(`${messageName}: ${description}`);
      });
    });

    it("should have names derivable from the content", () => {
      forEachMessage(({ message }, messageName) => {
        expect(messageName).toBe(
          message
            .replace(/\$[A-Z]+\$/g, (substr) => substr.toLowerCase())
            .replace(/[^A-Za-z0-9$_ ]/g, "")
            .replace(/ +/g, "_")
            .replace(/\$/g, "Z"),
        );
      });
    });

    it('should be referenced at least once in any "getMessage" call', () => {
      const unreferenced: string[] = [];
      forEachMessage(({ test_skip_reference_check }, messageName) => {
        if (!test_skip_reference_check) {
          const I18N_CALL_REGEX = new RegExp(`browser\\.i18n\\.getMessage\\(\\s*"${messageName}"`);
          const isReferenced = Object.keys(SOURCE_FILES_BY_NAME).some((name) => {
            return SOURCE_FILES_BY_NAME[name].search(I18N_CALL_REGEX) !== -1;
          });
          if (!isReferenced) {
            unreferenced.push(messageName);
          }
        }
      });
      expect(unreferenced).toEqual([]);
    });

    it('every "getMessage" call should use a known message name', () => {
      const I18N_CALL_REGEX = /browser\.i18n\.getMessage\(\s*"([^"]*)"/g;
      const MESSAGES = loadLocale(DEFAULT_LOCALE);
      for (const name of Object.keys(SOURCE_FILES_BY_NAME)) {
        const content = SOURCE_FILES_BY_NAME[name];
        let match;
        let didMatch = false;
        do {
          match = I18N_CALL_REGEX.exec(content);
          if (match != null) {
            didMatch = true;
            const stringName = match[1];
            expect(MESSAGES[stringName]).not.toBeNil();
          }
        } while (match != null);

        // Note that this doesn't use the full browser.i18n.getMessage name because it's
        // trying to guard against formatting changes that might cause such a strict
        // regex to fail, such as breaking lines across the dot.
        if (!didMatch && /getMessage/.exec(content)) {
          throw new Error(`${name} appears to have an untested getMessage call`);
        }
      }
    });

    describe("with placeholders", () => {
      it("should declare all placeholders that are mentioned in the message", () => {
        forEachMessage(({ message, placeholders }) => {
          const namedPlaceholders = message.match(/\$[A-Z]+\$/g);
          if (namedPlaceholders != null) {
            expect(placeholders).not.toBeNil();
            expect(Object.keys(placeholders!).sort()).toEqual(
              namedPlaceholders.map((p) => p.toLowerCase().replace(/(^\$)|(\$$)/g, "")).sort(),
            );
          } else {
            expect(placeholders).toBeNil();
          }
        });
      });

      it('should have "content" fields on every placeholder of the form "$n" and are the first n natural numbers', () => {
        forEachMessage(({ placeholders }) => {
          if (placeholders != null) {
            const placeholderContents = Object.keys(placeholders).map(
              (p) => placeholders[p].content,
            );

            for (const p of placeholderContents) {
              expect(p).toMatch(/^\$[0-9]$/);
            }

            expect(placeholderContents.sort().map((p) => p.replace("$", ""))).toStrictEqual(
              Array.from({ length: placeholderContents.length }, (_value, index) =>
                (index + 1).toString(),
              ),
            );
          }
        });
      });

      it('should have "example" fields on every placeholder', () => {
        forEachMessage(({ placeholders }) => {
          if (placeholders != null) {
            for (const placeholderName of Object.keys(placeholders)) {
              expect(placeholders[placeholderName].example).not.toBeNil();
            }
          }
        });
      });
    });
  });

  describe("other locale messages", () => {
    const OTHER_LOCALES = fs
      .readdirSync(path.join(__dirname, "..", "_locales"))
      .filter((locale) => locale !== DEFAULT_LOCALE);

    it.each(OTHER_LOCALES)(
      '"%s" locale should have a subset of the messages from the default locale',
      (locale) => {
        expect(Object.keys(loadLocale(DEFAULT_LOCALE))).toEqual(
          expect.arrayContaining(Object.keys(loadLocale(locale))),
        );
      },
    );

    // Descriptions are instructions for translators, not translated content.
    it.each(OTHER_LOCALES)(
      '"%s" locale should copy its descriptions verbatim from the default locale',
      (locale) => {
        const defaultMessages = loadLocale(DEFAULT_LOCALE);
        const messages = loadLocale(locale);
        for (const messageName of Object.keys(messages)) {
          expect(messages[messageName].description).toBe(defaultMessages[messageName]?.description);
        }
      },
    );
  });
});
