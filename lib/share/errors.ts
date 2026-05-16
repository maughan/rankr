// Thrown by template handlers when the request is invalid but not an
// infrastructure failure. The route handler maps these to their status codes
// instead of returning a generic 500.
export class ShareCardError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ShareCardError";
  }
}
