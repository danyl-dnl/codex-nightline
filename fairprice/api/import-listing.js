import { importListingImage, importListingUrl } from "./lib/openai.js";

const MAX_IMAGE_DATA_URL_LENGTH = 3_600_000;

function validListingUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2_000;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { imageDataUrl, listingUrl } = req.body || {};
  const hasImage = typeof imageDataUrl === "string" && imageDataUrl.length > 0;
  const hasUrl = typeof listingUrl === "string" && listingUrl.trim().length > 0;
  if (hasImage === hasUrl) return res.status(400).json({ error: "Provide one listing screenshot or one public listing URL." });
  if (hasImage && imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) return res.status(413).json({ error: "Choose an image smaller than 2.5 MB." });
  if (hasUrl && !validListingUrl(listingUrl.trim())) return res.status(400).json({ error: "Enter a valid public http(s) URL." });

  try {
    const listing = hasImage
      ? await importListingImage({ imageDataUrl })
      : await importListingUrl({ listingUrl: listingUrl.trim() });
    if (!listing) return res.status(422).json({ error: "We could not verify a product and INR price. Review the listing and enter the details manually." });
    return res.status(200).json({ listing });
  } catch (error) {
    console.error("listing_import_failed", error.message);
    return res.status(502).json({ error: "Listing import is temporarily unavailable. Please enter the details manually." });
  }
}
