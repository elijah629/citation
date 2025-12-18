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
    authors: z.array(z.string()).nullable(),
    editors: z.array(z.string()).nullable(),
  })
  .strict();

export type MLA9Contributors = z.infer<typeof contributorsSchema>;

export const mla9 = z
  .object({
    contributors: contributorsSchema.nullable(),
    page: z
      .object({
        title: z.string().nullable(),
        url: z.string().nullable(),
        date_published: z.iso.date().nullable(),
        date_accessed: z.iso.date().nullable(),
      })
      .strict(),
    website: z
      .object({
        name: z.string().nullable(),
        publisher: z.string().nullable(),
      })
      .strict(),
  })
  .strict();

// Returns original if something didn't work
export async function improveMLA9Accuracy(
  mla9: Citation["mla9"],
  webpageBody: string,
): Promise<Citation["mla9"]> {
  const { document: doc } = parseHTML(webpageBody);
  const article = new Readability(doc).parse();
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
        contributors: await fuseContributionLists({
          byline: article.byline ?? null,
          contributors: mla9.contributors,
        }),
      }
    : undefined;

  const baseCitation = readabilityCitation ?? mla9;

  const textContent = article?.textContent ?? webpageBody;

  // Solution: Paste it all into an LLM
  const improvedMLA = await improveMLA9AccuracyFromArticleAI(
    baseCitation,
    textContent,
  );

  improvedMLA.page!.date_accessed ??= new Date().toISOString();

  console.log(
    baseCitation,
    improvedMLA,
    JSON.stringify(baseCitation) === JSON.stringify(improvedMLA),
  );

  return improvedMLA;
}

// --- MLA9 formatting (web page subset) ---
// Template (relevant parts):
// Author. "Title of source." Title of container, Other contributors, Publisher, Publication date, Location. Accessed Date.
// (MLA core elements template)

export function formatMLA9(data: Citation["mla9"]): Document {
  const content: Text[] = [];

  const authors =
    data.contributors?.authors?.map((n) => n.trim()).filter(Boolean) ?? [];
  const editors =
    data.contributors?.editors?.map((n) => n.trim()).filter(Boolean) ?? [];

  const hasWebsiteName = Boolean(data.website?.name?.trim());
  const publisher =
    dedupePublisher(
      data.website?.publisher ?? undefined,
      data.website?.name ?? undefined,
    ) ?? undefined;

  const hasPublisher = Boolean(publisher?.trim());
  const hasPublishedDate = Boolean(data.page?.date_published);
  const hasUrl = Boolean(data.page?.url);
  const hasAccessed = Boolean(data.page?.date_accessed);

  // AUTHOR.
  const authorStr = formatAuthors(authors);
  if (authorStr) pushText(content, authorStr + " ");

  // "TITLE OF SOURCE."
  if (data.page?.title?.trim()) {
    pushText(content, quoteTitle(data.page.title) + " ");
  }

  // TITLE OF CONTAINER,
  if (hasWebsiteName) {
    pushText(content, data.website!.name!.trim(), [{ type: "italic" }]);

    const hasMoreAfterContainer =
      editors.length || hasPublisher || hasPublishedDate || hasUrl;
    pushText(content, hasMoreAfterContainer ? ", " : ". ");
  }

  // Other contributors (EDITED BY ...),
  if (editors.length) {
    const editorsStr = `edited by ${formatEditors(editors)}`;
    const hasMoreAfterEditors = hasPublisher || hasPublishedDate || hasUrl;
    pushText(content, editorsStr + (hasMoreAfterEditors ? ", " : ". "));
  }

  // PUBLISHER,
  if (hasPublisher) {
    const hasMoreAfterPublisher = hasPublishedDate || hasUrl;
    pushText(
      content,
      publisher!.trim() + (hasMoreAfterPublisher ? ", " : ". "),
    );
  }

  // PUBLICATION DATE,
  if (hasPublishedDate) {
    const dateStr = formatMLADate(data.page!.date_published!);
    const hasMoreAfterDate = hasUrl;
    pushText(content, dateStr + (hasMoreAfterDate ? ", " : ". "));
  }

  // LOCATION (URL).  (URL without http(s) is typical.)
  if (hasUrl) {
    const urlStr = formatUrlForMLA(data.page!.url!);
    // If accessed date exists, URL ends with period + space; otherwise period.
    pushText(content, urlStr + (hasAccessed ? ". " : "."));
  }

  // ACCESSED DATE.
  if (hasAccessed) {
    pushText(content, `Accessed ${formatMLADate(data.page!.date_accessed!)}.`);
  }

  // If we ended up with a trailing ", " (shouldn’t happen now), clean it.
  trimTrailingCommaSpace(content);

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

// --- helpers ---

function pushText(
  nodes: Text[],
  value: string,
  marks: Array<{ type: string }> = [],
) {
  if (!value) return;
  nodes.push({
    nodeType: "text",
    value,
    marks,
    data: {},
  });
}

// MLA: period goes inside the quotation marks when you add it.
function quoteTitle(raw: string) {
  let t = raw.trim();
  if (!t) return "";
  // If already ends in terminal punctuation, don’t add another period.
  if (!/[.!?]$/.test(t)) t += ".";
  return `“${t}”`;
}

// First author: Last, First. Subsequent authors: First Last.
// (We assume input names are "First Last" unless already "Last, First".)
function invertNameIfNeeded(name: string) {
  const n = name.trim();
  if (!n) return "";
  if (n.includes(",")) return n; // assume already inverted
  const parts = n.split(/\s+/);
  if (parts.length <= 1) return n;
  const last = parts.pop()!;
  return `${last}, ${parts.join(" ")}`;
}

function formatAuthors(names: string[]) {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (!cleaned.length) return "";

  if (cleaned.length === 1) {
    return `${invertNameIfNeeded(cleaned[0])}.`;
  }

  if (cleaned.length === 2) {
    // Second author stays in normal order (First Last).
    const first = invertNameIfNeeded(cleaned[0]);
    const second = ensureNormalOrder(cleaned[1]);
    return `${first}, and ${second}.`;
  }

  // 3+ => first author, et al. (period in "al." serves as ending punctuation)
  return `${invertNameIfNeeded(cleaned[0])}, et al.`;
}

function ensureNormalOrder(name: string) {
  const n = name.trim();
  if (!n) return "";
  // If user already provided "Last, First", flip it back for subsequent-author position.
  if (n.includes(",")) {
    const [last, rest] = n.split(",", 2).map((s) => s.trim());
    return rest ? `${rest} ${last}` : last;
  }
  return n;
}

function formatEditors(names: string[]) {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (!cleaned.length) return "";

  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned[0]}, et al.`;
}

// Avoid timezone day-shift: interpret as UTC when given an ISO string.
function formatMLADate(dateInput: string | Date) {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);

  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();

  const months = [
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
  ] as const;

  return `${day} ${months[month]} ${year}`;
}

// MLA commonly uses URL without protocol; also strip fragments and common tracking params.
function formatUrlForMLA(rawUrl: string) {
  const u = new URL(rawUrl);

  // Drop fragments (rarely useful in Works Cited)
  u.hash = "";

  // Drop common tracking params
  const dropPrefixes = ["utm_"];
  const dropExact = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);
  for (const [k] of u.searchParams) {
    if (dropExact.has(k) || dropPrefixes.some((p) => k.startsWith(p))) {
      u.searchParams.delete(k);
    }
  }

  // Remove trailing slash (except root)
  let path = u.pathname;
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);

  const search = u.searchParams.toString();
  return u.host + (path === "/" ? "" : path) + (search ? `?${search}` : "");
}

// If publisher == website name, omit publisher (common MLA instruction in many guides).
function dedupePublisher(publisher?: string, siteName?: string) {
  const p = publisher?.trim();
  const s = siteName?.trim();
  if (!p) return undefined;
  if (s && p.localeCompare(s, undefined, { sensitivity: "accent" }) === 0) {
    return undefined;
  }
  return p;
}

function trimTrailingCommaSpace(nodes: Text[]) {
  const last = nodes[nodes.length - 1];
  if (!last) return;
  last.value = last.value.replace(/,\s+$/, ". ");
}
