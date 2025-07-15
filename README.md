# Commercial Invoice Generation Tool

## Overview

This software was born out of a need to generate highly-detailed commercial invoices for products being imported into the United States of America. I focused on China but it works for other places. I don't use those functions much so there may be errors. 

I work in the retail fixture and displays business, and thus the code as written is geared towards those product classifications. 

This is very very much a work in progress. At present, the system does not store any historical values, no database of addresses, etc. All planned when I have time. 

## Project Structure

```
/
├── app/
│   └── page.tsx    # The tool code lives here
├── public/
│   └── ...         # Static assets
├── .gitignore
├── next.config.js
├── package.json
├── README.md
└── tsconfig.json
```

I built this to run on Vercel. If you're running locally, you'll need node.js and next installed. 

# Usage

Pretty simple. Enter the pertinent data in each field. No storage / address book functions yet. 

The software will try to determine whether your goods are subject to the Chapter 99 tariffs, like Section 301, Section 232, IEEPA, reciprocal, etc. 

It includes an API call to the USITC API that I think is implemented badly, I am sure there is some level of limits to the API call that I am exceeding, so it fails sometimes. I hard-coded over-ride tariff levels in case of API failure. It will be noted at the top of the form which data set is being used. I've been through two different versions of the API call and it still only works sporadically. For my own use I am updating offline data, but focusing only on the HTS codes that I use frequently. 

If you're subject to section 232 (steel and aluminum) then check that box and it will present you with fields for additonal information. I automated this but it only works for pure-metal codes at the moment. Need to add more codes here later. 

As per USCBP directive, if any lines are subject to Section 232, an additional line is added in the Commercial Invoice to break out the metal value. Metal value is deducted from overall value, again following USCBP regulations. 

There are two choices for output, text or HTML. HTML is intended for printing, text is more for future API output. 

## License

This project uses code from the Artifact Bin Template project for deployment to the Vercel environment https://github.com/HamedMP/ArtifactbinTemplate/
