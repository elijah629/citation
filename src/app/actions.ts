"use server";

import { generateObject } from "ai";
import { type Citation, convertCSL } from "@/lib/citation/csl";
import {
  type CitationFormState,
  citationFormSchema,
} from "@/lib/citation/form";
import {
  contributorsSchema,
  formatMLA9,
  improveMLA9Accuracy,
  type MLA9Contributors,
  mla9,
} from "@/lib/citation/formats/mla9";
import { hackclub } from "@/lib/hackclub";
import type { CSL } from "@/types/csl";

export async function createCitation(
  _initialState: CitationFormState,
  formData: FormData,
): Promise<CitationFormState> {
  const { data, error, success } = citationFormSchema.safeParse({
    url: formData.get("url"),
  });

  if (!success) {
    return {
      type: "error",
      error: { message: error.message },
    };
  }

  const { url } = data;

  async function cheggFetch(url: string): Promise<CSL> {
    const response = await fetch(
      "https://autocite.writing.chegg.com/api/v3/query?url=" +
        encodeURIComponent(url),
    );

    if (response.status === 500) {
      return { type: "webpage", URL: url };
    }

    const {
      results: [{ csl }],
    } = await response.json();

    return csl;
  }

  const [body, chegg] = await Promise.all([
    fetch(url).then((x) => x.text()),
    cheggFetch(url),
  ]);

  const citation = convertCSL(chegg, "mla9");
  const improved = await improveMLA9Accuracy(citation, body);

  const doc = formatMLA9(improved);

  return {
    type: "success",
    citation: doc,
  };
}

export async function improveMLA9AccuracyFromArticleAI(
  citation: Citation["mla9"],
  article: string,
): Promise<Citation["mla9"]> {
  try {
    const { object } = await generateObject({
      model: hackclub("openai/gpt-5.1"),
      system:
        "Given an MLA9 Citation expressed in JSON and a webpage article's text, modify the citation to increace the accuracy of it based on the article. Return an object in the same format as the MLA9 input, include all existing parameters as well as your adjusted ones. Your task is to generate MLA citations based on the provided webpage text. Dates must be ISO 8601 calendar date extended format strings. Treat last updated dates as published dates.",
      prompt: `Existing citation \`\`\`${JSON.stringify(citation)}\`\`\`\n---\nArticle:\n${article}`,
      schema: mla9,
    });

    return object;
  } catch (e) {
    return citation;
  }
}

export async function fuseContributionLists({
  byline,
  contributors,
}: {
  byline?: string | null;
  contributors?: MLA9Contributors;
}): Promise<MLA9Contributors | undefined> {
  if (!byline && !contributors) {
    return undefined;
  }

  try {
    const { object } = await generateObject({
      model: hackclub("openai/gpt-5.1"),
      schema: contributorsSchema,
      system:
        "Given a contributor list as JSON and a byline, produce a new contributor list in the same JSON schema as the input by adding all individuals named in the byline. Preserve existing contributors, do not duplicate contributors, and normalize name.",
      prompt: [
        contributors && `Contributors: \`${JSON.stringify(contributors)}\``,
        byline && `Byline: "${JSON.stringify(byline)}"`,
      ]
        .filter((x) => x)
        .join("\n"),
    });

    return object;
  } catch (e) {
    return contributors;
  }
}
