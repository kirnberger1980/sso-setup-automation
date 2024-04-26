import { S3Client,PutObjectCommand,PutObjectCommandInput } from "@aws-sdk/client-s3";
const REGION = process.env.AWS_REGION  || "us-east-1";
/**
 *
 * @param s3Bucket Name of the S3 Bucket
 * @param ObjectKey the name of the object
 * @param ObjectBody the value of the object
 * @returns The ETag String
 */
export async function uploadDocumentation(s3Bucket: string,objectKey: string,objectBody: string): Promise<string> {
  const client = new S3Client({ region: REGION});
  const input: PutObjectCommandInput = {
    Body: objectBody,
    Key: objectKey,
    Bucket: s3Bucket,
    ServerSideEncryption: "AES256",
    ACL: "bucket-owner-full-control",
    ContentType: "text/html"
  };
  const command = new PutObjectCommand(input);
  const response = await client.send(command);
  return response.ETag || "NOT Successfull";
}
  