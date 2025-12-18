import { CitationForm } from "@/components/citation-form";

export default function Page() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-primary">MLA 9 Works Cited</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Create clean citations in seconds
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Paste a link and get a properly formatted MLA 9 works cited entry.
        </p>
      </header>

      <CitationForm />
    </main>
  );
}
