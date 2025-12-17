import { CSL, DatePartial } from "@/types/csl";
import { z } from "zod";
import { mla9 } from "./formats/mla9";

export type Citation = {
  mla9: z.infer<typeof mla9>;
};

export function convertCSL<T extends keyof Citation>(
  csl: CSL,
  to: "mla9",
): Citation[T] {
  switch (to) {
    case "mla9":
      return mla9.parse({
        contributors: {
          editors: csl.editor?.map(
            (x) => x.literal ?? [x.given, x.family, x.suffix].join(" ").trim(),
          ),
          authors: csl.author?.map(
            (x) => x.literal ?? [x.given, x.family, x.suffix].join(" ").trim(),
          ),
        },
        page: {
          title: csl.title,
          date_published:
            convertDatePartialToDateString(csl.issued) || undefined,
          url: csl.URL,
          date_accessed:
            convertDatePartialToDateString(csl.accessed) ||
            new Date().toISOString(),
        },
        website: {
          name: csl["title-short"] || undefined,
          publisher: csl.publisher || undefined,
        },
      });
  }
}

function convertDatePartialToDateString(
  datePartial?: DatePartial,
): string | null {
  if (!datePartial) {
    return null;
  }

  if (datePartial.raw) {
    return new Date(datePartial.raw).toISOString();
  } else if (datePartial.literal) {
    return new Date(datePartial.literal).toISOString();
  } else if (datePartial["date-parts"]?.[0]?.length === 3) {
    const [year, month, day] = datePartial["date-parts"][0];
    return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
  }

  return null;
}
