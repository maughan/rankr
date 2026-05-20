import crypto from "crypto";

const generateUploadParams = () => {
  const token = crypto.randomBytes(16).toString("hex"); // random string
  const expire = Math.floor(Date.now() / 1000) + 60 * 5; // 5 min expiry

  // Signature = HMAC_SHA1 of token + expire + optional folder/fileName
  const signature = crypto
    .createHmac("sha1", process.env.IMAGEKIT_PRIVATE_KEY!)
    .update(`${token}${expire}`)
    .digest("hex");

  return { token, expire, signature };
};

export async function GET() {
  const { token, expire, signature } = generateUploadParams();

  return Response.json({ token, expire, signature });
}
