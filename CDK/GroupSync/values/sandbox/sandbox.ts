import { Config } from "../../lib/types/config";
import * as cdk from "aws-cdk-lib";

export const sandboxConfig:Config  = {
  general: {
    produkt: "SSO-AD-GroupSync",
    stage: "TEST",
    prefix: "TESTOFANT",
    s3_DOKUBUCKET: "my-bucket-name",
    WebhookUrlTeams: "https://my-webhook-url.com",
    DocuWebsite: "https://my-doku-website.com",
    LambdaSchedule: cdk.Duration.minutes(60),
  },
  Vpc:{
    vpcId: "vpc-id",
    subnetIds: ["subnet-id1", "subnet-id2"]
  },
  SSO: {
    ad_DomainName: "test.domain",
    LdapConfig: {
      BasePath: "OU=Groups,OU=test,DC=domain",
      GroupPrefixes: ["GROUP_PREFIX_2","GROUP_PREFIX_2"],
      SecretFile: "./values/sandbox/sbxsecret.json",
      Url: "ldaps://test.domain",
      Port: 636
    },
    Endpoint: "identity-sync.eu-central-1.amazonaws.com",
    IdentityStoreId: "d-12321"
  }
};