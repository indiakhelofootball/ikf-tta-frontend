# TTA System Manual — how to regenerate the PDF

This folder holds the source for the client-facing operations manual. Each chapter is one Markdown file. They are stitched together by Pandoc and styled by `manual.css` to produce the final PDF.

## One-time setup

Install Pandoc. On Windows:

    winget install pandoc

Then install a PDF engine. The simplest is wkhtmltopdf:

    winget install wkhtmltopdf

## Regenerate the PDF

From this folder, run:

    pandoc 01-login.md 02-admin-config.md 03-vendors.md 04-rep.md 05-trials.md 06-work-orders.md 07-payment-requests.md 08-bank.md 09-courier.md 10-reports.md 11-glossary.md --css manual.css --pdf-engine wkhtmltopdf -o TTA-Manual.pdf

If a chapter does not yet exist, leave it out of the command. The order in the command is the order in the final PDF.

## Writing rules

- Plain language. No jargon unless defined in the glossary.
- Numbered steps for any procedure the client will follow.
- Bulleted lists for feature inventories.
- Each chapter starts on a fresh page (handled by the stylesheet).
- No screenshots. Describe screens in words.

## Editing

Open the `.md` file in any text editor. Save. Re-run the Pandoc command above.
