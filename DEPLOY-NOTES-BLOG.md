# Blog moved to the main site (14/10/2026)

The blog now lives at https://automotiveinsight.com.au/blog/. This subdomain is
served by nginx, so a `_redirects` file does nothing here.

## Interim (in this repo)
`blog/**/index.html` are tiny pages that forward instantly to the same path on
the main domain (meta refresh + JS + canonical, `noindex`).

## Proper fix (server config, needs host access)
Add to the nginx `server` block for services.automotiveinsight.com.au, then
reload nginx. Once it's live, the `blog/` folder here can be deleted.

    location ^~ /blog {
        return 301 https://automotiveinsight.com.au$request_uri;
    }
