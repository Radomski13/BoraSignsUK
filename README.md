# Bora Signs — Netlify site

A fast, plain-HTML copy of borasigns.co.uk with a Stripe checkout.
No frameworks, no build step. About 330 KB total (the Shopify page was 16 MB).

## What's in here

```
site/                     the website (this is what gets published)
  index.html              home
  products/magnetic-van-signs/   product page (same URL as Shopify, so ads keep working)
  pages/gallery/  pages/contact/  policies/...
  checkout/               checkout (order summary + Stripe payment form)
  checkout/success/       order confirmed + logo upload form
  assets/data/catalog.json   prices, sizes and the van list  <- edit prices here only
netlify/functions/        the two small server scripts that talk to Stripe
scripts/localize-assets.mjs   copies images off Shopify (run before closing Shopify)
netlify.toml              settings, caching, redirects from old Shopify URLs
```

## Deploy (one time, ~15 minutes)

Drag-and-drop on Netlify does **not** run the checkout functions. Use the Netlify CLI instead:

1. Install Node.js (nodejs.org), then in a terminal:
   `npm install -g netlify-cli`
2. In this folder: `netlify login` then `netlify init` (create a new site).
3. Add your Stripe keys (Stripe Dashboard → Developers → API keys):
   ```
   netlify env:set STRIPE_SECRET_KEY sk_live_...
   netlify env:set STRIPE_PUBLISHABLE_KEY pk_live_...
   ```
   Use the `sk_test_` / `pk_test_` keys first and pay with card 4242 4242 4242 4242 to test.
4. `netlify deploy --prod`
5. Netlify → Forms: turn on email notifications for the **artwork** and **contact** forms, so you get logo uploads and messages by email.
6. Stripe → Settings → Emails: turn on "Successful payments" receipts for customers, and payment notifications for you.
7. Point borasigns.co.uk at Netlify (Netlify → Domain management), then turn off the Shopify store.

To change anything later, edit the files and run `netlify deploy --prod` again.

## Before you close Shopify

Images still load from Shopify's and Judge.me's servers. Run this once to copy them here:

```
node scripts/localize-assets.mjs
```

Customer videos are not copied (some are 30+ MB). Re-encode them to 720p, under 3 MB each
(HandBrake, "Fast 720p30"), drop them in `site/assets/video/`, and update the `data-src`
links in `index.html` and the product page. Videos only download when someone taps play.

## How orders work

1. Customer picks their van. The van decides the size; the server double-checks this so nobody can pay a smaller size's price.
2. Checkout shows the Stripe payment form (cards, Apple Pay, Google Pay, Link) next to your order summary.
3. Paid orders appear in Stripe → Payments. The van details are on each line item and in the payment's metadata.
4. The customer lands on the thank-you page and uploads their logo. That arrives in Netlify → Forms (and your email, if turned on), tagged with the order reference.

## Meta pixel

Pixel 1112094258178143 fires PageView, ViewContent, AddToCart, InitiateCheckout and Purchase (with order value).
It loads after the page so it doesn't slow anything down. In Events Manager, verify the domain again after you switch DNS.
