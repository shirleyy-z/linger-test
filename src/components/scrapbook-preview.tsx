export function ScrapbookPreview() {
  return (
    <div className="paper relative min-h-[500px] overflow-hidden rounded-[30px] p-7 md:p-10">
      <div
        className="absolute -left-8 top-20 h-36 w-44 rotate-[-8deg] rounded-[45%]"
        style={{ background: "var(--honey)", opacity: 0.7 }}
      />
      <div
        className="absolute -right-8 bottom-12 h-44 w-44 rotate-12 rounded-full"
        style={{ background: "var(--bluebell)", opacity: 0.6 }}
      />

      <div className="relative grid grid-cols-2 gap-5">
        <div className="polaroid tape rotate-[-3deg]">
          <div
            className="grid aspect-[4/5] place-items-center rounded-sm text-center"
            style={{
              background:
                "linear-gradient(135deg, var(--pistachio), var(--fern))"
            }}
          >
            <span className="serif px-5 text-2xl text-white">first week back</span>
          </div>
          <p className="serif mt-4 text-center text-lg">September 8, 2026</p>
        </div>

        <div
          className="mt-9 rotate-3 rounded-[45%] border-[10px] p-2 shadow-xl"
          style={{ borderColor: "var(--fern)", background: "var(--paper)" }}
        >
          <div
            className="grid aspect-square place-items-center rounded-[45%] text-5xl"
            style={{ background: "var(--cherry)" }}
          >
            ☁
          </div>
        </div>

        <div
          className="col-span-2 mx-auto -mt-3 max-w-sm rotate-[-1deg] rounded-xl border p-5 text-center shadow-md"
          style={{ background: "var(--fennel)", borderColor: "var(--line)" }}
        >
          <p className="serif text-2xl">“I hope we remember how this felt.”</p>
        </div>

        <div className="polaroid rotate-3">
          <div
            className="grid aspect-square place-items-center text-5xl"
            style={{ background: "var(--peony)" }}
          >
            ♡
          </div>
          <p className="serif mt-4 text-center">late-night library break</p>
        </div>

        <div
          className="self-center rounded-2xl border p-5 shadow-lg"
          style={{ background: "var(--paper)", borderColor: "var(--pistachio)" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--fern-dark)]">
            A memory found you
          </p>
          <p className="serif mt-3 text-2xl">Before you knew how the year would end...</p>
          <p className="mt-3 text-sm text-[var(--muted)]">9 months ago</p>
        </div>
      </div>
    </div>
  );
}
