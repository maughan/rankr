import crypto from "crypto";

const generateUploadParams = (fileName: string, folder: string) => {
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
  const fileName = `${crypto.randomBytes(16).toString("hex")}.png`;
  const folder = "/lists";

  const { token, expire, signature } = generateUploadParams(fileName, folder);

  return Response.json({ token, expire, signature });
}
