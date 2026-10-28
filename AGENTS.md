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
- Compile application queries against the deployed schema; do not invent generated types or apply pending migrations to hide errors, because deployment and source can advance independently.
- Admin screens whose schema is pending use the shared role-checked unavailable state, because missing configuration or history must not loosen access or change active rates.
- Keep moderation rules in a browser-safe shared module; missing event history must not disable blocking, and optional classifier secrets are read only inside the server handler.
- Keep billing configuration in the deployed public settings table with administrator-only writes; show effective provider rates through the database routine so editable settings and free periods stay consistent.
- Validate Premium benefits before verification triggers and keep trial claims serialized; preserve coupon ownership locks and agreed quote prices when changing the billing model.