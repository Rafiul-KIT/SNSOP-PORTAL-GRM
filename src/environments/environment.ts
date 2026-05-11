export const environment = {
  production: true,
  env: 'prod',
  useHash: true,
  domain: 'https://mis.southsudansafetynet.info',
  globalApi: 'https://gwapp.southsudansafetynet.info/mis_server/',
  portals: {
    master: 'https://mis.southsudansafetynet.info/v2/',
    masterSettings: 'https://mis.southsudansafetynet.info/v2/#/user-management/users',
    surveyCTO: 'https://mis.southsudansafetynet.info/v2/#/cto-dashboard',
    underconstruction: 'https://mis.southsudansafetynet.info/v2/#/under-construction',
    beneficiary: 'https://mis.southsudansafetynet.info/v2/beneficiary/',
   mNe: 'https://mis.southsudansafetynet.info/v2/#/monitoring-evaluation/beneficiary-enrolment-summary',
     economicOpportunities: 'https://mis.southsudansafetynet.info/v2/#/economic-opportunities/dashboard',
    payment: 'https://mis.southsudansafetynet.info/v2/payment',
    grm: 'https://mis.southsudansafetynet.info/v2/grm',
    report: 'https://mis.southsudansafetynet.info/v2/#/home/metabase',
  },
  authBackend: 'https://gwapp.southsudansafetynet.info/mis_auth',
  cookie_name:'mis_ta'
};
