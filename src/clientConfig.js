const COMPANY_NAME = 'OCSA Cleaning Inc.';
const COMPANY_LOCATION = 'Philadelphia, PA';
const CONFIDENTIAL_LABEL = 'Confidential Record';

const clientConfig = {
  company: {
    name: COMPANY_NAME,
    shortName: 'OCSA Cleaning',
    brandTag: 'OCSA',
    location: COMPANY_LOCATION,
    city: 'Philadelphia',
    state: 'PA',
    // What a stamp means by a date: the company's own day, wherever the computer is set.
    timeZone: 'America/New_York',
    confidentialLabel: CONFIDENTIAL_LABEL,
    footerLine: `${COMPANY_NAME} | ${COMPANY_LOCATION} | ${CONFIDENTIAL_LABEL}`,
  },
  brand: {
    navy: '#0A1628',
    gold: '#E7B017',
    navyDark: '#0F1D32',
    blueDeep: '#0D2C93',
    panelLight: '#15558F',
  },
  // The staff portal's address, the one every portal link the API sends is built on (STAFF_PORTAL_URL
  // as live sets it; Step 284). Help reads the portal's pictures of the screen from it.
  // REACT_APP_PORTAL_URL still overrides it.
  portal: {
    url: process.env.REACT_APP_PORTAL_URL || 'https://ocsa-staff-portal.vercel.app',
  },
  employee: {
    idPrefix: 'OCSA',
  },
  // The forms mailbox the PDF backfill sweeps, and the title prefix that marks this business's forms
  // on a Jotform account shared with sister businesses.
  forms: {
    mailbox: 'jotform@ocsaco.com',
    titlePrefix: 'OCSA Cleaning_',
  },
};

export default clientConfig;
