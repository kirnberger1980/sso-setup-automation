import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({ region: process.env.AWS_REGION });

const { CA_CERT_PARAM_NAME } = process.env;

let ca: string;

/**
 * Get CA Cert from Parameter Store Paramter
 * @return CA Cert as string
 */

export async function getCaCertString(){
  if (!ca) {
    const commandInput = {
      Name: CA_CERT_PARAM_NAME
    };
    const command = new GetParameterCommand(commandInput);
    const ssmResponse = await client.send(command);
    if (ssmResponse.Parameter && ssmResponse.Parameter.Value) {
      ca = ssmResponse.Parameter.Value;
    }
  }
  return ca;
}
