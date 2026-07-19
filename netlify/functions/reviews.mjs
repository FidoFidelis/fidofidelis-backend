const SAMPLE_REVIEWS = [
  {
    id: "sample-review-1",
    reviewerName: "Sarah M.",
    rating: 5,
    comment:
      "Fido Fidelis completely changed the way we communicate with our dog. The training was clear, practical, and immediately useful at home.",
    createTime: "2026-07-12T14:30:00.000Z",
    updateTime: "2026-07-12T14:30:00.000Z",
  },
  {
    id: "sample-review-2",
    reviewerName: "Michael R.",
    rating: 5,
    comment:
      "Professional, honest, and extremely knowledgeable. We saw a major improvement in our dog's behavior after the first session.",
    createTime: "2026-06-28T18:15:00.000Z",
    updateTime: "2026-06-28T18:15:00.000Z",
  },
  {
    id: "sample-review-3",
    reviewerName: "Jessica T.",
    rating: 5,
    comment:
      "The in-home training made a huge difference for our family. Everything was explained in a way that was easy to understand and follow.",
    createTime: "2026-06-10T11:45:00.000Z",
    updateTime: "2026-06-10T11:45:00.000Z",
  },
];

const BUSINESS_NAME = "Fido Fidelis Dog Training";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?q=Fido+Fidelis+Dog+Training+reviews";

const REQUIRED_GOOGLE_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_ACCOUNT_ID",
  "GOOGLE_LOCATION_ID",
];

const STAR_RATING_MAP = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, max-age=300",

      /*
       * Netlify CDN:
       * - Cache the response for 6 hours.
       * - Store it in Netlify's durable cache.
       * - Continue serving stale data for up to 7 days while refreshing.
       */
      "Netlify-CDN-Cache-Control":
        "public, durable, s-maxage=21600, stale-while-revalidate=604800",
    },
  });
}

function hasGoogleCredentials() {
  return REQUIRED_GOOGLE_ENV_VARS.every((name) => {
    const value = Netlify.env.get(name);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function createSamplePayload() {
  return {
    status: "success",
    source: "sample",
    business: {
      name: BUSINESS_NAME,
      averageRating: 5,
      totalReviewCount: 169,
      googleReviewUrl: GOOGLE_REVIEWS_URL,
    },
    reviews: SAMPLE_REVIEWS,
    lastUpdated: new Date().toISOString(),
  };
}

function convertGoogleRating(starRating) {
  if (typeof starRating === "number") {
    return Math.max(1, Math.min(5, starRating));
  }

  return STAR_RATING_MAP[starRating] || 5;
}

function normalizeGoogleReview(review, index) {
  return {
    id:
      review.reviewId ||
      review.name ||
      `google-review-${index + 1}`,

    reviewerName:
      review.reviewer?.displayName ||
      "Fido Fidelis Client",

    rating: convertGoogleRating(review.starRating),

    comment:
      typeof review.comment === "string"
        ? review.comment.trim()
        : "",

    createTime: review.createTime || null,
    updateTime: review.updateTime || review.createTime || null,
  };
}

async function getGoogleAccessToken() {
  const clientId = Netlify.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Netlify.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Netlify.env.get("GOOGLE_REFRESH_TOKEN");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Google OAuth token request failed: ${response.status} ${errorText}`,
    );
  }

  const payload = await response.json();

  if (!payload.access_token) {
    throw new Error(
      "Google OAuth response did not include an access token.",
    );
  }

  return payload.access_token;
}

async function fetchGoogleReviews() {
  const accessToken = await getGoogleAccessToken();

  const accountId = Netlify.env
    .get("GOOGLE_ACCOUNT_ID")
    .replace(/^accounts\//, "");

  const locationId = Netlify.env
    .get("GOOGLE_LOCATION_ID")
    .replace(/^locations\//, "");

  const endpoint =
    `https://mybusiness.googleapis.com/v4/accounts/` +
    `${encodeURIComponent(accountId)}/locations/` +
    `${encodeURIComponent(locationId)}/reviews` +
    `?pageSize=50&orderBy=updateTime%20desc`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Google reviews request failed: ${response.status} ${errorText}`,
    );
  }

  const payload = await response.json();

  const reviews = Array.isArray(payload.reviews)
    ? payload.reviews
        .map(normalizeGoogleReview)
        .filter((review) => review.comment.length > 0)
    : [];

  if (!reviews.length) {
    throw new Error(
      "Google returned no written reviews.",
    );
  }

  return {
    status: "success",
    source: "google",
    business: {
      name: BUSINESS_NAME,
      averageRating:
        Number(payload.averageRating) || 5,
      totalReviewCount:
        Number(payload.totalReviewCount) ||
        reviews.length,
      googleReviewUrl: GOOGLE_REVIEWS_URL,
    },
    reviews,
    lastUpdated: new Date().toISOString(),
  };
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "GET") {
    return jsonResponse(
      {
        status: "error",
        message: "Method not allowed.",
      },
      405,
    );
  }

  /*
   * Until Google credentials are entered in Netlify,
   * the endpoint intentionally returns sample data.
   */
  if (!hasGoogleCredentials()) {
    return jsonResponse(createSamplePayload());
  }

  try {
    const googlePayload = await fetchGoogleReviews();
    return jsonResponse(googlePayload);
  } catch (error) {
    console.error(
      "Google reviews fetch failed:",
      error,
    );

    /*
     * Emergency fallback:
     * The CDN should normally serve its stale cached Google response.
     * If no usable cached response exists, the widget still receives
     * valid sample data instead of breaking.
     */
    return jsonResponse({
      ...createSamplePayload(),
      source: "sample-fallback",
    });
  }
};

export const config = {
  path: "/api/reviews",
};