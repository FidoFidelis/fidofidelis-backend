const sampleReviews = [
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

export default async () => {
  const responseBody = {
    status: "success",
    source: "sample",
    business: {
      name: "Fido Fidelis Dog Training",
      averageRating: 5,
      totalReviewCount: 169,
      googleReviewUrl:
        "https://www.google.com/search?q=Fido+Fidelis+Dog+Training+reviews",
    },
    reviews: sampleReviews,
    lastUpdated: new Date().toISOString(),
  };

  return Response.json(responseBody, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
};

export const config = {
  path: "/api/reviews",
};