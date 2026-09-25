# Automotive Insight, Euro landing pages: deploy notes (25/09/2026)

Three pages, same URLs as the live ones. Google Ads final URLs do not change.

| Folder | Replaces |
|---|---|
| bmw-service/index.html | https://services.automotiveinsight.com.au/bmw-service/ |
| audi-servicing/index.html | https://services.automotiveinsight.com.au/audi-servicing/ |
| mercedes-benz-servicing/index.html | https://services.automotiveinsight.com.au/mercedes-benz-servicing/ |

## Already wired in (copied from the live pages, 24/09/2026)

- GTM-PV2GS3MX
- WhatConverts profile 154642 (s.ksrndkehqnwntyxlhgto.com/154642.js), so the number swaps and wc_capture_form runs on submit
- Google Ads tag AW-17726109207
- Booking form posts to the same Supabase table (ai_bookings) with the same field ids and the same GTM form_submission event. Notes field is folded into service_type.

Bing UET and Clarity come through GTM on the live pages, nothing to add.

## Fix on the subdomain

https requests were answering with a 302 to http on 18/09. Check the redirect rule and make sure http sends to https, not the reverse.

## Still with the client

- How many years the workshop has been going. The pages say "more than 20 years", which two customer reviews support (20-plus years, 15-plus years). If Kylie confirms the opening year, it can go back in.

- Workmanship warranty period (comment marks the spot on each page).

## Photos

All photos are embedded in the HTML, so there is no images folder to upload. Each page is one self-contained index.html. Only the logo and the BMW page's team photo load from automotiveinsight.com.au/img/.

## Phone number

Pages show 08 6150 5820 (tracked, calls recorded). WhatConverts 154642 is loaded, so any number swap it is set to do still runs.
