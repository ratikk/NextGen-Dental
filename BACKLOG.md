# Backlog

Items surfaced during the Lilac cleanup (April 21, 2026) that weren't
in scope for that work but are worth tackling later.

## Should do this week

- [ ] **Node 18 → Node 20.** Several deps (sitemap, chokidar) require Node 20+.
      `EBADENGINE` warnings during `npm install`.
- [ ] **`npm audit` vulnerabilities** — 1 critical, 3 high, 2 moderate.
- [ ] **Google Search Console:** remove `/sitemap.xml` if submitted,
      confirm `/sitemap-index.xml` is registered, request re-indexing
      of service pages with updated JSON-LD schema.

## Should do this month

- [ ] **Legal review of ToS / Privacy Policy / Accessibility pages** —
      body text carried over from the original fork.
- [ ] **Invisalign blog `seoDescription`** says "North Austin" but
      NextGen is in South Austin. One-line fix in `blogPosts.ts`.
- [ ] **Create a 1200×630 OG image** for social previews (currently none).

## When there's time

- [ ] **Mail domain mismatch** — `ismile@nextgendentaltx.com` vs. site
      `nextgendentalaustintx.com`. Confirm intentional or fix.
- [ ] **Yelp URL slug** `next-gen-dental-no-title` — looks like a
      placeholder, verify listing.
- [ ] **CloudFront soft-404** — `/sitemap.xml` returns HTML 200 instead
      of real 404. Add CloudFront custom error response.
- [ ] **Git committer identity on EC2** — commits attributed to
      "EC2 Default User." Fix with `git config --global user.name/email`.
- [ ] **Medicare claim on homepage** — "We accept Medicare" is
      misleading; Original Medicare doesn't cover routine dental.
      Should say "Medicare Advantage plans with dental benefits."
- [ ] **"Delta Dental" listed twice** — Delta Dental Premier is the
      same carrier as Delta Dental. Consolidate.
