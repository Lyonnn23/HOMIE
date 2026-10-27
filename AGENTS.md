# Database migrations

- Apply existing SQL through the managed migration tool and isolate unsupported data or bucket operations in dedicated tools because database changes must be recorded.
- Grant Data API privileges to new application tables and use security-invoker views so row-level policies remain effective.
- Assign email-based administrative roles only after email verification, including the verification lifecycle event, to prevent mailbox impersonation.
- Break cross-table RLS cycles with narrowly scoped viewer-bound helpers so request and quote reads cannot recurse indefinitely.
- Define complete page-specific metadata on each content route and never place preview images in the shared root because shared images misrepresent leaf pages.
- Store request photos as private object paths and render them through the shared signed-photo component; authorize file reads using the request client and existing quote relationship to prevent public or category-wide access.
- Parent content routes must render Outlet and show their own list only when no child is matched so detail navigation does not retain the list page.
- Verify schema defaults and constraint boundaries with read-only database-backed tests so migration checks cannot modify customer records.
- Keep growth rewards and client ratings writable only by validated database routines; bind ratings to both booking participants, serialize coupon claims, and require a paid completion for referral rewards to prevent forged benefits.
- Keep chat photos private and bind upload and download access to the booking participants; support clients may update only the read flag to prevent impersonating staff.
- Compile against the applied database schema; keep undeployed admin features explicitly unavailable instead of inventing types or applying unrelated migrations, so fixes do not silently change business rules.
- Use the shared AdminUnavailable screen for admin pages awaiting schema deployment; it checks the caller's protected role row and never queries missing relations, so unavailability cannot bypass authorization.
- Keep text moderation rules in a pure shared module and preserve blocking without persistent event history until its schema is deployed, so moderation remains testable and does not depend on an absent table.