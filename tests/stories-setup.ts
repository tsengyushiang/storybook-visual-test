import { type Page } from '@playwright/test';
import index from "../storybook-static/index.json" with { type: "json" };

declare global {
  var __storyResult: { status: string; errors: string[] };
}

interface Entry {
  id: string;
  title: string;
  name: string;
  type: string;
  tags?: string[];
}

interface Report {
  type: string;
  status: string;
  result?: { violations?: { id: string; help: string }[] };
}

const storybookURL = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

export function loadStories(): [string, (args: { page: Page }) => Promise<void>][] {
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story' && entry.tags?.includes('test'))
    .map((entry) => [
      `Story: ${entry.title} / ${entry.name}`,
      async ({ page }) => visitStory(page, entry),
    ]);
}

async function visitStory(page: Page, entry: Entry) {
  await page.addInitScript(captureStoryResult);
  await page.goto(`${storybookURL}/iframe.html?id=${entry.id}&viewMode=story`);

  const handle = await page.waitForFunction(() => globalThis.__storyResult);
  const result = await handle.jsonValue();

  if (result.status !== 'success' || result.errors.length > 0) {
    throw new Error(
      [
        `Story "${entry.title} › ${entry.name}" ${result.status === 'missing' ? 'is missing' : 'failed'}.`,
        `Open it in Storybook: ${storybookURL}/?path=/story/${entry.id}`,
        '',
        ...result.errors,
      ].join('\n')
    );
  }
}

function captureStoryResult() {
  const errors: string[] = [];
  const serialize = (error: Error) => error.stack ?? `${error.name}: ${error.message}`;

  let channel: any;
  Object.defineProperty(globalThis, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => channel,
    set: (value) => {
      channel = value;
      channel.on('storyErrored', ({ title, description }: Record<string, string>) =>
        errors.push(`${title}\n${description}`)
      );
      channel.on('storyThrewException', (error: Error) => errors.push(serialize(error)));
      channel.on('playFunctionThrewException', (error: Error) => errors.push(serialize(error)));
      channel.on('unhandledErrorsWhilePlaying', (unhandled: Error[]) =>
        errors.push(...unhandled.map(serialize))
      );
      channel.on('storyMissing', (id: string) => {
        globalThis.__storyResult = {
          status: 'missing',
          errors: [`Story "${id}" not found`],
        };
      });
      channel.on(
        'storyFinished',
        ({ status, reporters }: { status: string; reporters: Report[] }) => {
          for (const report of reporters.filter((report) => report.status === 'failed')) {
            const violations = report.result?.violations ?? [];
            errors.push(
              [
                `${report.type} report failed`,
                ...violations.map((v) => `- ${v.id}: ${v.help}`),
              ].join('\n')
            );
          }
          globalThis.__storyResult = { status, errors };
        }
      );
    },
  });
}