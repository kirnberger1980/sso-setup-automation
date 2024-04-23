import { Client, ClientOptions } from "ldapts";
import { getCaCertString } from "./ssm";

/**
 * Uses LDAP Query to get Groups for a specific LDAP Prefix
 * @param username Username for LDAP Auth
 * @param password Password for LDAP Auth
 * @param prefix Prefix for LDAP Query
 * @param base Base Path for LDAP Query
 * @param ldapspath URL for LDAP Connection
 * @return Object of Groups & err
 */

async function getGroupsforPrefix(domainname: string, username: string, password: string, prefix: string, base: string, ldapspath: string, port: number): Promise<[string[], string]>{
  let err = "";
  const groups: string[] = [];
  const options: ClientOptions = {
    url: ldapspath
  };
  if(port == 636){
    const ca = await getCaCertString();
    options.tlsOptions = {port:636,rejectUnauthorized: false, ca};
  }
  const client = new Client(options);
  try {
    console.log("🔑 Login to LDAP with user: "+username);
    await client.bind(`${username}@${domainname}`, password);

    console.log("🔎 Get groups from LDAP starting with: " +prefix);

    const { searchEntries } = await client.search(base, {
      filter: "(&(objectClass=group)(cn="+prefix+"*))",
      scope: "sub",
      attributes: ["dn"]
    });


    for(const entry of searchEntries){
      groups.push(entry.dn);
    }
  }
  catch(error){
    err = "🚨 Error while LDAP Query";
    console.log("🚨 Error while LDAP Query", error);
  }
  finally {
    console.log("👋🏻 Logoff from LDAP");
    await client.unbind();
  }
  return [groups, err];
}


/**
 * Uses LDAP Query to get Groups for a specific LDAP Prefixes
 * @param username Username for LDAP Auth
 * @param password Password for LDAP Auth
 * @param prefixes Prefixes for LDAP Query
 * @param base Base Path for LDAP Query
 * @param ldapspath URL for LDAP Connection
 * @return Object of Groups & err
 */
export async function getGroupsfromLdap(domainname: string, dn: string, password: string, base: string, prefixes: string[], ldapspath: string, port: number): Promise<[string[], string]>{
  const breakpoint = /CN=|,OU=/;
  const allgroups :string[] = [];
  let err = "";
  for(const prefix of prefixes){
    console.log("Check to be synced groups for prefix :" + prefix);
    let groups;
    [ groups, err] = await getGroupsforPrefix(domainname, dn, password, prefix,base, ldapspath, port);
    if(groups){
      for (const group of groups){
        //Cleanup Ldap Objects to just retrieve the name of an group
        // eg. CN=TESTGroup,OU=GROUPS,OU=ad,OU=COM => TESTGroup
        const splitted = group.split(breakpoint);
        allgroups.push(splitted[1]);
      }
    }
  }
  return [allgroups, err];
}

