import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";
import { SecretDefinition} from "../../../types/config";


/**
 * Retrieves Secret from Secret Manager
 * @param secredId Id of the Secret
 * @return Defined Secret Object
 */

export async function getSecret(secretId: string): Promise<SecretDefinition>{
  const smclient = new SecretsManagerClient({});
  const getsecret = await smclient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!getsecret.SecretString) {
    throw new Error(`No secret value found for SecretsManager Secret: ${secretId}`);
  }
  const readSecretFromSecretManager = JSON.parse(getsecret.SecretString) as SecretDefinition;
  return readSecretFromSecretManager;
}
