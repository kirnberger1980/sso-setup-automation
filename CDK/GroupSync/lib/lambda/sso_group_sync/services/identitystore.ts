import { HttpRequest} from "@aws-sdk/protocol-http";
import axios, {AxiosResponse} from "axios";
import {SignatureV4} from "@smithy/signature-v4";
import {AwsCredentialIdentity} from "@aws-sdk/types";
import {Sha256} from "@aws-crypto/sha256-js";
import { SyncFilters, SyncFilterAttributes } from "../../../types/config";
import { IdentitystoreClient, ListGroupsCommand,  ListGroupsCommandOutput } from "@aws-sdk/client-identitystore";
import {ssoNotification } from "./../teams/notifications";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "";
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN ?? "";
const SSO_ENDPOINT = process.env.SSO_ENDPOINT || "";
const IDENTITIYSTOREID = process.env.IDENTITY_STORE_ID || "";
const DOMAINNAME = process.env.DOMAINNAME  || "";
const DOKU_WEBSITE = process.env.DOKU_WEBSITE  || "";
const REGION = process.env.AWS_REGION  || "us-east-1";

interface SyncFilterObject {
    samaccountname: string[],
    associateddomain: string[]
  }

const client = new IdentitystoreClient({ region: process.env.AWS_REGION });
/**
 * Lists all groups in the identity store. Returns a paginated list of complete Group objects.
 * @param adDomain Name of the Active Directory to be synced
 * @return List of all groups
 */
export async function getGroups(adDomain: string) {
  let nextToken:string|undefined;
  const groups = [];
  do {
    const lgCommand = new ListGroupsCommand({
      IdentityStoreId: IDENTITIYSTOREID,
      NextToken: nextToken
    });
    const lgResponse: ListGroupsCommandOutput = await client.send(lgCommand);
    if (lgResponse && lgResponse.Groups) {
      groups.push(...lgResponse.Groups);
    }
    nextToken = lgResponse.NextToken;
  } while (nextToken);
  return groups.map(group => {
    return {
      name: group.DisplayName?.substring(0,group.DisplayName.indexOf("@" + adDomain)) || "",
      description: group.Description || " "
    };
  });
}


/**
 *
 * @param adGroups Ad Groups to be syncronised
 */
export async function updateGroups (domainName:string, adGroups: string[]): Promise<string[]>{
  try{
    console.log("🔎 Get Current Sync Filters...");
    const stsCrendentials:AwsCredentialIdentity = {accessKeyId:AWS_ACCESS_KEY_ID, secretAccessKey:AWS_SECRET_ACCESS_KEY, sessionToken:AWS_SESSION_TOKEN};
    const ssoClientApi = new SsoApi(stsCrendentials, SSO_ENDPOINT);
    const currentgroups = await ssoClientApi.getSyncFilters();
    const missingGroups = adGroups.filter(groupname => !currentgroups.find((currentgroup => currentgroup === groupname)));
    if(missingGroups.length !== 0){
      console.log("␖ adding new Group Filters: ");
    }
    missingGroups.map(async (group) => {
      const postData: SyncFilterObject = {
        samaccountname:[group],
        associateddomain:[domainName]
      };
      console.log("   + " + JSON.stringify(group));
      await ssoClientApi.addSyncFilters(postData);
      return JSON.stringify(group);
    });
    if(missingGroups.length === 0){
      console.log("ℹ️ No new Group Filters to be added.");
      return [];
    } else {
      return missingGroups;
    }
  }
  catch{
    console.log("🚨 Error while adding SyncFilter");
    const errortext = "🚨 Error while adding SyncFilter";
    await ssoNotification([], DOMAINNAME, DOKU_WEBSITE, IDENTITIYSTOREID, errortext);
    process.exit(0);
  }
}

export class SsoApi {

  #endpoint: string;
  #signer: SignatureV4;

  constructor(stsCredentials:AwsCredentialIdentity, endpoint:string){
    this.#signer = new SignatureV4({
      credentials: stsCredentials,
      region: REGION,
      service: "identity-sync",
      sha256: Sha256
    });
    this.#endpoint = endpoint;
  }

  /**
       * Invoke the API with a POST command to synchronize the AD groups.
       * @param postData Include the domain name of the AD groups and the AD groups as a string array.
       * @returns
       * AWSINFRA-8792 Added leading slash & User-Agent and changed order of request parameters
       */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async addSyncFilters(postData:SyncFilterObject): Promise<AxiosResponse<any,any>>{
    const body = JSON.stringify({
      Attributes: JSON.stringify(postData),
      Effect: "INCLUDE",
      FilterType: "GROUP",
    });
    const req = new HttpRequest({
      method:"POST",
      path: "/v0/profiles/SynchronizationToActiveDirectoryAwsSso/filters",
      query: {
        Augmentation: "true",
      },
      hostname: this.#endpoint,
      body,
      headers: {
        host: this.#endpoint,
        "Content-Type": "application/json",
        "User-Agent": "sso-sync-group-lambda/1.0"
      },
    });
  
    const signed = await this.#signer.sign(req, {signingDate: new Date});
  
    const url = `https://${this.#endpoint}${req.path}?Augmentation=true`;
  
    return axios.post(url, body, {
      headers:signed.headers
    });
  }
  
  
  /**
       * Invoke the API with a GET command to get the SyncFilters.
       * @returns
       */
  async getSyncFilters(): Promise<string[]>{
    const groupsNames: string[] =[];
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let NextToken: string | null = "NOT_NULL";

    while (NextToken !== null) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      let query: {};
      if(NextToken === "NOT_NULL" || NextToken === null){
        NextToken = null;
        query ={
          Augmentation: "true",
          FilterType: "GROUP",
          MaxResults: "100"
        };
      } else{
        query ={
          Augmentation: "true",
          FilterType: "GROUP",
          MaxResults: "100",
          NextToken: NextToken,
        };
      }
      const req: HttpRequest = new HttpRequest({
        hostname: this.#endpoint,
        path: "v0/profiles/SynchronizationToActiveDirectoryAwsSso/filters",
        query,
        method:"GET",
        headers: {
          host: this.#endpoint,
          "Content-Type": "application/json",
          "User-Agent": "sso-sync-group-lambda/1.0"
        },
      });
      const signed = await this.#signer.sign(req, {signingDate: new Date});
      let url: string;
      if(NextToken !== null){
        url = `https://${this.#endpoint}${req.path}?Augmentation=true&FilterType=GROUP&MaxResults=100&NextToken=${NextToken}`;
      }
      else{
        url = `https://${this.#endpoint}${req.path}?Augmentation=true&FilterType=GROUP&MaxResults=100`;
      }
      try {
        const response = await axios.get<SyncFilters>(url,{
          headers:signed.headers
        });
        response.data.SyncFilters.forEach(filter => {
          const attributes = JSON.parse(filter.Attributes) as SyncFilterAttributes;
          groupsNames.push(attributes.samaccountname[0]["display-only"]);
        });
        if(response.data.NextToken){
          NextToken = response.data.NextToken;
        }
        else{
          NextToken = null;
        }
      } catch (error){
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(`🚨 Error while get SyncFilters ${error}`);
        throw error;
      }
    }
    return groupsNames;
  }

}