export default async () => {
  const responseBody = {
    status: "online",
    service: "Fido Fidelis Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  return Response.json(responseBody, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const config = {
  path: "/api/health",
};