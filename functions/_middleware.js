// functions/_middleware.js
export async function onRequest(context) {
  // Allow dynamic routes to take precedence over static files
  const response = await context.next();
  return response;
}
