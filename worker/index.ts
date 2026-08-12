/** Sites/Cloudflare entry point. Static assets handle the geometry laboratory. */
const worker = {
  fetch(): Response {
    return new Response("Not found", { status: 404 });
  },
};

export default worker;
