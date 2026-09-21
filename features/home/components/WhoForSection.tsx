export default function WhoForSection() {
  return (
    <section
      aria-labelledby="who-for-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="who-for-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Built for businesses with real work to automate.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          If your team spends significant time moving information, researching,
          reporting, qualifying, documenting, creating, or coordinating work
          across systems, there is probably an opportunity to automate part of
          it.
        </p>
      </div>
    </section>
  );
}
