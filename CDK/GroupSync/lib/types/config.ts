import * as cdk from "aws-cdk-lib";

export interface Config {
  readonly general: {
    readonly produkt: string,
    readonly stage: string,
    readonly prefix: string,
    readonly s3_DOKUBUCKET: string,
    readonly WebhookUrlTeams: string,
    readonly DocuWebsite: string,
    readonly LambdaSchedule: cdk.Duration,
    /**
     * the Root CA Certificate in PEM format which issues the server certificates Active Directory
     */
    rootCaCertificateString?: string;

  },
  readonly Vpc: {
    vpcId: string,
    subnetIds: string[],
  },
  readonly SSO: {
    readonly ad_DomainName: string,
    readonly LdapConfig: {
      BasePath: string,
      GroupPrefixes: string[],
      SecretFile: string,
      Url: string,
      Port: number
    },
    readonly IdentityStoreId: string,
    readonly Endpoint: string
    }
}

export interface CustomResourceEventCommon {
  ServiceToken: string;
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
  ResourceType: string;
  ResourceProperties: {
      ServiceToken: string;
      GroupFilters: string;
  };
}

export interface SyncFilters {
  SyncFilters: SyncFilter[]
  NextToken?: string
}

export interface SyncFilter {
  SyncProfileName: string,
  SyncFilterId: string,
  FilterType: string,
  Effect: string,
  Attributes: string,
  CreateTime: string
}

export interface SyncFilterAttributes {
  associateddomain: string[],
  objectsid: string[],
  samaccountname: {"display-only": string}[]
}

export interface SecretDefinition {
    username: string,
    password: string
}
