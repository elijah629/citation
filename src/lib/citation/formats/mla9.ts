import type { Document, Text } from "@contentful/rich-text-types";
import { BLOCKS } from "@contentful/rich-text-types";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { z } from "zod";
import {
  fuseContributionLists,
  improveMLA9AccuracyFromArticleAI,
} from "@/app/actions";
import type { Citation } from "../csl";

export const contributorsSchema = z
  .object({
    authors: z.array(z.string()),
    editors: z.array(z.string()),
  })
  .partial();

export type MLA9Contributors = z.infer<typeof contributorsSchema>;

export const mla9 = z
  .object({
    contributors: contributorsSchema,
    page: z
      .object({
        title: z.string(),
        date_published: z.string(), // z.coerce.date()
        url: z.url(),
        date_accessed: z.string(), // z.coerce.date()
      })
      .partial(),
    website: z
      .object({
        name: z.string(),
        publisher: z.string(),
      })
      .partial(),
  })
  .partial();

// Returns original if something didn't work
export async function improveMLA9Accuracy(
  mla9: Citation["mla9"],
  webpageBody: string,
): Promise<Citation["mla9"]> {
  const { document } = parseHTML(webpageBody);
  const article = new Readability(document).parse();

  const readabilityCitation: Citation["mla9"] | undefined = article
    ? {
        page: {
          title: article.title || mla9.page?.title,
          date_accessed: mla9.page?.date_accessed,
          url: mla9.page?.url,
          date_published: article.publishedTime
            ? new Date(article.publishedTime).toISOString()
            : mla9.page?.date_published,
        },
        website: {
          name: article.siteName || mla9.website?.name,
          publisher: mla9.website?.publisher,
        },
        contributors:
          (await fuseContributionLists({
            byline: article.byline,
            contributors: mla9.contributors,
          })) ?? mla9.contributors,
      }
    : undefined;

  const baseCitation = readabilityCitation ?? mla9;

  // Fallback to whatever this is
  // Very bad parser and should be replaced/improved
  const textContent = article?.textContent
    ? article.textContent
    : document.body.innerText
        .replaceAll(/[\n\t]+/g, " ") // AHHHHHHHHHHH
        .replaceAll(/ class=(["']).*\1/g, "");

  try {
    // Solution: Paste it all into an LLM
    const improvedMLA = await improveMLA9AccuracyFromArticleAI(
      baseCitation,
      textContent,
    );

    return improvedMLA;
  } catch (e) {
    console.error(e);
    return baseCitation;
  }
}

export function formatMLA9(data: Citation["mla9"]): Document {
  const content: Text[] = [];

  const authors =
    data.contributors?.authors?.map((name) => name.trim()).filter(Boolean) ??
    [];
  const editors =
    data.contributors?.editors?.map((name) => name.trim()).filter(Boolean) ??
    [];

  const formattedAuthors = format_authors(authors);

  if (formattedAuthors) {
    content.push(createTextNode(`${formattedAuthors} `));
  }

  if (data.page?.title) {
    content.push(createTextNode(`“${data.page.title}.” `));
  }

  if (data.website?.name) {
    content.push(createTextNode(data.website.name, [{ type: "italic" }]));
    content.push(createTextNode(", "));
  }

  if (editors.length) {
    content.push(createTextNode(`edited by ${format_editors(editors)}, `));
  }

  if (data.website?.publisher) {
    content.push(createTextNode(`${data.website.publisher}, `));
  }

  if (data.page?.date_published) {
    const hasLocation = data.page.url || data.page.date_accessed;
    content.push(
      createTextNode(
        `${format_date(new Date(data.page.date_published))}${hasLocation ? ", " : "."}`,
      ),
    );
  }

  if (data.page?.url) {
    const hasAccessedDate = Boolean(data.page.date_accessed);
    content.push(
      createTextNode(
        `${format_url(data.page.url)}${hasAccessedDate ? ". " : "."}`,
      ),
    );
  }

  if (data.page?.date_accessed) {
    if (!data.page.url && content.length) {
      const last = content[content.length - 1];
      const trimmed = last.value.trimEnd();
      if (!trimmed.endsWith(".")) {
        last.value = `${trimmed.replace(/[,;:]$/, "")}. `;
      } else if (!trimmed.endsWith(". ")) {
        last.value = `${trimmed} `;
      }
    }

    content.push(
      createTextNode(
        `Accessed ${format_date(new Date(data.page.date_accessed))}.`,
      ),
    );
  }

  return {
    nodeType: BLOCKS.DOCUMENT,
    content: [
      {
        nodeType: BLOCKS.PARAGRAPH,
        content,
        data: {},
      },
    ],
    data: {},
  };
}

function format_name(name: string) {
  const names = name.split(" ");
  if (names.length === 1) {
    return name;
  }

  const [last, ...first] = name.split(" ").reverse();
  return `${last}, ${first.join(" ")}`;
}

function format_authors(names: string[]) {
  if (!names.length) {
    return "";
  }

  if (names.length === 1) {
    return `${format_name(names[0])}.`;
  }

  if (names.length === 2) {
    return `${format_name(names[0])}, and ${names[1]}.`;
  }

  return `${format_name(names[0])}, et al.`;
}

function format_editors(names: string[]) {
  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names[0]}, et al.`;
}

function format_date(date: Date) {
  return `${date.getDate()} ${
    [
      "Jan.",
      "Feb.",
      "Mar.",
      "Apr.",
      "May",
      "June",
      "July",
      "Aug.",
      "Sept.",
      "Oct.",
      "Nov.",
      "Dec.",
    ][date.getMonth()]
  } ${date.getFullYear()}`;
}

function format_url(url: string) {
  const u = new URL(url);
  return u.host + (u.pathname === "/" ? "" : u.pathname) + u.search + u.hash;
}

function createTextNode(
  value: string,
  marks: Array<{ type: string }> = [],
): Text {
  return {
    nodeType: "text",
    value,
    marks,
    data: {},
  };
}
