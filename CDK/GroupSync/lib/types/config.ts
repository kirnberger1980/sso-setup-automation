export interface Config {
  readonly general: {
    readonly produkt: string,
    readonly stage: string,
    readonly prefix: string,
    readonly s3_DOKUBUCKET: string,
    readonly WebhookUrlTeams: string,
    readonly DocuWebsite: string,
  },
  readonly SSO: {
    readonly ad_DomainName: string,
    readonly GroupFilterConfig: {GroupFilters: GroupFilters[]},
    }
}

interface GroupFilters {
  readonly Name: string,
  readonly Description: string,
}