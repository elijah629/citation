type ItemType =
  | "article"
  | "article-journal"
  | "article-magazine"
  | "article-newspaper"
  | "bill"
  | "book"
  | "broadcast"
  | "chapter"
  | "classic"
  | "collection"
  | "dataset"
  | "document"
  | "entry"
  | "entry-dictionary"
  | "entry-encyclopedia"
  | "event"
  | "figure"
  | "graphic"
  | "hearing"
  | "interview"
  | "legal_case"
  | "legislation"
  | "manuscript"
  | "map"
  | "motion_picture"
  | "musical_score"
  | "pamphlet"
  | "paper-conference"
  | "patent"
  | "performance"
  | "periodical"
  | "personal_communication"
  | "post"
  | "post-weblog"
  | "regulation"
  | "report"
  | "review"
  | "review-book"
  | "software"
  | "song"
  | "speech"
  | "standard"
  | "thesis"
  | "treaty"
  | "webpage";

type Dates = Record<
  | "accessed"
  | "container"
  | "event-date"
  | "issued"
  | "original-date"
  | "submitted",
  _Date
>;

type Numbers = Record<
  | "chapter-number"
  | "collection-number"
  | "edition"
  | "issue"
  | "number-of-pages"
  | "number-of-volumes"
  | "volume",
  string | number
>;

type People = Record<
  | "author"
  | "collection-editor"
  | "composer"
  | "container-author"
  | "director"
  | "editor"
  | "editorial-director"
  | "illustrator"
  | "interviewer"
  | "original-author"
  | "recipient"
  | "reviewed-author"
  | "translator",
  Person[]
>;

type Strings = Record<
  | "DOI"
  | "ISBN"
  | "ISSN"
  | "PMCID"
  | "PMID"
  | "URL"
  | "abstract"
  | "annote"
  | "archive"
  | "archive-place"
  | "archive_location"
  | "authority"
  | "call-number"
  | "citation-label"
  | "citation-number"
  | "collection-title"
  | "container-title"
  | "container-title-short"
  | "dimensions"
  | "event"
  | "event-place"
  | "first-reference-note-number"
  | "genre"
  | "journalAbbreviation"
  | "jurisdiction"
  | "keyword"
  | "language"
  | "locator"
  | "medium"
  | "note"
  | "number"
  | "original-publisher"
  | "original-publisher-place"
  | "original-title"
  | "page"
  | "page-first"
  | "publisher"
  | "publisher-place"
  | "references"
  | "reviewed-title"
  | "scale"
  | "section"
  | "shortTitle"
  | "source"
  | "status"
  | "title"
  | "title-short"
  | "version"
  | "year-suffix",
  string
>;

type LooseNumber = string | number;
export type DatePartial = Partial<{
  "date-parts"?: [
    [LooseNumber, LooseNumber?, LooseNumber?],
    [LooseNumber, LooseNumber?, LooseNumber?]?,
  ];

  /**

     * Three variants:

     *      1.  1,   2,   3,   4  => spring, summer, fall, winter

     *      2. "1", "2", "3", "4" => spring, summer, fall, winter

     *      3.            string  => any literal string

     * Spring, Summer, Fall, Winter

     */

  season: 1 | 2 | 3 | 4 | string;

  /**

     * If date is approximate, this should be set to a "truthy" value.

     */

  cir: boolean;

  /**

     * May be used with Citeproc-js. String must be able to parse directly into a

     * valid `Date` using `new Date()` **NOT A CSL STANDARD**

     */

  raw: string;

  /**

     * Literal date string. Should only be used as a last resort.

     */

  literal: string;
}>;

type PersonPartial = Partial<{
  /**

     * Surname minus any particles and suffixes

     */

  family: string;

  /**

     * Given names, either full ("John Edward") or initialized ("J. E.")

     */

  given: string;

  /**

     * Name suffix, e.g. "Jr." in "John Smith Jr." and "III" in "Bill Gates III"

     */

  suffix: string;

  /**

     * Name particles that are not dropped when only the surname is shown

     * ("de" in the Dutch surname "de Koning") but which may be treated

     * separately from the family name, e.g. for sorting

     */

  "non-dropping-particle": string;

  /**

     * Name particles that are dropped when only the surname is shown

     * ("van" in "Ludwig van Beethoven", which becomes "Beethoven")

     */

  "dropping-particle": string;

  literal: string;
}>;

type _Date = (
  | {
      "date-parts": [
        [LooseNumber, LooseNumber?, LooseNumber?],
        [LooseNumber, LooseNumber?, LooseNumber?]?,
      ];
    }
  | { raw: string }
  | { literal: string }
) &
  DatePartial;

type Person = ({ family: string } | { literal: string }) & PersonPartial;

export type CSL = Partial<Dates & Numbers & People & Strings> & {
  id?: string; // Specified as required, but not ever there in Chegg responses
  type: ItemType;
};
