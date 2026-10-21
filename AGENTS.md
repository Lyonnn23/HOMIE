# Database migrations

- Apply existing SQL through the managed migration tool and isolate unsupported data or bucket operations in dedicated tools because database changes must be recorded.
- Grant Data API privileges to new application tables and use security-invoker views so row-level policies remain effective.
- Assign email-based administrative roles only after email verification, including the verification lifecycle event, to prevent mailbox impersonation.
- Break cross-table RLS cycles with narrowly scoped viewer-bound helpers so request and quote reads cannot recurse indefinitely.
- Define complete page-specific metadata on each content route and never place preview images in the shared root because shared images misrepresent leaf pages.