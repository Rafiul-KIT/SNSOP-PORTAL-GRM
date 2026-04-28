export const environment = {
  production: true,
  env: 'qa',
  useHash: true,
  domain: 'https://qa-mis.southsudansafetynet.info',
  globalApi: 'https://qa-gwapp.southsudansafetynet.info/mis_server/',
  authBackend: 'https://qa-gwapp.southsudansafetynet.info/mis_auth/',
  portals: {
    master: 'https://qa-mis.southsudansafetynet.info/v2/',
    masterSettings: 'https://qa-mis.southsudansafetynet.info/v2/#/user-management/users',
      mNe: 'https://qa-mis.southsudansafetynet.info/v2/#/monitoring-evaluation/beneficiary-enrolment-summary',
    surveyCTO: 'https://qa-mis.southsudansafetynet.info/v2/#/cto-dashboard',
    beneficiary: 'https://qa-mis.southsudansafetynet.info/v2/beneficiary/',
    payment: 'https://qa-mis.southsudansafetynet.info/v2/payment',
    grm: 'https://qa-mis.southsudansafetynet.info/v2/grm',
    report: 'https://qa-mis.southsudansafetynet.info/v2/report',
    economicOpportunities: 'https://qa-mis.southsudansafetynet.info/v2/#/economic-opportunities/dashboard',
  },
  cookie_name:'mis_ta'
};