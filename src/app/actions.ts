"use server";

import { generateObject } from "ai";
import { citationFormSchema, CitationFormState } from "@/lib/citation/form";
import { CSL } from "@/types/csl";
import { Citation, convertCSL } from "@/lib/citation/csl";
import {
  contributorsSchema,
  formatMLA9,
  improveMLA9Accuracy,
  mla9,
  MLA9Contributors,
} from "@/lib/citation/formats/mla9";
import { hackclub } from "@/lib/hackclub";

export async function createCitation(
  initialState: CitationFormState,
  formData: FormData,
): Promise<CitationFormState> {
  const { data, error, success } = citationFormSchema.safeParse({
    url: formData.get("url"),
  });

  if (!success) {
    return { ...initialState, type: "error", message: error.message };
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
  console.log(citation);
  const improved = await improveMLA9Accuracy(citation, body);
  console.log(improved);
  const doc = formatMLA9(improved);

  return {
    ...initialState,
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
      model: hackclub("openai/gpt-oss-120b"),
      system:
        "Given an MLA9 Citation expressed in JSON and a webpage article's text, modify the citation to increace the accuracy of it based on the article. Return an object in the same format as the MLA9 input, include all existing parameters as well as your adjusted ones. Your task is to generate MLA citations based on the provided webpage text. Dates must be ISO 8601 calendar date extended format strings. Treat last updated dates as published dates.",
      prompt: `Existing citation \`\`\`${JSON.stringify(citation)}\`\`\`\n---\nArticle:\n${article}`,
      schema: mla9,
    });

    return object;
  } catch (e) {
    console.error(e);
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
      model: hackclub("openai/gpt-oss-120b"),
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
    console.log(e);
    return contributors;
  }
}
